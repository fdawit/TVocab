import type { AppState, Unit, Word } from './types';
import { addDays, isMastered } from './scheduler';
import { shuffle, type Rng } from './exercises';
import { RULE_VERSION, type AnswerFormat, type Direction, type Note, type RecallItem,
         type ResponseFormat } from './recallGrader';

export interface RecallSettings { direction: Direction | 'mixed'; format: AnswerFormat; length: 10 | 20 | 30 }
export interface RecallRecord {
  firstCorrect: Partial<Record<ResponseFormat, number>>;
  firstWrong: number;
  assisted: number;
  retryCorrect: number;
  retryWrong: number;
  noteMissingPop: number;
  noteFamilySpelling: number;
  lastPracticed: string;
  lastMissed?: string;
  ruleVersion: number;
}
export interface QueueEntry { wordId: number; direction: Direction; retry: boolean }
export type Outcome = 'correct' | 'wrong' | 'dont-know';
export interface Attempt {
  index: number; wordId: number; direction: Direction; retry: boolean;
  outcome: Outcome; assisted: boolean; format?: ResponseFormat; input: string; notes: Note[];
}
export interface ActiveRecall {
  id: string; day: string; queue: QueueEntry[]; index: number;
  attempts: Attempt[]; deferred: QueueEntry[]; uniqueCount: number; notice?: string;
}
export interface RecallState {
  settings?: RecallSettings;
  records: Record<string, RecallRecord>;
  active?: ActiveRecall;
}

export const DEFAULT_RECALL_SETTINGS: RecallSettings = { direction: 'en-ti', format: 'fidel-or-roman', length: 10 };
export const RETRY_GAP = 3;              // at least 3 other prompts before a retry
export const MIN_MISSED_ROUND = 4;       // smaller missed-word rounds would be instant repeats
const key = (wordId: number, d: Direction) => `${wordId}|${d}`;

/** Home card: Auto shows it once every Level 1 unit is finished. */
export function recallEnabled(state: AppState, units: Unit[]): boolean {
  const mode = state.settings.freeRecall ?? 'auto';
  if (mode !== 'auto') return mode === 'on';
  return units.filter(u => u.level === 1).every(u => state.completedUnits.includes(u.id));
}

function eligible(item: RecallItem, w: Word | undefined, state: AppState, d: Direction): boolean {
  return !!w && w.active && (state.progress[w.id]?.box ?? 0) >= 1 && (d === 'ti-en' || item.enToTi);
}

/** PRD section 7: 70% due or weak, 20% recent, 10% maintenance, then backfill. */
export function selectSession(items: RecallItem[], words: Word[], state: AppState,
                              settings: RecallSettings, day: string, rng: Rng = Math.random):
  { queue: QueueEntry[]; notice?: string } {
  const byId = new Map(words.map(w => [w.id, w]));
  const dirs: Direction[] = settings.direction === 'mixed' ? ['en-ti', 'ti-en'] : [settings.direction];
  const pool = items.filter(it => dirs.some(d => eligible(it, byId.get(it.wordId), state, d)));
  if (pool.length === 0) return { queue: [], notice: 'Learn a few words first, then come back to practice them from memory.' };

  const records = state.recall?.records ?? {};
  const weekAgo = addDays(day, -6);
  const lastMiss = (id: number) => dirs.map(d => records[key(id, d)]?.lastMissed ?? '').sort().pop() ?? '';
  const p = (id: number) => state.progress[id];
  const shuffled = shuffle(pool, rng);
  const dueWeak = shuffled
    .filter(it => p(it.wordId)!.due <= day || lastMiss(it.wordId) >= weekAgo)
    .sort((a, b) => lastMiss(b.wordId).localeCompare(lastMiss(a.wordId)) || p(a.wordId)!.due.localeCompare(p(b.wordId)!.due));
  const taken = new Set(dueWeak.map(i => i.wordId));
  const recent = shuffled.filter(it => !taken.has(it.wordId) && p(it.wordId)!.firstSeen >= weekAgo);
  recent.forEach(i => taken.add(i.wordId));
  const maintenance = shuffled.filter(it => !taken.has(it.wordId) && isMastered(p(it.wordId), byId.get(it.wordId)!));
  maintenance.forEach(i => taken.add(i.wordId));
  const other = shuffled.filter(it => !taken.has(it.wordId));

  const n = Math.min(settings.length, pool.length);
  const quota = [Math.round(n * 0.7), Math.round(n * 0.2)];
  quota.push(n - quota[0] - quota[1]);
  const picked: RecallItem[] = [];
  const pickedIds = new Set<number>();
  const take = (from: RecallItem[], max: number) => {
    for (const it of from) {
      if (picked.length >= n || max <= 0) return;
      if (pickedIds.has(it.wordId)) continue;
      picked.push(it); pickedIds.add(it.wordId); max--;
    }
  };
  take(dueWeak, quota[0]); take(recent, quota[1]); take(maintenance, quota[2]);
  for (const b of [dueWeak, recent, maintenance, other]) take(b, n);

  // Directions: fixed per word for the whole session (retries keep it).
  const counts = { 'en-ti': 0, 'ti-en': 0 };
  const queue: QueueEntry[] = [];
  const flexible: RecallItem[] = [];
  for (const it of picked) {
    const can = dirs.filter(d => eligible(it, byId.get(it.wordId), state, d));
    if (can.length === 1) { queue.push({ wordId: it.wordId, direction: can[0], retry: false }); counts[can[0]]++; }
    else flexible.push(it);
  }
  for (const it of flexible) {
    const d: Direction = counts['en-ti'] <= counts['ti-en'] ? 'en-ti' : 'ti-en';
    queue.push({ wordId: it.wordId, direction: d, retry: false }); counts[d]++;
  }
  const notes: string[] = [];
  if (n < settings.length) notes.push(n === 1 ? 'Only 1 word is ready, so this round has 1.' : `Only ${n} words are ready, so this round has ${n}.`);
  if (settings.direction === 'mixed' && Math.abs(counts['en-ti'] - counts['ti-en']) > 1)
    notes.push(`Not enough words for an even mix: ${counts['en-ti']} English → Tigrinya, ${counts['ti-en']} Tigrinya → English.`);
  return { queue: shuffle(queue, rng), notice: notes.join(' ') || undefined };
}

export function startRecall(state: AppState, queue: QueueEntry[], day: string, notice?: string): AppState {
  const active: ActiveRecall = { id: `${day}-${Date.now()}`, day, queue, index: 0, attempts: [], deferred: [],
                                 uniqueCount: queue.length, notice };
  return { ...state, recall: { records: {}, ...state.recall, active } };
}

/** Record the graded answer for the current prompt. Calling it twice for the same prompt does nothing. */
export function recordAttempt(state: AppState, outcome: Outcome, assisted: boolean, input: string,
                              day: string, format?: ResponseFormat, notes: Note[] = []): AppState {
  const r = state.recall;
  const a = r?.active;
  if (!r || !a || a.index >= a.queue.length) return state;
  if (a.attempts.some(x => x.index === a.index)) return state;      // double submission
  const entry = a.queue[a.index];
  const k = key(entry.wordId, entry.direction);
  const rec: RecallRecord = { firstCorrect: {}, firstWrong: 0, assisted: 0, retryCorrect: 0, retryWrong: 0,
                              noteMissingPop: 0, noteFamilySpelling: 0, lastPracticed: day,
                              ruleVersion: RULE_VERSION, ...(r.records[k] as RecallRecord | undefined) };
  const next = { ...rec, firstCorrect: { ...rec.firstCorrect }, lastPracticed: day, ruleVersion: RULE_VERSION };
  const missed = outcome !== 'correct';
  if (entry.retry) {
    if (missed) next.retryWrong++; else next.retryCorrect++;
  } else if (assisted) {
    next.assisted++;
  } else if (missed) {
    next.firstWrong++;
  } else if (format) {
    next.firstCorrect[format] = (next.firstCorrect[format] ?? 0) + 1;
  }
  if (missed) next.lastMissed = day;
  if (notes.includes('missing-pop')) next.noteMissingPop++;
  if (notes.includes('family-spelling')) next.noteFamilySpelling++;

  let queue = a.queue;
  let deferred = a.deferred;
  if (missed && !entry.retry && !assisted) {
    const retry: QueueEntry = { ...entry, retry: true };
    if (a.queue.length - (a.index + 1) >= RETRY_GAP) {
      queue = [...a.queue];
      queue.splice(a.index + 1 + RETRY_GAP, 0, retry);
    } else {
      deferred = [...a.deferred, retry];
    }
  }
  const attempt: Attempt = { index: a.index, wordId: entry.wordId, direction: entry.direction, retry: entry.retry,
                             outcome, assisted, format, input, notes };
  return { ...state, recall: { ...r, records: { ...r.records, [k]: next },
                               active: { ...a, queue, deferred, attempts: [...a.attempts, attempt] } } };
}

/** Move past the feedback to the next prompt. */
export function continueRecall(state: AppState): AppState {
  const a = state.recall?.active;
  if (!a || !a.attempts.some(x => x.index === a.index)) return state;   // can't skip an unanswered prompt
  return { ...state, recall: { ...state.recall!, active: { ...a, index: a.index + 1 } } };
}

export interface RecallSummary {
  unique: number;
  firstTry: { correct: number; total: number } | null;   // unassisted only; null if none
  assisted: number;
  recoveredOnRetry: number;
  stillNeedsPractice: QueueEntry[];
  canPracticeMissed: boolean;
}

export function summarize(a: ActiveRecall): RecallSummary {
  const firsts = a.attempts.filter(x => !x.retry);
  const unassisted = firsts.filter(x => !x.assisted);
  const retries = a.attempts.filter(x => x.retry);
  const still = new Map<string, QueueEntry>();
  for (const x of retries) if (x.outcome !== 'correct') still.set(key(x.wordId, x.direction), { wordId: x.wordId, direction: x.direction, retry: false });
  for (const x of a.deferred) still.set(key(x.wordId, x.direction), { ...x, retry: false });
  for (const x of firsts) if (x.assisted && x.outcome !== 'correct') still.set(key(x.wordId, x.direction), { wordId: x.wordId, direction: x.direction, retry: false });
  return {
    unique: a.uniqueCount,
    firstTry: unassisted.length ? { correct: unassisted.filter(x => x.outcome === 'correct').length, total: unassisted.length } : null,
    assisted: firsts.filter(x => x.assisted).length,
    recoveredOnRetry: retries.filter(x => x.outcome === 'correct').length,
    stillNeedsPractice: [...still.values()],
    canPracticeMissed: still.size >= MIN_MISSED_ROUND,
  };
}

/** Same rule as finishSession in Step 7. */
export function touchStreak(state: AppState, day: string): AppState {
  const s = state.streak;
  if (s.lastDay === day) return state;
  return { ...state, streak: { count: s.lastDay === addDays(day, -1) ? s.count + 1 : 1, lastDay: day } };
}

/** At the summary screen: count the day for the streak and clear the saved session. */
export function finishRecall(state: AppState, day: string): { state: AppState; summary: RecallSummary | null } {
  const a = state.recall?.active;
  if (!a) return { state, summary: null };
  const summary = summarize(a);
  const { active, ...rest } = state.recall!;
  return { state: touchStreak({ ...state, recall: { ...rest } }, day), summary };
}

/** On opening Free Recall: resume today's unfinished session, drop one from an earlier day. */
export function resumable(state: AppState, day: string): ActiveRecall | null {
  const a = state.recall?.active;
  return a && a.day === day && a.index < a.queue.length ? a : null;
}
