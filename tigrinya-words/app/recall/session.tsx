import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button, colors } from '../../src/components/Screen';
import { Geez } from '../../src/components/Geez';
import { RECALL, WORD_BY_ID } from '../../src/lib/data';
import { gradeAnswer, noteText, type Note, type RecallItem } from '../../src/lib/recallGrader';
import {
  DEFAULT_RECALL_SETTINGS, continueRecall, recordAttempt, resumable, type Attempt,
} from '../../src/lib/recallSession';
import { dayString } from '../../src/lib/scheduler';
import { loadState, saveState } from '../../src/lib/storage';
import type { AppState } from '../../src/lib/types';

const ITEM_BY_ID = new Map<number, RecallItem>(RECALL.map(i => [i.wordId, i]));
const TYPE_LABEL: Record<string, string> = {
  'Noun': 'naming word', 'Adjective': 'describing word', 'Adverb': 'adverb', 'Number': 'number',
  'Question word': 'question word', 'Place name': 'place name', 'Answer word': 'answer word',
};

export default function RecallSessionScreen() {
  const day = useRef(dayString()).current;
  const [state, setState] = useState<AppState | null>(null);
  const [input, setInput] = useState('');
  const [message, setMessage] = useState<string | null>(null);   // "Type an answer first" etc.
  const [assisted, setAssisted] = useState(false);              // "Show pronunciation" tapped
  const busy = useRef(false);
  const inputRef = useRef<TextInput>(null);

  // Resume today's session at the next prompt; anything else goes back to setup.
  useEffect(() => {
    loadState().then(s => {
      const active = s.recall?.active;
      const finishedToday = !!active && active.day === day && active.index >= active.queue.length;
      // A session left unfinished from an earlier day isn't resumed.
      if (!resumable(s, day) && !finishedToday) { router.replace('/recall'); return; }
      setState(s);
    });
  }, [day]);

  const a = state?.recall?.active;
  useEffect(() => {
    if (a && a.index >= a.queue.length) router.replace('/recall/summary');
  }, [a]);
  if (!state || !a || a.index >= a.queue.length) return <SafeAreaView style={styles.safe} />;

  const entry = a.queue[a.index];
  const word = WORD_BY_ID.get(entry.wordId)!;
  const item = ITEM_BY_ID.get(entry.wordId)!;
  const settings = state.recall?.settings ?? DEFAULT_RECALL_SETTINGS;
  const attempt: Attempt | undefined = a.attempts.find(x => x.index === a.index);   // set once checked
  const firstTriesDone = a.queue.slice(0, a.index + (entry.retry ? 0 : 1)).filter(q => !q.retry).length;
  const retriesWaiting = a.queue.slice(a.index + 1).filter(q => q.retry).length;
  const isAssisted = attempt ? attempt.assisted : assisted;

  async function save(next: AppState) {
    setState(next);
    await saveState(next);
  }

  async function check() {
    if (busy.current || attempt) return;      // ignore a second tap while grading
    busy.current = true;
    try {
      const grade = gradeAnswer(item, word, entry.direction, settings.format, input);
      if (grade.kind === 'empty') { setMessage('Type an answer first'); return; }
      if (grade.kind === 'wrong-script') { setMessage(grade.message); return; }
      setMessage(null);
      const notes: Note[] = grade.kind === 'correct' ? grade.notes : [];
      await save(recordAttempt(state!, grade.kind, assisted, input, day, grade.format, notes));
      announce(grade.kind === 'correct' ? 'Correct!' : 'Not quite.');
    } finally {
      busy.current = false;
    }
  }

  async function dontKnow() {
    if (busy.current || attempt) return;
    busy.current = true;
    try {
      setMessage(null);
      await save(recordAttempt(state!, 'dont-know', assisted, input, day));
      announce("Here's the answer.");
    } finally {
      busy.current = false;
    }
  }

  async function next() {
    if (busy.current || !attempt) return;
    busy.current = true;
    try {
      const moved = continueRecall(state!);
      setInput('');
      setAssisted(false);
      setMessage(null);
      await save(moved);
      inputRef.current?.focus();
    } finally {
      busy.current = false;
    }
  }

  function announce(result: string) {
    const answer = entry.direction === 'en-ti' ? `${word.word}, ${word.pron}` : item.englishAnswers.join(', ');
    AccessibilityInfo.announceForAccessibility(`${result} The answer is ${answer}.`);
  }

  // A retry was queued if this word comes back later in the queue.
  const retryQueued = !!attempt && attempt.outcome !== 'correct' && !entry.retry && !attempt.assisted
    && a.queue.slice(a.index + 1).some(q => q.retry && q.wordId === entry.wordId && q.direction === entry.direction);
  const note = attempt?.outcome === 'correct' ? noteText(attempt.notes, word.pron) : null;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.top}>
          <View style={{ flex: 1 }}>
            <Text style={styles.progress}>Word {Math.max(1, firstTriesDone)} of {a.uniqueCount}</Text>
            {retriesWaiting > 0 && (
              <Text style={styles.retries}>{retriesWaiting} {retriesWaiting === 1 ? 'retry' : 'retries'} waiting</Text>
            )}
          </View>
          <Pressable onPress={() => router.dismissTo('/')} hitSlop={12} accessibilityRole="button"
                     accessibilityLabel="Close Free Recall">
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {entry.retry && <Text style={styles.retryTag}>Try again</Text>}
          {entry.direction === 'en-ti' ? (
            <View style={styles.prompt}>
              <Text style={styles.promptEn}>{item.prompt}</Text>
              <Text style={styles.type}>{TYPE_LABEL[word.type] ?? word.type.toLowerCase()}</Text>
              <Text style={styles.instruction}>Type the Tigrinya word</Text>
            </View>
          ) : (
            <View style={styles.prompt}>
              <Geez bold style={styles.promptTi}>{word.word}</Geez>
              {isAssisted
                ? <Text style={styles.pron}>{word.pron}</Text>
                : !attempt && (
                  <Pressable onPress={() => setAssisted(true)} accessibilityRole="button" hitSlop={8}>
                    <Text style={styles.link}>Show pronunciation</Text>
                  </Pressable>
                )}
              <Text style={styles.instruction}>Type the English meaning</Text>
            </View>
          )}

          <Text style={styles.label}>Your answer</Text>
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={t => { setInput(t); setMessage(null); }}
            editable={!attempt}
            style={styles.input}
            accessibilityLabel="Your answer"
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
            autoComplete="off"
            textContentType="none"
            importantForAutofill="no"
            returnKeyType="done"
            submitBehavior="submit"
            autoFocus
            onSubmitEditing={attempt ? next : check}
          />
          {message && <Text style={styles.message} accessibilityLiveRegion="polite">{message}</Text>}

          {!attempt ? (
            <>
              <Button label="Check answer" onPress={check} />
              <Button label="I don't know" kind="secondary" onPress={dontKnow} />
            </>
          ) : (
            <View accessibilityLiveRegion="polite"
                  style={[styles.feedback, { backgroundColor: attempt.outcome === 'correct' ? colors.correctBg : colors.wrongBg }]}>
              {!!attempt.input.trim() && <Text style={styles.yours}>Your answer: {attempt.input.trim()}</Text>}
              <Text style={[styles.result, { color: attempt.outcome === 'correct' ? colors.correct : colors.wrong }]}>
                {attempt.outcome === 'correct' ? `✓ ${note ?? 'Correct!'}`
                  : attempt.outcome === 'dont-know' ? "✗ Here's the answer" : '✗ Not quite'}
              </Text>
              {attempt.assisted && <Text style={styles.assisted}>Assisted</Text>}
              <Geez bold style={styles.answerTi}>{word.word}</Geez>
              <Text style={styles.answerRom}>{word.pron}</Text>
              {entry.direction === 'en-ti' && attempt.outcome !== 'correct' && item.romanAlternatives.length > 0 && (
                <Text style={styles.alts}>Also accepted: {item.romanAlternatives.join(', ')}</Text>
              )}
              {entry.direction === 'ti-en' && attempt.outcome !== 'correct'
                ? <Text style={styles.answerEn}>Accepted answers: {item.englishAnswers.join(', ')}</Text>
                : <Text style={styles.answerEn}>{word.meaning}</Text>}
              {retryQueued && <Text style={styles.retryNote}>This one will come back in a few words.</Text>}
              <Button label="Continue" onPress={next} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 12, borderBottomWidth: 1, borderColor: colors.line },
  progress: { fontSize: 18, fontWeight: '700', color: colors.text },
  retries: { fontSize: 14, color: colors.muted },
  close: { fontSize: 26, color: colors.muted },
  body: { padding: 16, gap: 12 },
  retryTag: { alignSelf: 'center', fontSize: 14, fontWeight: '700', color: colors.star, textTransform: 'uppercase' },
  prompt: { alignItems: 'center', gap: 6, paddingVertical: 12 },
  promptEn: { fontSize: 32, fontWeight: '700', color: colors.text, textAlign: 'center' },
  promptTi: { fontSize: 40, lineHeight: 58, color: colors.text, textAlign: 'center' },
  type: { fontSize: 15, color: colors.muted },
  pron: { fontSize: 20, color: colors.muted },
  link: { fontSize: 16, color: colors.primary, textDecorationLine: 'underline' },
  instruction: { fontSize: 17, color: colors.muted, marginTop: 4 },
  label: { fontSize: 15, fontWeight: '700', color: colors.text },
  input: {
    minHeight: 56, borderRadius: 14, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.card,
    paddingHorizontal: 14, fontSize: 24, color: colors.text,
  },
  message: { fontSize: 16, color: colors.wrong },
  feedback: { borderRadius: 18, padding: 16, gap: 6 },
  yours: { fontSize: 16, color: colors.text },
  result: { fontSize: 20, fontWeight: '700' },
  assisted: { fontSize: 14, fontWeight: '700', color: colors.muted, textTransform: 'uppercase' },
  answerTi: { fontSize: 32, lineHeight: 46, color: colors.text },
  answerRom: { fontSize: 18, color: colors.muted },
  alts: { fontSize: 15, color: colors.muted },
  answerEn: { fontSize: 18, color: colors.text },
  retryNote: { fontSize: 15, color: colors.text, fontStyle: 'italic' },
});
