import type { AppState, Word } from './types';
import { addDays, isMastered } from './scheduler';

export function levelStats(words: Word[], state: AppState, level: 1 | 2 | 3) {
  const inLevel = words.filter(w => w.active && w.level === level);
  return {
    total: inLevel.length,
    started: inLevel.filter(w => state.progress[w.id]).length,
    mastered: inLevel.filter(w => isMastered(state.progress[w.id], w)).length,
  };
}

export function wordsThisWeek(words: Word[], state: AppState, today: string): Word[] {
  const since = addDays(today, -6);
  return words.filter(w => (state.progress[w.id]?.firstSeen ?? '') >= since);
}

export function needsPractice(words: Word[], state: AppState, n = 10): Word[] {
  return words
    .filter(w => (state.progress[w.id]?.wrong ?? 0) > 0)
    .sort((a, b) => state.progress[b.id].wrong - state.progress[a.id].wrong)
    .slice(0, n);
}

export function pendingHomeCards(state: AppState): number[] {
  return state.completedUnits.filter(id => !state.homeDone.includes(id));
}
