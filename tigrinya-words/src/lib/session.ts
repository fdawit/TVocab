import type { AppState, Exercise, Unit, Word } from './types';
import { addDays, grade, kindForBox, newProgress } from './scheduler';
import { buildExercise, shuffle, type Rng } from './exercises';

export const MAX_REVIEWS = 30;            // reviews per session, at most
export const PAUSE_NEW_AT_BACKLOG = 45;   // no new words while this many reviews are waiting
export const RETRY_GAP = 3;               // a missed word comes back this many steps later

export function emptyState(): AppState {
  return {
    version: 1, progress: {}, completedUnits: [], homeDone: [],
    streak: { count: 0, lastDay: '' },
    settings: { newPerDay: 5, romanization: 'auto' },
  };
}

/** The first unit that is not finished. */
export function currentUnit(units: Unit[], state: AppState): Unit | undefined {
  return units.find(u => !state.completedUnits.includes(u.id));
}

/** Next words never introduced, in unit order. */
export function nextNewWords(units: Unit[], state: AppState, n: number): number[] {
  const out: number[] = [];
  for (const u of units) {
    if (state.completedUnits.includes(u.id)) continue;
    for (const id of u.wordIds) {
      if (!state.progress[id]) out.push(id);
      if (out.length === n) return out;
    }
  }
  return out;
}

export function buildSession(words: Word[], units: Unit[], state: AppState, day: string,
                             rng: Rng = Math.random): Exercise[] {
  const byId = new Map(words.map(w => [w.id, w]));
  const allDue = Object.entries(state.progress)
    .map(([id, p]) => ({ w: byId.get(Number(id))!, p }))
    .filter(x => x.w && x.w.active && x.p.due <= day)
    .sort((a, b) => a.p.due.localeCompare(b.p.due) || a.p.box - b.p.box);
  const due = allDue.slice(0, MAX_REVIEWS);
  const newIds = allDue.length >= PAUSE_NEW_AT_BACKLOG ? [] : nextNewWords(units, state, state.settings.newPerDay);
  const newWords = newIds.map(id => byId.get(id)!);

  // Wrong answers come from words already met plus the current unit.
  const unitIds = new Set(currentUnit(units, state)?.wordIds ?? []);
  const pool = words.filter(w => w.active && (state.progress[w.id] || newIds.includes(w.id) || unitIds.has(w.id)));

  const steps: Exercise[] = [];
  for (const w of newWords) {
    steps.push(buildExercise('intro', w, pool, rng));
    steps.push(buildExercise('recognize', w, pool, rng));
  }
  const reviews = shuffle(due, rng).map(x => buildExercise(kindForBox(x.w, x.p.box), x.w, pool, rng));
  const recalls = newWords.map(w => buildExercise('recall', w, pool, rng));
  // Each new word's recall waits behind a few reviews, so it is answered from memory.
  let count = 0;
  for (const ex of reviews) {
    steps.push(ex);
    if (++count % 3 === 0 && recalls.length) steps.push(recalls.shift()!);
  }
  steps.push(...recalls);
  return steps;
}

/** Record one answer. Returns the new state; the screen calls requeue() when correct is false. */
export function applyAnswer(state: AppState, ex: Exercise, correct: boolean, day: string): AppState {
  const progress = { ...state.progress };
  const p = progress[ex.wordId] ?? newProgress(day);
  progress[ex.wordId] = ex.kind === 'intro' ? p : grade(p, correct, day, ex.kind);
  return { ...state, progress };
}

/** Put a missed word back into the session once, as an easy recognize question. */
export function requeue(steps: Exercise[], index: number, w: Word, pool: Word[],
                        retried: Set<number>, rng: Rng = Math.random): Exercise[] {
  if (retried.has(w.id)) return steps;
  retried.add(w.id);
  const copy = [...steps];
  copy.splice(Math.min(index + 1 + RETRY_GAP, copy.length), 0, buildExercise('recognize', w, pool, rng));
  return copy;
}

/** After the last step: close finished units and update the streak.
 *  Returns the ids of units finished today (each gets a say-it-at-home card). */
export function finishSession(state: AppState, units: Unit[], day: string): { state: AppState; finished: number[] } {
  const finished = units
    .filter(u => !state.completedUnits.includes(u.id))
    .filter(u => u.wordIds.every(id => (state.progress[id]?.box ?? 0) >= 1))
    .map(u => u.id);
  const yesterday = addDays(day, -1);
  const s = state.streak;
  const streak = s.lastDay === day ? s
    : { count: s.lastDay === yesterday ? s.count + 1 : 1, lastDay: day };
  return { state: { ...state, completedUnits: [...state.completedUnits, ...finished], streak }, finished };
}
