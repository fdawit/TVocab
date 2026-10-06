export type Level = 1 | 2 | 3 | 4;
export type Addressee = 'boy' | 'girl' | 'group' | null;

export interface Word {
  id: number;            // rank in the original list (1-1000)
  word: string;          // Ge'ez
  freq: number;
  pron: string;          // romanized, hyphenated syllables
  meaning: string;
  type: string;          // Word Type column
  topic: string;
  level: Level;
  exTi: string | null;   // example, Ge'ez
  exRom: string | null;  // example, romanized
  exEn: string | null;   // example, English
  note: string;
  addressee: Addressee;  // who the example speaks to
  mainId: number | null; // set on variants: the id of the main word
  alsoWritten: string[]; // set on main words: their variants
  cloze: string | null;  // example with the word blanked out
  canBuild: boolean;     // example has 3-6 words
  active: boolean;       // studied in lessons (Levels 1-3, main forms)
}

export interface Unit {
  id: number;
  level: 1 | 2 | 3;
  topic: string;
  title: string;
  wordIds: number[];
  homeWordId: number;    // word whose example is the say-it-at-home sentence
}

export type ExerciseKind = 'intro' | 'recognize' | 'read' | 'recall' | 'cloze' | 'build';

export interface WordProgress {
  box: number;           // 0 = just introduced, 1-7 = Leitner box
  due: string;           // YYYY-MM-DD
  firstSeen: string;     // YYYY-MM-DD
  lastGraded: string;    // YYYY-MM-DD
  seen: number;
  wrong: number;
  usedInSentence: boolean;
}

export interface Settings {
  newPerDay: 3 | 5 | 8;
  romanization: 'auto' | 'always' | 'tap';
  learner?: 'boy' | 'girl';   // how conversation characters address the child
}

export interface AppState {
  version: 1;
  progress: Record<number, WordProgress>;
  completedUnits: number[];
  homeDone: number[];    // unit ids whose home sentence a parent confirmed
  streak: { count: number; lastDay: string };
  settings: Settings;
  conversations?: Record<string, { stars: 1 | 2 | 3; lastPlayed: string; plays: number }>;
}

export interface Exercise {
  kind: ExerciseKind;
  wordId: number;
  prompt: string;          // what is shown big
  promptSub?: string;      // smaller line under it (English sentence, romanization)
  options?: string[];      // tap-to-choose answers
  answer?: string;         // the correct option
  tiles?: string[];        // build: shuffled words
  answerTiles?: string[];  // build: correct order
}
