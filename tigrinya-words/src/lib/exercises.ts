import type { Word, Exercise, ExerciseKind } from './types';

export type Rng = () => number;

export function shuffle<T>(items: T[], rng: Rng = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** First meaning only, so answer buttons stay short. */
export function shortMeaning(w: Word): string {
  return w.meaning.split(';')[0].trim();
}

const geez = (w: Word) => w.word;

/** Pick wrong answers: same topic first, then same word type, then anything in the pool.
 *  Never the word itself, one of its variants, or a word that would look identical on the button. */
export function pickDistractors(target: Word, pool: Word[], show: (w: Word) => string,
                                rng: Rng, n = 3): Word[] {
  const shown = new Set([show(target), shortMeaning(target)]);
  const ok = pool.filter(w => w.id !== target.id && w.mainId !== target.id && target.mainId !== w.id);
  const tiers = [
    ok.filter(w => w.topic === target.topic),
    ok.filter(w => w.topic !== target.topic && w.type === target.type),
    ok,
  ];
  const picked: Word[] = [];
  for (const tier of tiers) {
    for (const w of shuffle(tier, rng)) {
      if (picked.length === n) return picked;
      if (shown.has(show(w)) || shown.has(shortMeaning(w))) continue;
      picked.push(w);
      shown.add(show(w));
      shown.add(shortMeaning(w));
    }
  }
  return picked;
}

function choice(kind: ExerciseKind, w: Word, pool: Word[], rng: Rng, show: (w: Word) => string,
                prompt: string, promptSub?: string): Exercise {
  const options = shuffle([w, ...pickDistractors(w, pool, show, rng)], rng).map(show);
  return { kind, wordId: w.id, prompt, promptSub, options, answer: show(w) };
}

export function buildExercise(kind: ExerciseKind, w: Word, pool: Word[], rng: Rng = Math.random): Exercise {
  switch (kind) {
    case 'intro':
      return { kind, wordId: w.id, prompt: w.word, promptSub: w.pron };
    case 'recognize':   // Ge'ez -> pick the English
      return choice(kind, w, pool, rng, shortMeaning, w.word, w.pron);
    case 'read':        // romanization -> pick the Ge'ez (teaches reading)
      return choice(kind, w, pool, rng, geez, w.pron);
    case 'recall':      // English -> pick the Ge'ez
      return choice(kind, w, pool, rng, geez, shortMeaning(w));
    case 'cloze':       // sentence with a blank + English sentence -> pick the Ge'ez
      return choice(kind, w, pool, rng, geez, w.cloze ?? w.word, w.exEn ?? undefined);
    case 'build': {     // English sentence -> tap the Ge'ez words in order
      const answerTiles = (w.exTi ?? '').split(' ').filter(Boolean);
      let tiles = shuffle(answerTiles, rng);
      for (let i = 0; i < 5 && tiles.join(' ') === answerTiles.join(' '); i++) tiles = shuffle(answerTiles, rng);
      return { kind, wordId: w.id, prompt: w.exEn ?? '', tiles, answerTiles };
    }
  }
}
