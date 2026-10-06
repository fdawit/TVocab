import { gradeAnswer, type RecallItem } from './recallGrader';
import type { Word } from './types';

const word = (w: string, pron: string) => ({ id: 1, word: w, pron } as Word);
const item = (extra: Partial<RecallItem> = {}): RecallItem =>
  ({ wordId: 1, prompt: '', enToTi: true, romanAlternatives: [], englishAnswers: [],
     status: 'reviewed', ruleVersion: 1, ...extra });
const g = (w: Word, input: string, it = item(), dir: 'en-ti' | 'ti-en' = 'en-ti',
           fmt: 'fidel-only' | 'fidel-or-roman' = 'fidel-or-roman') => gradeAnswer(it, w, dir, fmt, input);

const tiray = word('ጥራይ', "t'i-ray");
const tsibuq = word('ጽቡቕ', "ts'i-buq");
const amlakh = word('ኣምላኽ', 'am-lakh');
const makel = word('ማእከል', "ma'-kel");
const kullu = word('ኩሉ', 'kul-lu');

test.each([
  ["t'i-ray", tiray, []],
  ['t’iray', tiray, []],
  ["T'I–RAY", tiray, []],
  ["t'i ray", tiray, []],
  ['tiray', tiray, ['missing-pop']],
  ['makel', makel, []],
  ['amlah', amlakh, ['family-spelling']],
  ['tsibuk', tsibuq, ['family-spelling', 'missing-pop']],
])('%s is accepted', (input, w, notes) => {
  expect(g(w as Word, input as string)).toEqual({ kind: 'correct', format: 'roman', notes });
});

test.each([['tsibu'], ["ts'ebuq"]])('%s is wrong', input => {
  expect(g(tsibuq, input).kind).toBe('wrong');
});

test('single-letter spelling only when approved', () => {
  expect(g(kullu, 'kulu', item({ romanAlternatives: ['kulu'] })).kind).toBe('correct');
  expect(g(kullu, 'kulu').kind).toBe('wrong');
});

test('Ge\'ez must match exactly', () => {
  expect(g(tsibuq, ' ጽቡቕ ').kind).toBe('correct');
  expect(g(tsibuq, 'ጸቡቕ').kind).toBe('wrong');
});

test('edit requests are not misses', () => {
  expect(g(tsibuq, '   ').kind).toBe('empty');
  expect(g(tsibuq, 'tsibuq', item(), 'en-ti', 'fidel-only').kind).toBe('wrong-script');
  expect(g(tsibuq, 'ጽbuq').kind).toBe('wrong-script');
});

test('English answers: synonyms yes, partial no', () => {
  const it = item({ englishAnswers: ['all', 'everything'] });
  expect(g(kullu, 'Everything.', it, 'ti-en').kind).toBe('correct');
  expect(g(kullu, 'every', it, 'ti-en').kind).toBe('wrong');
});
