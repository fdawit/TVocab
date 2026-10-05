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

// The sound lesson shows once on first launch (Step 9a). Kept outside AppState,
// so the saved progress keeps the same shape.
const SOUNDS_KEY = 'tigrinya-words/sounds-seen/v1';

export async function soundsSeen(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(SOUNDS_KEY)) === '1';
  } catch {
    return true;
  }
}

export async function markSoundsSeen(): Promise<void> {
  await AsyncStorage.setItem(SOUNDS_KEY, '1');
}
