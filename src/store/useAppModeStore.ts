/**
 * App mode: Guided (default) vs Coach.
 * Guided blocks illegal actions; Coach allows all but logs violations.
 */

import { create } from 'zustand';
import type { AppMode } from '../types';
import { loadJson, saveJson } from '../storage';
import { STORAGE_KEYS } from '../storage/types';

interface AppModeState {
  mode: AppMode;
  hydrated: boolean;
  load: () => Promise<void>;
  setMode: (mode: AppMode) => void;
}

export const useAppModeStore = create<AppModeState>((set, get) => ({
  mode: 'guided',
  hydrated: false,

  load: async () => {
    const stored = await loadJson<AppMode>(STORAGE_KEYS.APP_MODE);
    set({ mode: stored ?? 'guided', hydrated: true });
  },

  setMode: (mode) => {
    set({ mode });
    saveJson(STORAGE_KEYS.APP_MODE, mode);
  },
}));
