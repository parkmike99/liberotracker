/**
 * Storage abstraction: AsyncStorage on native, localStorage on web.
 * Can be extended later for IndexedDB or backend sync.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Web: use localStorage. React Native: use AsyncStorage.
const storage = Platform.OS === 'web'
  ? (typeof window !== 'undefined' ? window.localStorage : (null as unknown as Storage))
  : null;

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
}

class WebStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    if (!storage) return null;
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (!storage) return;
    storage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    if (!storage) return;
    storage.removeItem(key);
  }

  async getAllKeys(): Promise<string[]> {
    if (!storage) return [];
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k) keys.push(k);
    }
    return keys;
  }
}

class NativeStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }

  async getAllKeys(): Promise<string[]> {
    return AsyncStorage.getAllKeys();
  }
}

export const persist: StorageAdapter =
  Platform.OS === 'web' ? new WebStorageAdapter() : new NativeStorageAdapter();

export async function loadJson<T>(key: string): Promise<T | null> {
  const raw = await persist.getItem(key);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function saveJson<T>(key: string, value: T): Promise<void> {
  await persist.setItem(key, JSON.stringify(value));
}
