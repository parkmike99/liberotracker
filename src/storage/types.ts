/**
 * Storage keys and payload types for persistence
 */

export const STORAGE_KEYS = {
  TEAMS: 'liberotracker_teams',
  MATCHES: 'liberotracker_matches',
  MATCH_HISTORY_IDS: 'liberotracker_match_history_ids',
  APP_MODE: 'liberotracker_app_mode',
} as const;

export interface StoredTeams {
  [id: string]: string; // JSON string of TeamProfile
}

export interface StoredMatches {
  [id: string]: string; // JSON string of Match
}

export interface StoredMatchHistoryIds {
  ids: string[];
}
