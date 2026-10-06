import type { Word } from './types';

export type Direction = 'en-ti' | 'ti-en';
export type AnswerFormat = 'fidel-only' | 'fidel-or-roman';
export type ResponseFormat = 'fidel' | 'roman' | 'english';
export type Note = 'missing-pop' | 'family-spelling' | 'app-spelling';

export interface RecallItem {
  wordId: number;
  prompt: string;              // English shown for English -> Tigrinya
  enToTi: boolean;
  romanAlternatives: string[]; // reviewed extra spellings; the word's own romanization is always accepted
  englishAnswers: string[];
  status: 'reviewed' | 'draft';
  ruleVersion: number;
}

export type Grade =
  | { kind: 'empty' }                                    // "Type an answer first" - not a miss
  | { kind: 'wrong-script'; message: string }            // ask to edit - not a miss
  | { kind: 'correct'; format: ResponseFormat; notes: Note[] }
  | { kind: 'wrong'; format: ResponseFormat };

export const RULE_VERSION = 1;
const ETHIOPIC = /[\u1200-\u137F]/;
const LATIN = /[a-z]/i;
const APOSTROPHES = /['’‘ʼ`´]/g;
const DASHES = /[-‐‑‒–—]/g;
const POP = /(ts|ch|t|p)'/g;

/** NFC, trim, lowercase, one kind of apostrophe, no dashes or spaces. */
function base(s: string): string {
  return s.normalize('NFC').trim().toLowerCase()
    .replace(APOSTROPHES, "'").replace(DASHES, '').replace(/\s+/g, '');
}
/** Remove throat-catch apostrophes but keep the ones that mark popped sounds (t' ts' ch' p'). */
function dropThroat(s: string): string {
  return s.replace(POP, '$1\u0000').replace(/'/g, '').replace(/\u0000/g, "'");
}
const dropPops = (s: string) => s.replace(/'/g, '');
const family = (s: string) => s.replace(/kh/g, 'h').replace(/q/g, 'k');
const pops = (s: string) => (s.match(POP) ?? []).length;

export function isBlank(input: string): boolean {
  return base(input).replace(/['.,!?;:]/g, '') === '';
}

function normEnglish(s: string): string {
  return s.normalize('NFC').toLowerCase().replace(APOSTROPHES, "'")
    .replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '').trim();
}

export function gradeRomanization(input: string, forms: string[]): Grade {
  const u = base(input);
  const targets = forms.map(base);
  if (targets.some(t => dropThroat(t) === dropThroat(u))) return { kind: 'correct', format: 'roman', notes: [] };
  const popNote = (t: string): Note[] => (pops(dropThroat(t)) > pops(dropThroat(u)) ? ['missing-pop'] : ['app-spelling']);
  for (const t of targets) {
    if (dropPops(t) === dropPops(u)) return { kind: 'correct', format: 'roman', notes: popNote(t) };
  }
  for (const t of targets) {
    if (family(dropPops(t)) === family(dropPops(u))) {
      const notes: Note[] = ['family-spelling'];
      if (pops(dropThroat(t)) > pops(dropThroat(u))) notes.push('missing-pop');
      return { kind: 'correct', format: 'roman', notes };
    }
  }
  return { kind: 'wrong', format: 'roman' };
}

export function gradeAnswer(item: RecallItem, word: Word, direction: Direction,
                            format: AnswerFormat, input: string): Grade {
  if (isBlank(input)) return { kind: 'empty' };
  const hasGeez = ETHIOPIC.test(input);
  const hasLatin = LATIN.test(input);
  if (direction === 'ti-en') {
    if (hasGeez) return { kind: 'wrong-script', message: 'Type the English meaning' };
    const u = normEnglish(input);
    return item.englishAnswers.some(a => normEnglish(a) === u)
      ? { kind: 'correct', format: 'english', notes: [] }
      : { kind: 'wrong', format: 'english' };
  }
  if (hasGeez && hasLatin) return { kind: 'wrong-script', message: "Use only Ge'ez letters or only English letters" };
  if (hasGeez) {
    return input.normalize('NFC').trim() === word.word.normalize('NFC')
      ? { kind: 'correct', format: 'fidel', notes: [] }
      : { kind: 'wrong', format: 'fidel' };
  }
  if (format === 'fidel-only') return { kind: 'wrong-script', message: 'Use Fidel for this round' };
  return gradeRomanization(input, [word.pron, ...item.romanAlternatives]);
}

/** The line shown under "Correct!" when a note applies. */
export function noteText(notes: Note[], appSpelling: string): string | null {
  if (notes.includes('missing-pop') && notes.includes('family-spelling'))
    return `Correct! The app writes it ${appSpelling}. The ' marks a popping sound.`;
  if (notes.includes('missing-pop')) return `Correct! You missed a popping mark: ${appSpelling}`;
  if (notes.length) return `Correct! The app writes it ${appSpelling}`;
  return null;
}
