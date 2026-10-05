// Ge'ez letters come in rows of 8 code points: 7 vowel forms, then a w-form.
// Each row below is [first code point, consonant sound in this app's romanization].
const ROWS: [number, string][] = [
  [0x1200, 'h'], [0x1208, 'l'], [0x1210, 'h'], [0x1218, 'm'], [0x1228, 'r'], [0x1230, 's'],
  [0x1238, 'sh'], [0x1240, 'q'], [0x1250, 'q'], [0x1260, 'b'], [0x1268, 'v'], [0x1270, 't'],
  [0x1278, 'ch'], [0x1290, 'n'], [0x1298, 'ny'], [0x12A0, ''], [0x12A8, 'k'], [0x12B8, 'kh'],
  [0x12C8, 'w'], [0x12D0, ''], [0x12D8, 'z'], [0x12E0, 'zh'], [0x12E8, 'y'], [0x12F0, 'd'],
  [0x1300, 'j'], [0x1308, 'g'], [0x1320, "t'"], [0x1328, "ch'"], [0x1330, "p'"], [0x1338, "ts'"],
  [0x1340, "ts'"], [0x1348, 'f'], [0x1350, 'p'],
];
const VOWELS = ['e', 'u', 'i', 'a', 'e', 'i', 'o'];   // the 7 forms, in Unicode order

// Rounded-lip ("w") letters live in their own rows with 5 forms at these offsets.
const W_ROWS: [number, string][] = [[0x1248, 'q'], [0x12B0, 'k'], [0x12C0, 'kh'], [0x1310, 'g']];
const W_FORMS: [number, string][] = [[0, 'o'], [2, 'wi'], [3, 'wa'], [4, 'we'], [5, 'u']];

export interface Letter { char: string; sound: string }

/** One row per consonant, keeping only letters that appear in `text` (all the app's words). */
export function letterChart(text: string): { consonant: string; letters: Letter[] }[] {
  const used = new Set([...text]);
  const plain = ROWS.map(([base, c]) => ({
    consonant: c || "'",
    letters: VOWELS.map((v, k) => ({ char: String.fromCodePoint(base + k), sound: c + v })),
  }));
  const rounded = W_ROWS.map(([base, c]) => ({
    consonant: c + 'w',
    letters: W_FORMS.map(([k, v]) => ({ char: String.fromCodePoint(base + k), sound: c + v })),
  }));
  return [...plain, ...rounded]
    .map(r => ({ ...r, letters: r.letters.filter(l => used.has(l.char)) }))
    .filter(r => r.letters.length > 0);
}
