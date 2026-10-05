import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppState } from './types';
import { emptyState } from './session';

const KEY = 'tigrinya-words/state/v1';

export async function loadState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...emptyState(), ...JSON.parse(raw) } : emptyState();
  } catch {
    return emptyState();
  }
}

export async function saveState(state: AppState): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
}

export async function resetState(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
