import type { AppState, Unit } from './types';
import { addDays, grade } from './scheduler';
import { shuffle, type Rng } from './exercises';

export type Learner = 'boy' | 'girl';
export interface Line { ti: string; rom: string; en: string; girl?: { ti: string; rom: string; en?: string } }
export interface ReplyOption extends Line { correct?: boolean; why?: string }
export interface Turn { them?: Line; reply?: ReplyOption[]; creditWordIds?: number[] }
export interface Conversation {
  id: string;
  title: string;
  character: { ti: string; rom: string; en: string; gender: 'm' | 'f' };
  glossary: { ti: string; rom: string; en: string }[];
  turns: Turn[];
  requiredWordIds: number[];
  afterUnitId: number;
  tier: 'romanized' | 'mixed' | 'geez';
}
export interface ConversationResult { stars: 1 | 2 | 3; lastPlayed: string; plays: number }
export type ConversationStatus =
  | { kind: 'hidden' }                       // its unit isn't finished yet
  | { kind: 'waiting'; wordsLeft: number }   // unit finished, some words not at box 2 yet
  | { kind: 'open' }
  | { kind: 'done'; stars: 1 | 2 | 3 };

export const UNLOCK_BOX = 2;

/** The line as this learner should see it (girl version when there is one). */
export function forLearner<T extends Line>(line: T, learner: Learner): T {
  return learner === 'girl' && line.girl ? { ...line, ...line.girl } : line;
}

export function conversationStatus(c: Conversation, state: AppState): ConversationStatus {
  if (!state.completedUnits.includes(c.afterUnitId)) return { kind: 'hidden' };
  const wordsLeft = c.requiredWordIds.filter(id => (state.progress[id]?.box ?? 0) < UNLOCK_BOX).length;
  if (wordsLeft > 0) return { kind: 'waiting', wordsLeft };
  const result = state.conversations?.[c.id];
  return result ? { kind: 'done', stars: result.stars } : { kind: 'open' };
}

/** Where each conversation sits on the Units map: unit id -> conversations shown after it. */
export function conversationsAfterUnit(convs: Conversation[], units: Unit[]): Map<number, Conversation[]> {
  const map = new Map<number, Conversation[]>(units.map(u => [u.id, []]));
  for (const c of convs) map.get(c.afterUnitId)?.push(c);
  return map;
}

export function replyOptions(turn: Turn, learner: Learner, rng: Rng = Math.random): ReplyOption[] {
  return shuffle((turn.reply ?? []).map(o => forLearner(o, learner)), rng);
}

/** Feed one answered reply turn into the review schedule.
 *  Right on the first try: each credit word counts as a correct sentence answer.
 *  Not on the first try: no penalty, but its words come back for review tomorrow at the latest. */
export function recordReply(state: AppState, turn: Turn, firstTry: boolean, day: string): AppState {
  const progress = { ...state.progress };
  const tomorrow = addDays(day, 1);
  for (const id of turn.creditWordIds ?? []) {
    const p = progress[id];
    if (!p) continue;
    progress[id] = firstTry ? grade(p, true, day, 'cloze')
                            : { ...p, due: p.due < tomorrow ? p.due : tomorrow };
  }
  return { ...state, progress };
}

/** 0 mistakes = 3 stars, 1 = 2 stars, more = 1 star. Keeps the best result. */
export function finishConversation(state: AppState, c: Conversation, mistakes: number, day: string): AppState {
  const stars = (mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1) as 1 | 2 | 3;
  const prev = state.conversations?.[c.id];
  const result: ConversationResult = {
    stars: prev && prev.stars > stars ? prev.stars : stars,
    lastPlayed: day,
    plays: (prev?.plays ?? 0) + 1,
  };
  return { ...state, conversations: { ...(state.conversations ?? {}), [c.id]: result } };
}
