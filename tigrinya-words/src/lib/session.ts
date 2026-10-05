import type { AppState } from './types';

// The rest of this file (session builder) comes in Step 7.

export function emptyState(): AppState {
  return {
    version: 1, progress: {}, completedUnits: [], homeDone: [],
    streak: { count: 0, lastDay: '' },
    settings: { newPerDay: 5, romanization: 'auto' },
  };
}
