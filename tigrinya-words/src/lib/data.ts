import wordsJson from '../data/words.json';
import unitsJson from '../data/units.json';
import type { Word, Unit } from './types';

export const WORDS = wordsJson as Word[];
export const UNITS = unitsJson as Unit[];
export const WORD_BY_ID = new Map(WORDS.map(w => [w.id, w]));
