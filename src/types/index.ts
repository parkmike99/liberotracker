/**
 * LIBEROTRACKER – Core TypeScript types
 * USAV-style travel volleyball scorekeeping
 */

// ============ TEAM ============

export interface TeamProfile {
  id: string;
  name: string;
  teamColor: string;
  numberColor: string;
  liberoColor: string;
  rosterNumbers: number[];
}

// ============ RULES ============

export type ZoneId = 1 | 2 | 3 | 4 | 5 | 6;

/** Court layout: front row 4-3-2, back row 5-6-1 */
export const ZONE_ORDER: ZoneId[] = [1, 2, 3, 4, 5, 6];

/** Rotation: 1→6→5→4→3→2→1 */
export const ROTATION_NEXT: Record<ZoneId, ZoneId> = {
  1: 6, 6: 5, 5: 4, 4: 3, 3: 2, 2: 1,
};

export interface RuleSet {
  /** e.g. "USAV Club" */
  name: string;
  substitutionsPerSet: number;
  /** 0, 1, or 2 liberos per set */
  liberosPerSet: number;
  /** Libero may serve in only one rotation position per set */
  liberoServeOnePosition: boolean;
  /** Set lengths: [25, 25, 15] for best of 3 */
  setTargetScores: number[];
  /** Win by 2 */
  winBy: number;
}

export const DEFAULT_RULE_SET: RuleSet = {
  name: 'USAV Club',
  substitutionsPerSet: 15,
  liberosPerSet: 2,
  liberoServeOnePosition: true,
  setTargetScores: [25, 25, 15],
  winBy: 2,
};

// ============ COURT STATE ============

export type Side = 'home' | 'away';

/** Which zone (1-6) each position holds; index 0 = zone 1, etc. */
export type CourtRow = [number | null, number | null, number | null, number | null, number | null, number | null];

export interface LiberoState {
  /** Jersey numbers designated as libero for this set */
  designatedLiberos: number[];
  /** Currently on court (back row), or null */
  onCourtLiberoNumber: number | null;
  /** Front-row player the libero replaced (when libero is in) */
  replacedPlayerNumber: number | null;
  /** Rotation position (zone) from which libero is allowed to serve this set; null = not yet set */
  liberoServePosition: number | null;
}

export interface TeamSetState {
  /** Rotation index 0–5; determines which 6 players are on court and where */
  rotationIndex: number;
  /** Zone 1–6 → player jersey number */
  court: CourtRow;
  liberoState: LiberoState;
  subsUsed: number;
}

export interface SetState {
  score: { home: number; away: number };
  servingTeam: Side | null;
  home: TeamSetState;
  away: TeamSetState;
  /** Event log for undo/redo */
  eventLog: MatchEvent[];
}

// ============ EVENTS (for undo/redo) ============

export type MatchEventType =
  | 'point'
  | 'libero_in'
  | 'libero_out'
  | 'substitution'
  | 'set_serving_team'
  | 'set_rotation'
  | 'set_court';

export interface MatchEvent {
  id: string;
  type: MatchEventType;
  at: number; // timestamp
  /** Snapshot of set state before this event (for undo) */
  stateBefore: SetState;
  payload?: Record<string, unknown>;
}

// ============ MATCH ============

export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  ruleSet: RuleSet;
  /** Current set index 0-based */
  currentSetIndex: number;
  sets: SetState[];
  /** Set winner per completed set: home | away */
  setWinners: (Side | null)[];
  createdAt: number;
  updatedAt: number;
}

// ============ APP MODE ============

export type AppMode = 'guided' | 'coach';

export interface Violation {
  id: string;
  code: string;
  message: string;
  at: number;
  /** If user overrides in coach mode */
  overridden?: boolean;
}
