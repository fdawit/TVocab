import wordsJson from '../data/words.json';
import unitsJson from '../data/units.json';
import conversationsJson from '../data/conversations.json';
import recallJson from '../data/recall.json';
import type { Word, Unit } from './types';
import type { Conversation } from './conversations';
import type { RecallItem } from './recallGrader';

export const WORDS = wordsJson as Word[];
export const UNITS = unitsJson as Unit[];
export const WORD_BY_ID = new Map(WORDS.map(w => [w.id, w]));
export const CONVERSATIONS = conversationsJson as Conversation[];
export const RECALL = recallJson as RecallItem[];
