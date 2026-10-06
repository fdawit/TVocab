import wordsJson from '../data/words.json';
import unitsJson from '../data/units.json';
import conversationsJson from '../data/conversations.json';
import type { Word, Unit } from './types';
import type { Conversation } from './conversations';

export const WORDS = wordsJson as Word[];
export const UNITS = unitsJson as Unit[];
export const WORD_BY_ID = new Map(WORDS.map(w => [w.id, w]));
export const CONVERSATIONS = conversationsJson as Conversation[];
