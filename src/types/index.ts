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

/** Rotation clockwise (net at top): 1→6, 6→5, 5→4, 4→3, 3→2, 2→1 */
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
  /** Back-row player the libero replaced (when libero is in) */
  replacedPlayerNumber: number | null;
  /** Rotation position (zone) from which libero is allowed to serve this set; null = not yet set */
  liberoServePosition: number | null;
  /** USAV: libero may serve in only one rotation per set. Replaced-player number when they first served. */
  liberoServeKey: number | null;
}

/** Volleyball rule: once A is subbed for B (or vice versa), only that pair can swap for that position the rest of the set. */
export interface SubstitutionPair {
  a: number;
  b: number;
}

/** Palette for pair outline colors (court and bench). Index = pair index in substitutionPairs. */
export const SUB_PAIR_OUTLINE_COLORS: readonly string[] = [
  '#9b59b6', // purple
  '#e67e22', // orange
  '#27ae60', // green
  '#3498db', // blue
  '#e74c3c', // red
  '#f1c40f', // yellow
  '#1abc9c', // teal
  '#95a5a6', // gray
];

export interface TeamSetState {
  /** Rotation index 0–5; determines which 6 players are on court and where */
  rotationIndex: number;
  /** Zone 1–6 → player jersey number */
  court: CourtRow;
  liberoState: LiberoState;
  subsUsed: number;
  /** Substitution pairs this set: only these two jersey numbers can swap for that "position". */
  substitutionPairs: SubstitutionPair[];
}

/** Get the other player in the pair for this jersey number, or null if not in a pair. */
export function getPairMate(team: TeamSetState, jerseyNumber: number): number | null {
  const pairs = team.substitutionPairs ?? [];
  for (const pair of pairs) {
    if (pair.a === jerseyNumber) return pair.b;
    if (pair.b === jerseyNumber) return pair.a;
  }
  return null;
}

/** Get pair index (for outline color). Returns -1 if not in a pair. */
export function getPairIndex(team: TeamSetState, jerseyNumber: number): number {
  const pairs = team.substitutionPairs ?? [];
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    if (pair.a === jerseyNumber || pair.b === jerseyNumber) return i;
  }
  return -1;
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
