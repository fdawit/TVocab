import type { WordProgress, ExerciseKind, Word } from './types';

// Days until the next review for each Leitner box. Index = box.
export const BOX_DAYS = [0, 1, 2, 4, 7, 14, 30, 60];
export const MAX_BOX = BOX_DAYS.length - 1;
export const MASTERED_BOX = 5;

export function dayString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return dayString(new Date(y, m - 1, d + n));
}

export function newProgress(day: string): WordProgress {
  return { box: 0, due: day, firstSeen: day, lastGraded: '', seen: 0, wrong: 0, usedInSentence: false };
}

/** Apply one graded answer. Only the first correct answer of the day moves a word up a box,
 *  so a word can't race up several boxes in one session. A wrong answer drops it one box
 *  (never below 1) and brings it back tomorrow. */
export function grade(p: WordProgress, correct: boolean, day: string, kind: ExerciseKind): WordProgress {
  const next = { ...p, seen: p.seen + 1 };
  if (correct && (kind === 'cloze' || kind === 'build')) next.usedInSentence = true;
  if (!correct) {
    next.wrong = p.wrong + 1;
    next.box = Math.max(1, p.box - 1);
    next.due = addDays(day, BOX_DAYS[1]);
    next.lastGraded = day;
    return next;
  }
  if (p.lastGraded === day) return next;          // already moved today
  next.box = Math.min(p.box + 1, MAX_BOX);
  next.due = addDays(day, BOX_DAYS[next.box]);
  next.lastGraded = day;
  return next;
}

export function isMastered(p: WordProgress | undefined, w: Word): boolean {
  if (!p) return false;
  const sentenceOk = p.usedInSentence || (!w.cloze && !w.canBuild);
  return p.box >= MASTERED_BOX && sentenceOk;
}

/** Which exercise a review uses, by box. */
export function kindForBox(w: Word, box: number): ExerciseKind {
  if (box <= 1) return 'recognize';
  if (box === 2) return 'read';
  if (box === 3) return 'recall';
  if (box === 4) return w.canBuild ? 'build' : w.cloze ? 'cloze' : 'recall';
  return w.cloze ? 'cloze' : w.canBuild ? 'build' : 'recall';
}
