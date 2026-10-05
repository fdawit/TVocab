import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import type { AppState } from './types';
import { loadState, saveState } from './storage';

/** Load the saved state whenever a screen comes into focus, so every screen
 *  sees changes made on another one. `update` saves right away. */
export function useAppState() {
  const [state, setState] = useState<AppState | null>(null);
  useFocusEffect(useCallback(() => {
    let live = true;
    loadState().then(s => { if (live) setState(s); });
    return () => { live = false; };
  }, []));
  const update = useCallback(async (next: AppState) => {
    setState(next);
    await saveState(next);
  }, []);
  return { state, update };
}
