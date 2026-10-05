import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, Button, ProgressBar, colors } from '../src/components/Screen';
import { Geez } from '../src/components/Geez';
import { ChoiceButton, type ChoiceState } from '../src/components/ChoiceButton';
import { WordCard, Tip } from '../src/components/WordCard';
import { WORDS, UNITS, WORD_BY_ID } from '../src/lib/data';
import { applyAnswer, buildSession, currentUnit, finishSession, requeue } from '../src/lib/session';
import { shortMeaning } from '../src/lib/exercises';
import { dayString } from '../src/lib/scheduler';
import { romanization } from '../src/lib/romanization';
import { loadState, saveState } from '../src/lib/storage';
import type { AppState, Exercise, Word } from '../src/lib/types';

const PRAISE = ['ጽቡቕ!', 'ብሉጽ!', 'ልክዕ!'];   // Good! Excellent! Exactly!

// Ge'ez answer buttons show the romanization of the word they spell.
const ACTIVE_BY_GEEZ = new Map<string, Word>();
for (const w of WORDS) if (w.active && !ACTIVE_BY_GEEZ.has(w.word)) ACTIVE_BY_GEEZ.set(w.word, w);

type Feedback = { correct: boolean; picked?: string };

export default function Session() {
  const day = useRef(dayString()).current;
  const stateRef = useRef<AppState | null>(null);
  const pool = useRef<Word[]>([]);
  const retried = useRef(new Set<number>());
  const [steps, setSteps] = useState<Exercise[] | null>(null);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [placed, setPlaced] = useState<number[]>([]);   // build: indexes into ex.tiles, in tap order
  const [showSounds, setShowSounds] = useState(false);  // "Show sounds" tapped on this step
  const tally = useRef({ correct: 0, graded: 0, met: 0, praise: 0 });

  // On open: load progress and build the whole day's session.
  useEffect(() => {
    loadState().then(state => {
      stateRef.current = state;
      const built = buildSession(WORDS, UNITS, state, day);
      // Same pool buildSession uses: words already met, today's new words and the current unit.
      const newIds = new Set(built.filter(s => s.kind === 'intro').map(s => s.wordId));
      const unitIds = new Set(currentUnit(UNITS, state)?.wordIds ?? []);
      pool.current = WORDS.filter(w => w.active && (state.progress[w.id] || newIds.has(w.id) || unitIds.has(w.id)));
      setSteps(built);
    });
  }, [day]);

  if (!steps) return <Screen><View /></Screen>;
  if (steps.length === 0) {
    return (
      <Screen>
        <Geez bold style={styles.big}>ጽቡቕ!</Geez>
        <Text style={styles.center}>All done for today!</Text>
        <Button label="Back to Home" onPress={() => router.dismissTo('/')} />
      </Screen>
    );
  }

  const ex = steps[index];
  const word = WORD_BY_ID.get(ex.wordId)!;

  /** Record the answer and save right away, so quitting mid-session loses nothing. */
  async function answer(correct: boolean, picked?: string) {
    const state = applyAnswer(stateRef.current!, ex, correct, day);
    stateRef.current = state;
    await saveState(state);
    if (ex.kind === 'intro') {
      tally.current.met++;
      next(steps!);
      return;
    }
    tally.current.graded++;
    if (correct) {
      tally.current.correct++;
      tally.current.praise++;
    } else {
      setSteps(requeue(steps!, index, word, pool.current, retried.current));
    }
    setFeedback({ correct, picked });
  }

  async function next(list: Exercise[]) {
    setFeedback(null);
    setPlaced([]);
    setShowSounds(false);
    if (index + 1 < list.length) {
      setIndex(index + 1);
      return;
    }
    // After the last step: close finished units, update the streak, show the summary.
    const { state, finished } = finishSession(stateRef.current!, UNITS, day);
    stateRef.current = state;
    await saveState(state);
    const t = tally.current;
    router.replace({
      pathname: '/summary',
      params: { correct: String(t.correct), graded: String(t.graded), met: String(t.met), finished: finished.join(',') },
    });
  }

  function tapTile(i: number) {
    if (feedback) return;
    const now = placed.includes(i) ? placed.filter(p => p !== i) : [...placed, i];
    setPlaced(now);
    if (now.length === ex.tiles!.length) {
      const built = now.map(p => ex.tiles![p]);
      answer(built.join(' ') === ex.answerTiles!.join(' '));
    }
  }

  const geezOptions = ex.kind !== 'recognize';

  // Romanization fade (Step 9b): shown while a word is in boxes 0-3 (Auto mode), then behind "Show sounds".
  const settings = stateRef.current!.settings;
  const boxOf = (w: Word) => stateRef.current!.progress[w.id]?.box ?? 0;
  const romFor = (w: Word | undefined, text: string | undefined) =>
    w && text && (showSounds || romanization(settings.romanization, boxOf(w)) === 'show') ? text : undefined;
  const hiddenFor = (w: Word | undefined) => !!w && !showSounds && romanization(settings.romanization, boxOf(w)) === 'tap';
  // The read exercise never romanizes its Ge'ez buttons: reading them is the point.
  const romanizeOptions = ex.kind === 'recall' || ex.kind === 'cloze';
  const optionSub = (o: string) => {
    if (!romanizeOptions) return undefined;
    const w = ACTIVE_BY_GEEZ.get(o);
    return romFor(w, w?.pron);
  };
  // Build tiles line up word for word with the romanized example.
  const tileRom = (tile: string) => {
    if (ex.kind !== 'build') return undefined;
    const k = ex.answerTiles!.indexOf(tile);
    return romFor(word, (word.exRom ?? '').split(' ').filter(Boolean)[k]);
  };
  const canShowSounds =
    ex.kind === 'recognize' ? hiddenFor(word)
    : romanizeOptions ? ex.options!.some(o => hiddenFor(ACTIVE_BY_GEEZ.get(o)))
    : ex.kind === 'build' ? hiddenFor(word) && !!word.exRom
    : false;
  const showSoundsButton = canShowSounds && (
    <Pressable onPress={() => setShowSounds(true)} accessibilityRole="button" style={styles.soundsButton}>
      <Text style={styles.soundsText}>Show sounds</Text>
    </Pressable>
  );
  const optionState = (o: string): ChoiceState => {
    if (!feedback) return 'idle';
    if (o === ex.answer) return 'correct';
    if (o === feedback.picked) return 'wrong';
    return 'dim';
  };

  return (
    <Screen back={false}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Leave session">
          <Text style={styles.leave}>✕</Text>
        </Pressable>
        <View style={{ flex: 1 }}><ProgressBar value={index / steps.length} /></View>
      </View>

      {ex.kind === 'intro' && (
        <>
          <Text style={styles.newWord}>New word</Text>
          <WordCard word={word} />
          <Button label="Got it" onPress={() => answer(true)} />
        </>
      )}

      {ex.options && (
        <>
          <Prompt ex={ex} sub={ex.kind === 'recognize' ? romFor(word, ex.promptSub) : ex.promptSub} />
          {showSoundsButton}
          <View style={styles.options}>
            {ex.options.map(o => (
              <ChoiceButton key={o} label={o} sub={optionSub(o)} geez={geezOptions} state={optionState(o)}
                            disabled={!!feedback} onPress={() => answer(o === ex.answer, o)} />
            ))}
          </View>
        </>
      )}

      {ex.kind === 'build' && ex.tiles && (
        <>
          <Text style={styles.instruction}>Put the words in order</Text>
          <Text style={styles.promptEn}>{ex.prompt}</Text>
          {showSoundsButton}
          <View style={[styles.answerLine, feedback && { borderColor: feedback.correct ? colors.correct : colors.wrong }]}>
            {placed.map(i => <Tile key={i} label={ex.tiles![i]} sub={tileRom(ex.tiles![i])} onPress={() => tapTile(i)} />)}
          </View>
          <View style={styles.bank}>
            {ex.tiles.map((t, i) => placed.includes(i)
              ? <View key={i} style={[styles.tile, styles.tileGhost]}>
                  <Geez style={[styles.tileText, { opacity: 0 }]}>{t}</Geez>
                  {!!tileRom(t) && <Text style={[styles.tileSub, { opacity: 0 }]}>{tileRom(t)}</Text>}
                </View>
              : <Tile key={i} label={t} sub={tileRom(t)} onPress={() => tapTile(i)} />)}
          </View>
          {feedback && !feedback.correct && (
            <Geez style={[styles.solution]}>{ex.answerTiles!.join(' ')}</Geez>
          )}
        </>
      )}

      {feedback && (
        <View style={[styles.feedback, { backgroundColor: feedback.correct ? colors.correctBg : colors.wrongBg }]}>
          {feedback.correct
            ? <Geez bold style={[styles.praise, { color: colors.correct }]}>{PRAISE[(tally.current.praise - 1) % PRAISE.length]}</Geez>
            : (
              <>
                <Text style={[styles.feedbackTitle, { color: colors.wrong }]}>Not quite. Here is the answer:</Text>
                <Geez bold style={styles.fbWord}>{word.word}</Geez>
                <Text style={styles.fbLine}>{word.pron} · {shortMeaning(word)}</Text>
                {!!word.note && <Tip note={word.note} />}
              </>
            )}
          <Button label="Next" onPress={() => next(steps)} />
        </View>
      )}
    </Screen>
  );
}

/** The big line at the top of a multiple-choice exercise. */
function Prompt({ ex, sub }: { ex: Exercise; sub?: string }) {
  switch (ex.kind) {
    case 'recognize':
      return (
        <View style={styles.prompt}>
          <Text style={styles.instruction}>What does this mean?</Text>
          <Geez bold style={styles.big}>{ex.prompt}</Geez>
          {!!sub && <Text style={styles.sub}>{sub}</Text>}
        </View>
      );
    case 'read':
      return (
        <View style={styles.prompt}>
          <Text style={styles.instruction}>Which word says this?</Text>
          <Text style={styles.promptLatin}>{ex.prompt}</Text>
        </View>
      );
    case 'recall':
      return (
        <View style={styles.prompt}>
          <Text style={styles.instruction}>How do you say this in Tigrinya?</Text>
          <Text style={styles.promptLatin}>{ex.prompt}</Text>
        </View>
      );
    case 'cloze':
      return (
        <View style={styles.prompt}>
          <Text style={styles.instruction}>Which word fills the gap?</Text>
          <Geez style={styles.sentence}>{ex.prompt}</Geez>
          {!!sub && <Text style={styles.promptEn}>{sub}</Text>}
        </View>
      );
    default:
      return null;
  }
}

function Tile({ label, sub, onPress }: { label: string; sub?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
               style={({ pressed }) => [styles.tile, pressed && { opacity: 0.7 }]}>
      <Geez style={styles.tileText}>{label}</Geez>
      {!!sub && <Text style={styles.tileSub}>{sub}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  leave: { fontSize: 26, color: colors.muted, paddingHorizontal: 4 },
  newWord: { fontSize: 16, fontWeight: '700', color: colors.star, textAlign: 'center', textTransform: 'uppercase' },
  prompt: { alignItems: 'center', gap: 6, paddingVertical: 12 },
  instruction: { fontSize: 17, color: colors.muted, textAlign: 'center' },
  big: { fontSize: 36, lineHeight: 52, color: colors.text, textAlign: 'center' },
  sub: { fontSize: 20, color: colors.muted },
  promptLatin: { fontSize: 30, fontWeight: '700', color: colors.text, textAlign: 'center' },
  sentence: { fontSize: 28, lineHeight: 42, color: colors.text, textAlign: 'center' },
  promptEn: { fontSize: 20, color: colors.text, textAlign: 'center' },
  center: { fontSize: 20, color: colors.text, textAlign: 'center' },
  options: { gap: 12 },
  answerLine: {
    minHeight: 72, borderBottomWidth: 2, borderColor: colors.line, flexDirection: 'row', flexWrap: 'wrap',
    gap: 8, paddingVertical: 8, justifyContent: 'center', alignItems: 'center',
  },
  bank: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', paddingVertical: 8 },
  tile: {
    minHeight: 56, minWidth: 56, paddingHorizontal: 14, borderRadius: 12, borderWidth: 2, borderColor: colors.line,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
  },
  tileGhost: { backgroundColor: colors.line, borderColor: colors.line },
  tileText: { fontSize: 24, lineHeight: 36, color: colors.text },
  tileSub: { fontSize: 14, color: colors.muted },
  soundsButton: { alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.line },
  soundsText: { fontSize: 15, color: colors.primary },
  solution: { fontSize: 24, lineHeight: 36, color: colors.correct, textAlign: 'center' },
  feedback: { borderRadius: 18, padding: 16, gap: 8 },
  feedbackTitle: { fontSize: 18, fontWeight: '700' },
  praise: { fontSize: 32, lineHeight: 46, textAlign: 'center' },
  fbWord: { fontSize: 30, lineHeight: 44, color: colors.text, textAlign: 'center' },
  fbLine: { fontSize: 19, color: colors.text, textAlign: 'center' },
});
