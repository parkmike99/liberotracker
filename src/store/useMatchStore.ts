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
} from '../types';
import {
  ROTATION_NEXT,
  ZONE_ORDER,
  DEFAULT_RULE_SET,
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
  };
}

function emptyTeamSetState(): TeamSetState {
  return {
    rotationIndex: 0,
    court: emptyCourt(),
    liberoState: emptyLiberoState(),
    subsUsed: 0,
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
  /** Libero in: replace front-row player in zone with libero */
  liberoIn: (side: Side, zone: ZoneId, replacedPlayerNumber: number) => void;
  /** Libero out: put replaced player back */
  liberoOut: (side: Side) => void;
  /** Designate liberos for current set */
  setDesignatedLiberos: (side: Side, numbers: number[]) => void;
  /** Substitution: outgoing zone, incoming jersey number */
  substitution: (side: Side, outgoingZone: ZoneId, incomingNumber: number) => void;
  /** Record that libero is serving from this rotation (zone 1) */
  setLiberoServePosition: (side: Side) => void;
  /** Start next set (reset set state, push new SetState) */
  startNextSet: (liberosHome: number[], liberosAway: number[]) => void;
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
    const data = await loadJson<StoredMatches>(STORAGE_KEYS.MATCHES);
    const next: StoredMatches = { ...(data || {}), [m.id]: JSON.stringify(m) };
    await saveJson(STORAGE_KEYS.MATCHES, next);
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
    newSet.score[side] += 1;

    const servingTeam = newSet.servingTeam;
    const receivingTeam: Side = servingTeam === 'home' ? 'away' : 'home';

    if (side === servingTeam) {
      // Serving team won: no rotation
    } else {
      // Side-out: receiving team (who won the point) rotates
      const teamState = newSet[side];
      teamState.rotationIndex = ((teamState.rotationIndex + 1) % 6) as 0 | 1 | 2 | 3 | 4 | 5;
      rotateCourtForTeam(newSet, side);
      // Winner gets serve
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

  liberoIn: (side, zone, replacedPlayerNumber) => {
    const { match } = get();
    if (!match) return;
    const currentSet = match.sets[match.currentSetIndex];
    if (!currentSet) return;
    const newSet = cloneSetState(currentSet);
    const lib = newSet[side].liberoState;
    lib.onCourtLiberoNumber = lib.designatedLiberos[0] ?? null; // simplify: first designated
    lib.replacedPlayerNumber = replacedPlayerNumber;
    const court = [...newSet[side].court];
    const idx = zone - 1;
    court[idx] = lib.onCourtLiberoNumber;
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
  },

  liberoOut: (side) => {
    const { match } = get();
    if (!match) return;
    const currentSet = match.sets[match.currentSetIndex];
    if (!currentSet) return;
    const newSet = cloneSetState(currentSet);
    const lib = newSet[side].liberoState;
    const replaced = lib.replacedPlayerNumber;
    const liberoNum = lib.onCourtLiberoNumber;
    lib.onCourtLiberoNumber = null;
    lib.replacedPlayerNumber = null;
    if (replaced != null && liberoNum != null) {
      const court = [...newSet[side].court];
      const idx = court.findIndex((n) => n === liberoNum);
      if (idx >= 0) court[idx] = replaced;
      newSet[side].court = [court[0], court[1], court[2], court[3], court[4], court[5]];
    }
    newSet.eventLog = [...newSet.eventLog, {
      id: uuidv4(),
      type: 'libero_out',
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
    if (!match) return;
    const currentSet = match.sets[match.currentSetIndex];
    if (!currentSet) return;
    const newSet = cloneSetState(currentSet);
    const team = newSet[side];
    team.subsUsed += 1;
    const court = [...team.court];
    court[outgoingZone - 1] = incomingNumber;
    team.court = [court[0], court[1], court[2], court[3], court[4], court[5]];
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

  startNextSet: (liberosHome, liberosAway) => {
    const { match } = get();
    if (!match) return;
    const newSet = emptySetState();
    newSet.home.liberoState.designatedLiberos = liberosHome;
    newSet.away.liberoState.designatedLiberos = liberosAway;
    set({
      match: {
        ...match,
        currentSetIndex: match.currentSetIndex + 1,
        sets: [...match.sets, newSet],
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

/** Rotate court: zone 2→1, 3→2, 4→3, 5→4, 6→5, 1→6 */
function rotateCourtForTeam(setState: SetState, side: Side): void {
  const team = setState[side];
  const court = team.court;
  const next: CourtRow = [court[1], court[2], court[3], court[4], court[5], court[0]];
  team.court = next;
}
