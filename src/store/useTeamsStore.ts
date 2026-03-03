/**
 * Zustand store: Teams CRUD + persistence
 */

import { create } from 'zustand';
import type { TeamProfile } from '../types';
import { loadJson, saveJson } from '../storage';
import { STORAGE_KEYS, type StoredTeams } from '../storage/types';
import { v4 as uuidv4 } from 'uuid';

interface TeamsState {
  teams: Record<string, TeamProfile>;
  hydrated: boolean;
  load: () => Promise<void>;
  save: () => Promise<void>;
  addTeam: (team: Omit<TeamProfile, 'id'>) => TeamProfile;
  updateTeam: (id: string, patch: Partial<TeamProfile>) => void;
  deleteTeam: (id: string) => void;
  getTeam: (id: string) => TeamProfile | undefined;
  getTeamsList: () => TeamProfile[];
}

export const useTeamsStore = create<TeamsState>((set, get) => ({
  teams: {},
  hydrated: false,

  load: async () => {
    const data = await loadJson<StoredTeams>(STORAGE_KEYS.TEAMS);
    const teams: Record<string, TeamProfile> = {};
    if (data && typeof data === 'object') {
      for (const [id, json] of Object.entries(data)) {
        try {
          teams[id] = JSON.parse(json) as TeamProfile;
        } catch {
          // skip invalid
        }
      }
    }
    set({ teams, hydrated: true });
  },

  save: async () => {
    const { teams } = get();
    const stored: StoredTeams = {};
    for (const [id, team] of Object.entries(teams)) {
      stored[id] = JSON.stringify(team);
    }
    await saveJson(STORAGE_KEYS.TEAMS, stored);
  },

  addTeam: (team) => {
    const id = uuidv4();
    const full: TeamProfile = { ...team, id };
    set((s) => ({
      teams: { ...s.teams, [id]: full },
    }));
    get().save();
    return full;
  },

  updateTeam: (id, patch) => {
    set((s) => {
      const existing = s.teams[id];
      if (!existing) return s;
      return {
        teams: { ...s.teams, [id]: { ...existing, ...patch } },
      };
    });
    get().save();
  },

  deleteTeam: (id) => {
    set((s) => {
      const next = { ...s.teams };
      delete next[id];
      return { teams: next };
    });
    get().save();
  },

  getTeam: (id) => get().teams[id],
  getTeamsList: () => Object.values(get().teams),
}));
