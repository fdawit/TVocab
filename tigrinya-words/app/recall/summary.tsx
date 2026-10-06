import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, Button, colors } from '../../src/components/Screen';
import { Geez } from '../../src/components/Geez';
import { RECALL, WORDS, WORD_BY_ID } from '../../src/lib/data';
import { shuffle } from '../../src/lib/exercises';
import {
  DEFAULT_RECALL_SETTINGS, finishRecall, selectSession, startRecall, type RecallSummary,
} from '../../src/lib/recallSession';
import { dayString } from '../../src/lib/scheduler';
import { loadState, saveState } from '../../src/lib/storage';

export default function RecallSummaryScreen() {
  const day = useRef(dayString()).current;
  const [summary, setSummary] = useState<RecallSummary | null>(null);

  // Count the day toward the streak, clear the saved session, keep the results to show.
  useEffect(() => {
    loadState().then(async s => {
      const { state, summary } = finishRecall(s, day);
      if (!summary) { router.replace('/recall'); return; }
      await saveState(state);
      setSummary(summary);
    });
  }, [day]);

  if (!summary) return <Screen back={false}><View /></Screen>;
  const ft = summary.firstTry;

  async function practiceMissed() {
    const s = await loadState();
    await saveState(startRecall(s, shuffle(summary!.stillNeedsPractice), day));
    router.replace('/recall/session');
  }

  async function practiceAgain() {
    const s = await loadState();
    const { queue, notice } = selectSession(RECALL, WORDS, s, s.recall?.settings ?? DEFAULT_RECALL_SETTINGS, day);
    if (queue.length === 0) { router.replace('/recall'); return; }
    await saveState(startRecall(s, queue, day, notice));
    router.replace('/recall/session');
  }

  return (
    <Screen title="Free Recall" back={false}>
      <Geez bold style={styles.big}>ጽቡቕ!</Geez>
      <View style={styles.card}>
        <Row label="Words practiced" value={String(summary.unique)} />
        <Row label="First try" value={ft ? `${ft.correct} of ${ft.total} (${Math.round((ft.correct / ft.total) * 100)}%)` : '–'} />
        <Row label="Assisted" value={String(summary.assisted)} />
        <Row label="Got it on the retry" value={String(summary.recoveredOnRetry)} />
      </View>
      {summary.stillNeedsPractice.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.heading}>Still needs practice</Text>
          {summary.stillNeedsPractice.map(e => {
            const w = WORD_BY_ID.get(e.wordId)!;
            return (
              <View key={`${e.wordId}|${e.direction}`} style={styles.wordRow}>
                <Geez style={styles.wordTi}>{w.word}</Geez>
                <View style={{ flex: 1 }}>
                  <Text style={styles.wordRom}>{w.pron}</Text>
                  <Text style={styles.wordEn}>{w.meaning}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
      {summary.canPracticeMissed && <Button label="Practice missed words" onPress={practiceMissed} />}
      <Button label="Practice again" kind={summary.canPracticeMissed ? 'secondary' : 'primary'} onPress={practiceAgain} />
      <Button label="Back home" kind="secondary" onPress={() => router.dismissTo('/')} />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  big: { fontSize: 40, lineHeight: 58, color: colors.correct, textAlign: 'center' },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.line },
  heading: { fontSize: 20, fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontSize: 18, color: colors.muted },
  rowValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  wordRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  wordTi: { fontSize: 24, lineHeight: 36, color: colors.text, minWidth: 80 },
  wordRom: { fontSize: 15, color: colors.muted },
  wordEn: { fontSize: 16, color: colors.text },
});
