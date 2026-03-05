/**
 * Zustand store: Match state, event log, undo/redo, derived selectors.
 * Single active match; persistence by id.
 */

import { create } from 'zustand';
import type {
  Match,
  SetState,
  Side,
  ZoneId,
  TeamSetState,
  LiberoState,
  CourtRow,
  MatchEvent,
  RuleSet,
  SubstitutionPair,
} from '../types';
import {
  ROTATION_NEXT,
  ZONE_ORDER,
  DEFAULT_RULE_SET,
  getPairMate,
} from '../types';
import { loadJson, saveJson } from '../storage';
import { STORAGE_KEYS } from '../storage/types';
import type { StoredMatches, StoredMatchHistoryIds } from '../storage/types';
import { v4 as uuidv4 } from 'uuid';

// ============ HELPERS ============

function emptyCourt(): CourtRow {
  return [null, null, null, null, null, null];
}

function emptyLiberoState(): LiberoState {
  return {
    designatedLiberos: [],
    onCourtLiberoNumber: null,
    replacedPlayerNumber: null,
    liberoServePosition: null,
    liberoServeKey: null,
  };
}

function emptyTeamSetState(): TeamSetState {
  return {
    rotationIndex: 0,
    court: emptyCourt(),
    liberoState: emptyLiberoState(),
    subsUsed: 0,
    substitutionPairs: [],
  };
}

function emptySetState(): SetState {
  return {
    score: { home: 0, away: 0 },
    servingTeam: null,
    home: emptyTeamSetState(),
    away: emptyTeamSetState(),
    eventLog: [],
  };
}

function cloneSetState(s: SetState): SetState {
  return JSON.parse(JSON.stringify(s));
}

// ============ STORE ============

interface MatchState {
  match: Match | null;
  hydrated: boolean;
  load: () => Promise<void>;
  saveMatch: (m: Match) => Promise<void>;
  setMatch: (m: Match | null) => void;
  getCurrentSet: () => SetState | null;
  /** Award point to side; applies rotation on side-out */
  point: (side: Side) => void;
  /** Undo last event in current set */
  undo: () => void;
  /** Set serving team (e.g. at start of set) */
  setServingTeam: (side: Side) => void;
  /** Set rotation and court for a team (e.g. initial lineup) */
  setRotationAndCourt: (side: Side, rotationIndex: number, court: CourtRow) => void;
  /** Libero in: replace back-row player in zone with libero. liberoNumber = which designated libero (e.g. from bench drag); omit to use first designated. */
  liberoIn: (side: Side, zone: ZoneId, replacedPlayerNumber: number, liberoNumber?: number) => { success: boolean; violation?: string };
  /** Libero out: put replaced player back, or optional incomingNumber = pair-mate of replaced (counts as sub). */
  liberoOut: (side: Side, options?: { incomingNumber?: number }) => { success: boolean; violation?: string };
  /** Designate liberos for current set */
  setDesignatedLiberos: (side: Side, numbers: number[]) => void;
  /** Substitution: outgoing zone, incoming jersey number. Returns violation if pair rules broken. */
  substitution: (side: Side, outgoingZone: ZoneId, incomingNumber: number) => { success: boolean; violation?: string };
  /** Record that libero is serving from this rotation (zone 1) */
  setLiberoServePosition: (side: Side) => void;
  /** Start next set: copy court from current set, set liberos, loser serves first. */
  startNextSet: (liberosHome: number[], liberosAway: number[], setWinner: Side) => void;
  /** Mark current set as won by side */
  completeSet: (winner: Side) => void;
  /** Get match history ids (recent first) */
  getMatchHistoryIds: () => string[];
  addMatchToHistory: (id: string) => Promise<void>;
  loadMatch: (id: string) => Promise<Match | null>;
}

export const useMatchStore = create<MatchState>((set, get) => ({
  match: null,
  hydrated: false,

  load: async () => {
    set({ hydrated: true });
  },

  saveMatch: async (m) => {
    // Truncate event log per set to avoid localStorage quota (each event has full stateBefore snapshot)
    const MAX_PERSISTED_EVENTS = 15;
    const slim = (maxEvents: number): Match => ({
      ...m,
      sets: m.sets.map((s) => ({
        ...s,
        eventLog: s.eventLog.length > maxEvents ? s.eventLog.slice(-maxEvents) : s.eventLog,
      })),
    });
    const data = await loadJson<StoredMatches>(STORAGE_KEYS.MATCHES);
    const next: StoredMatches = { ...(data || {}), [m.id]: JSON.stringify(slim(MAX_PERSISTED_EVENTS)) };
    try {
      await saveJson(STORAGE_KEYS.MATCHES, next);
    } catch (err) {
      // QuotaExceededError on web: save without event history so match state (score, court) is not lost
      try {
        const minimal: StoredMatches = { [m.id]: JSON.stringify(slim(0)) };
        await saveJson(STORAGE_KEYS.MATCHES, minimal);
      } catch {
        // ignore
      }
    }
  },

  setMatch: (m) => set({ match: m }),

  getCurrentSet: () => {
    const { match } = get();
    if (!match || !match.sets.length) return null;
    return match.sets[match.currentSetIndex] ?? null;
  },

  point: (side) => {
    const { match } = get();
    if (!match) return;
    const currentSet = match.sets[match.currentSetIndex];
    if (!currentSet) return;

    const newSet = cloneSetState(currentSet);
    const servingTeam = newSet.servingTeam;

    if (side === servingTeam) {
      // Serving team won the rally: they score; no rotation
      newSet.score[side] += 1;
    } else {
      // Receiving team won (side-out): no point; they rotate and get the serve
      const teamState = newSet[side];
      teamState.rotationIndex = ((teamState.rotationIndex + 1) % 6) as 0 | 1 | 2 | 3 | 4 | 5;
      rotateCourtForTeam(newSet, side);
      newSet.servingTeam = side;
    }

    const event: MatchEvent = {
      id: uuidv4(),
      type: 'point',
      at: Date.now(),
      stateBefore: cloneSetState(currentSet),
      payload: { side },
    };
    newSet.eventLog = [...newSet.eventLog, event];
    set({
      match: {
        ...match,
        sets: [...match.sets.slice(0, match.currentSetIndex), newSet, ...match.sets.slice(match.currentSetIndex + 1)],
        updatedAt: Date.now(),
      },
    });
  },

  undo: () => {
    const { match } = get();
    if (!match) return;
    const currentSet = match.sets[match.currentSetIndex];
    if (!currentSet || !currentSet.eventLog.length) return;

    const lastEvent = currentSet.eventLog[currentSet.eventLog.length - 1];
    const restored = cloneSetState(lastEvent.stateBefore);
    set({
      match: {
        ...match,
        sets: [...match.sets.slice(0, match.currentSetIndex), restored, ...match.sets.slice(match.currentSetIndex + 1)],
        updatedAt: Date.now(),
      },
    });
  },

  setServingTeam: (side) => {
    const { match } = get();
    if (!match) return;
    const currentSet = match.sets[match.currentSetIndex];
    if (!currentSet) return;
    const newSet = cloneSetState(currentSet);
    newSet.servingTeam = side;
    newSet.eventLog = [...newSet.eventLog, {
      id: uuidv4(),
      type: 'set_serving_team',
      at: Date.now(),
      stateBefore: currentSet,
      payload: { side },
    }];
    set({
      match: {
        ...match,
        sets: [...match.sets.slice(0, match.currentSetIndex), newSet, ...match.sets.slice(match.currentSetIndex + 1)],
        updatedAt: Date.now(),
      },
    });
  },

  setRotationAndCourt: (side, rotationIndex, court) => {
    const { match } = get();
    if (!match) return;
    const currentSet = match.sets[match.currentSetIndex];
    if (!currentSet) return;
    const newSet = cloneSetState(currentSet);
    newSet[side].rotationIndex = rotationIndex;
    newSet[side].court = [court[0], court[1], court[2], court[3], court[4], court[5]];
    newSet.eventLog = [...newSet.eventLog, {
      id: uuidv4(),
      type: 'set_rotation',
      at: Date.now(),
      stateBefore: currentSet,
      payload: { side, rotationIndex, court },
    }];
    set({
      match: {
        ...match,
        sets: [...match.sets.slice(0, match.currentSetIndex), newSet, ...match.sets.slice(match.currentSetIndex + 1)],
        updatedAt: Date.now(),
      },
    });
  },

  liberoIn: (side, zone, replacedPlayerNumber, liberoNumber) => {
    const { match } = get();
    if (!match) return { success: false, violation: 'No active match.' };
    const currentSet = match.sets[match.currentSetIndex];
    if (!currentSet) return { success: false, violation: 'No current set.' };
    const lib = currentSet[side].liberoState;
    const backRowZones: ZoneId[] = [1, 6, 5];
    if (!backRowZones.includes(zone)) {
      return { success: false, violation: 'Libero can only enter back row (Zones 1, 6, 5).' };
    }
    if (lib.onCourtLiberoNumber != null) {
      return { success: false, violation: `Libero #${lib.onCourtLiberoNumber} already on court. Use Libero OUT first.` };
    }
    if (!lib.designatedLiberos.length) {
      return { success: false, violation: 'No libero designated for this set.' };
    }
    const whichLibero = liberoNumber != null
      ? (lib.designatedLiberos.includes(liberoNumber) ? liberoNumber : lib.designatedLiberos[0] ?? null)
      : (lib.designatedLiberos[0] ?? null);
    if (whichLibero == null) {
      return { success: false, violation: 'No libero designated for this set.' };
    }
    // USAV: libero may serve in only one rotation per set. Zone 1 = server.
    if (zone === 1 && currentSet.servingTeam === side) {
      if (lib.liberoServeKey != null && lib.liberoServeKey !== replacedPlayerNumber) {
        return {
          success: false,
          violation: 'Libero can only serve in one rotation position per set. This would be a second position.',
        };
      }
    }
    const newSet = cloneSetState(currentSet);
    const newLib = newSet[side].liberoState;
    newLib.onCourtLiberoNumber = whichLibero;
    newLib.replacedPlayerNumber = replacedPlayerNumber;
    if (zone === 1 && newSet.servingTeam === side && newLib.liberoServeKey == null) {
      newLib.liberoServeKey = replacedPlayerNumber;
    }
    const court = [...newSet[side].court];
    const idx = zone - 1;
    court[idx] = newLib.onCourtLiberoNumber;
    newSet[side].court = [court[0], court[1], court[2], court[3], court[4], court[5]];
    newSet.eventLog = [...newSet.eventLog, {
      id: uuidv4(),
      type: 'libero_in',
      at: Date.now(),
      stateBefore: currentSet,
      payload: { side, zone, replacedPlayerNumber },
    }];
    set({
      match: {
        ...match,
        sets: [...match.sets.slice(0, match.currentSetIndex), newSet, ...match.sets.slice(match.currentSetIndex + 1)],
        updatedAt: Date.now(),
      },
    });
    return { success: true };
  },

  liberoOut: (side, options) => {
    const { match } = get();
    if (!match) return { success: false, violation: 'No active match.' };
    const currentSet = match.sets[match.currentSetIndex];
    if (!currentSet) return { success: false, violation: 'No current set.' };
    const team = currentSet[side];
    const lib = team.liberoState;
    const replaced = lib.replacedPlayerNumber;
    const liberoNum = lib.onCourtLiberoNumber;
    if (replaced == null || liberoNum == null) {
      return { success: false, violation: 'No libero on court to remove.' };
    }
    const incomingNumber = options?.incomingNumber;
    let whoEnters: number = replaced;
    let countSub = false;
    if (incomingNumber != null && incomingNumber !== replaced) {
      const pairMate = getPairMate(team, replaced);
      if (pairMate !== incomingNumber) {
        return {
          success: false,
          violation: `Only the replaced player #${replaced} or their paired player #${pairMate ?? '?'} can enter.`,
        };
      }
      whoEnters = incomingNumber;
      countSub = true;
      const maxSubs = match.ruleSet.substitutionsPerSet ?? 15;
      if ((team.subsUsed ?? 0) >= maxSubs) {
        return { success: false, violation: `No substitutions remaining this set (${maxSubs} max).` };
      }
    }
    const newSet = cloneSetState(currentSet);
    const newLib = newSet[side].liberoState;
    newLib.onCourtLiberoNumber = null;
    newLib.replacedPlayerNumber = null;
    const court = [...newSet[side].court];
    const idx = court.findIndex((n) => n === liberoNum);
    if (idx >= 0) court[idx] = whoEnters;
    newSet[side].court = [court[0], court[1], court[2], court[3], court[4], court[5]];
    if (countSub) {
      newSet[side].subsUsed = (newSet[side].subsUsed ?? 0) + 1;
      const pairs = newSet[side].substitutionPairs ?? [];
      const hasPair = pairs.some((p) => (p.a === replaced && p.b === whoEnters) || (p.a === whoEnters && p.b === replaced));
      if (!hasPair) {
        newSet[side].substitutionPairs = [...pairs, { a: replaced, b: whoEnters } as SubstitutionPair];
      }
    }
    newSet.eventLog = [...newSet.eventLog, {
      id: uuidv4(),
      type: 'libero_out',
      at: Date.now(),
      stateBefore: currentSet,
      payload: { side, incomingNumber: whoEnters, countedAsSub: countSub },
    }];
    set({
      match: {
        ...match,
        sets: [...match.sets.slice(0, match.currentSetIndex), newSet, ...match.sets.slice(match.currentSetIndex + 1)],
        updatedAt: Date.now(),
      },
    });
    return { success: true };
  },

  setDesignatedLiberos: (side, numbers) => {
    const { match } = get();
    if (!match) return;
    const currentSet = match.sets[match.currentSetIndex];
    if (!currentSet) return;
    const newSet = cloneSetState(currentSet);
    newSet[side].liberoState.designatedLiberos = numbers;
    set({
      match: {
        ...match,
        sets: [...match.sets.slice(0, match.currentSetIndex), newSet, ...match.sets.slice(match.currentSetIndex + 1)],
        updatedAt: Date.now(),
      },
    });
  },

  substitution: (side, outgoingZone, incomingNumber) => {
    const { match } = get();
    if (!match) return { success: false, violation: 'No active match.' };
    const currentSet = match.sets[match.currentSetIndex];
    if (!currentSet) return { success: false, violation: 'No current set.' };
    const team = currentSet[side];
    const outgoingPlayer = team.court[outgoingZone - 1];
    if (outgoingPlayer == null) {
      return { success: false, violation: 'No player in that zone to substitute.' };
    }
    if (outgoingPlayer === incomingNumber) {
      return { success: false, violation: 'Same player cannot substitute for themselves.' };
    }
    // Liberos are not tied to substitution pairs; they use libero replacement flow.
    if (team.liberoState.designatedLiberos.includes(outgoingPlayer)) {
      return { success: false, violation: 'Use Libero In/Out for libero, not Sub.' };
    }
    if (team.liberoState.designatedLiberos.includes(incomingNumber)) {
      return { success: false, violation: 'Use Libero In/Out for libero, not Sub.' };
    }
    const mateOut = getPairMate(team, outgoingPlayer);
    const mateIn = getPairMate(team, incomingNumber);
    if (mateOut != null && mateOut !== incomingNumber) {
      return {
        success: false,
        violation: `#${outgoingPlayer} can only be replaced by their paired player #${mateOut}. Use #${mateOut} to sub in.`,
      };
    }
    if (mateIn != null && mateIn !== outgoingPlayer) {
      return {
        success: false,
        violation: `#${incomingNumber} is paired with #${mateIn}. They can only sub in for #${mateIn} (who is on court).`,
      };
    }
    const newSet = cloneSetState(currentSet);
    const newTeam = newSet[side];
    newTeam.subsUsed += 1;
    const court = [...newTeam.court];
    court[outgoingZone - 1] = incomingNumber;
    newTeam.court = [court[0], court[1], court[2], court[3], court[4], court[5]];
    if (mateOut == null && mateIn == null) {
      const pairs = newTeam.substitutionPairs ?? [];
      newTeam.substitutionPairs = [...pairs, { a: outgoingPlayer, b: incomingNumber } as SubstitutionPair];
    }
    newSet.eventLog = [...newSet.eventLog, {
      id: uuidv4(),
      type: 'substitution',
      at: Date.now(),
      stateBefore: currentSet,
      payload: { side, outgoingZone, incomingNumber },
    }];
    set({
      match: {
        ...match,
        sets: [...match.sets.slice(0, match.currentSetIndex), newSet, ...match.sets.slice(match.currentSetIndex + 1)],
        updatedAt: Date.now(),
      },
    });
    return { success: true };
  },

  setLiberoServePosition: (side) => {
    const { match } = get();
    if (!match) return;
    const currentSet = match.sets[match.currentSetIndex];
    if (!currentSet) return;
    const newSet = cloneSetState(currentSet);
    newSet[side].liberoState.liberoServePosition = 1; // zone 1 = serve position
    set({
      match: {
        ...match,
        sets: [...match.sets.slice(0, match.currentSetIndex), newSet, ...match.sets.slice(match.currentSetIndex + 1)],
        updatedAt: Date.now(),
      },
    });
  },

  startNextSet: (liberosHome, liberosAway, setWinner) => {
    const { match } = get();
    if (!match) return;
    const currentSet = match.sets[match.currentSetIndex];
    const newSet = emptySetState();
    newSet.home.liberoState.designatedLiberos = liberosHome;
    newSet.away.liberoState.designatedLiberos = liberosAway;
    // Copy court and rotation from ended set; loser serves first next set (USAV common)
    if (currentSet) {
      newSet.home.court = [...currentSet.home.court];
      newSet.away.court = [...currentSet.away.court];
      newSet.home.rotationIndex = currentSet.home.rotationIndex;
      newSet.away.rotationIndex = currentSet.away.rotationIndex;
    }
    newSet.servingTeam = setWinner === 'home' ? 'away' : 'home';
    set({
      match: {
        ...match,
        currentSetIndex: match.currentSetIndex + 1,
        sets: [...match.sets, newSet],
        setWinners: [...match.setWinners],
        updatedAt: Date.now(),
      },
    });
  },

  completeSet: (winner) => {
    const { match } = get();
    if (!match) return;
    const setWinners = [...match.setWinners];
    setWinners[match.currentSetIndex] = winner;
    set({
      match: {
        ...match,
        setWinners,
        updatedAt: Date.now(),
      },
    });
  },

  getMatchHistoryIds: () => {
    // Sync read not available here; use loadJson in a selector or load on app start
    return [];
  },

  addMatchToHistory: async (id) => {
    const raw = await loadJson<StoredMatchHistoryIds>(STORAGE_KEYS.MATCH_HISTORY_IDS);
    const ids = raw?.ids ?? [];
    const next = [id, ...ids.filter((x) => x !== id)].slice(0, 50);
    await saveJson(STORAGE_KEYS.MATCH_HISTORY_IDS, { ids: next });
  },

  loadMatch: async (id) => {
    const data = await loadJson<StoredMatches>(STORAGE_KEYS.MATCHES);
    if (!data || !data[id]) return null;
    try {
      return JSON.parse(data[id]) as Match;
    } catch {
      return null;
    }
  },
}));

/** Rotate court clockwise (net at top): 1→6, 6→5, 5→4, 4→3, 3→2, 2→1 */
function rotateCourtForTeam(setState: SetState, side: Side): void {
  const team = setState[side];
  const court = team.court;
  const next: CourtRow = [court[1], court[2], court[3], court[4], court[5], court[0]];
  team.court = next;
}
