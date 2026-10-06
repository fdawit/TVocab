import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, Button, ProgressBar, colors } from '../src/components/Screen';
import { Geez } from '../src/components/Geez';
import { CONVERSATIONS, WORDS, UNITS, WORD_BY_ID } from '../src/lib/data';
import { levelStats, needsPractice, wordsThisWeek } from '../src/lib/parent';
import { addDays, dayString } from '../src/lib/scheduler';
import type { Word } from '../src/lib/types';
import { useAppState } from '../src/lib/useAppState';
import { resetState } from '../src/lib/storage';
import type { Settings } from '../src/lib/types';

const ROMANIZATION: { value: Settings['romanization']; label: string }[] = [
  { value: 'auto', label: 'Auto' }, { value: 'always', label: 'Always' }, { value: 'tap', label: 'Tap' },
];

export default function Parent() {
  // Parent gate: a question a young child can't answer.
  const [gate] = useState(() => ({ a: 6 + Math.floor(Math.random() * 4), b: 6 + Math.floor(Math.random() * 4) }));
  const [typed, setTyped] = useState('');
  const [open, setOpen] = useState(false);
  const { state, update } = useAppState();

  if (!open) {
    const tryOpen = () => (Number(typed) === gate.a * gate.b ? setOpen(true) : setTyped(''));
    return (
      <Screen title="For parents">
        <Text style={styles.text}>Type the answer: {gate.a} × {gate.b}</Text>
        <TextInput value={typed} onChangeText={setTyped} keyboardType="number-pad" style={styles.input}
                   onSubmitEditing={tryOpen} accessibilityLabel="Answer" />
        <Button label="Open" onPress={tryOpen} />
      </Screen>
    );
  }
  if (!state) return <Screen title="Parents"><View /></Screen>;

  const set = (s: Partial<Settings>) => update({ ...state, settings: { ...state.settings, ...s } });

  function confirmReset() {
    const doReset = async () => { await resetState(); router.dismissTo('/'); };
    const msg = 'This deletes all progress on this phone. It cannot be undone.';
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(msg)) doReset();
      return;
    }
    Alert.alert('Reset progress?', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => Alert.alert('Are you sure?', 'All words and streaks will be lost.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, reset', style: 'destructive', onPress: doReset },
      ]) },
    ]);
  }

  const week = wordsThisWeek(WORDS, state, dayString());
  // Free Recall report from the per-word, per-direction records.
  const records = Object.entries(state.recall?.records ?? {});
  const sumOf = (f: (r: (typeof records)[number][1]) => number) => records.reduce((n, [, r]) => n + f(r), 0);
  const enTi = records.filter(([k]) => k.endsWith('|en-ti')).map(([, r]) => r);
  const tiEn = records.filter(([k]) => k.endsWith('|ti-en')).map(([, r]) => r);
  const enTiRight = { fidel: enTi.reduce((n, r) => n + (r.firstCorrect.fidel ?? 0), 0),
                      roman: enTi.reduce((n, r) => n + (r.firstCorrect.roman ?? 0), 0) };
  const enTiWrong = enTi.reduce((n, r) => n + r.firstWrong, 0);
  const tiEnRight = tiEn.reduce((n, r) => n + (r.firstCorrect.english ?? 0), 0);
  const tiEnWrong = tiEn.reduce((n, r) => n + r.firstWrong, 0);
  const weekAgo = addDays(dayString(), -6);
  const missedThisWeek = [...new Set(records.filter(([, r]) => (r.lastMissed ?? '') >= weekAgo)
    .map(([k]) => Number(k.split('|')[0])))].map(id => WORD_BY_ID.get(id)!).filter(Boolean);
  const practice = needsPractice(WORDS, state);

  return (
    <Screen title="Parents">
      <View style={styles.card}>
        <Text style={styles.heading}>Progress</Text>
        <Stat label="Streak" value={`${state.streak.count} day${state.streak.count === 1 ? '' : 's'}`} />
        <Stat label="Units finished" value={`${state.completedUnits.length} / ${UNITS.length}`} />
        <Stat label="Home sentences done" value={`${state.homeDone.length} / ${state.completedUnits.length}`} />
        <Stat label="Conversations" value={`${CONVERSATIONS.filter(c => state.conversations?.[c.id]).length} / ${CONVERSATIONS.length}`} />
        {CONVERSATIONS.filter(c => state.conversations?.[c.id]).map(c => (
          <Text key={c.id} style={styles.convLine}>
            {c.title} <Text style={{ color: colors.star }}>{'★'.repeat(state.conversations![c.id].stars)}</Text>
          </Text>
        ))}
        {([1, 2, 3] as const).map(level => {
          const s = levelStats(WORDS, state, level);
          return (
            <View key={level} style={{ gap: 4 }}>
              <Text style={styles.levelText}>Level {level}: {s.started} started · {s.mastered} mastered · of {s.total}</Text>
              <ProgressBar value={s.started / s.total} />
              <ProgressBar value={s.mastered / s.total} color={colors.correct} />
            </View>
          );
        })}
        <Text style={styles.hint}>Blue: started. Green: mastered (box 5 and used in a sentence).</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>This week's words</Text>
        <Text style={styles.hint}>Use these at home so they come up in real conversation.</Text>
        {week.length === 0 ? <Text style={styles.hint}>No new words in the last 7 days.</Text>
          : week.map(w => <WordRow key={w.id} w={w} />)}
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>Needs practice</Text>
        {practice.length === 0 ? <Text style={styles.hint}>No mistakes yet.</Text>
          : practice.map(w => <WordRow key={w.id} w={w} extra={`${state.progress[w.id].wrong}×`} />)}
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>Free Recall</Text>
        {records.length === 0 ? <Text style={styles.hint}>No typed practice yet.</Text> : (
          <>
            <Stat label="English → Tigrinya, first try"
                  value={`${enTiRight.fidel + enTiRight.roman} of ${enTiRight.fidel + enTiRight.roman + enTiWrong}`} />
            <Text style={styles.hint}>Right in Ge'ez: {enTiRight.fidel} · right in romanization: {enTiRight.roman}</Text>
            <Stat label="Tigrinya → English, first try" value={`${tiEnRight} of ${tiEnRight + tiEnWrong}`} />
            <Stat label="Missing popping mark notes" value={String(sumOf(r => r.noteMissingPop))} />
            <Stat label="Family spelling notes" value={String(sumOf(r => r.noteFamilySpelling))} />
            <Text style={styles.label}>Missed in the past week</Text>
            {missedThisWeek.length === 0 ? <Text style={styles.hint}>None.</Text>
              : missedThisWeek.map(w => <WordRow key={w.id} w={w} />)}
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>Settings</Text>
        <Text style={styles.label}>New words per day</Text>
        <Segmented options={[3, 5, 8].map(n => ({ value: n as Settings['newPerDay'], label: String(n) }))}
                   value={state.settings.newPerDay} onChange={v => set({ newPerDay: v })} />
        <Text style={styles.label}>Is the learner a boy or a girl?</Text>
        <Segmented options={[{ value: 'boy' as const, label: 'Boy' }, { value: 'girl' as const, label: 'Girl' }]}
                   value={state.settings.learner ?? 'boy'} onChange={v => set({ learner: v })} />
        <Text style={styles.label}>Free Recall</Text>
        <Segmented options={[{ value: 'auto' as const, label: 'Auto' }, { value: 'on' as const, label: 'On' },
                             { value: 'off' as const, label: 'Off' }]}
                   value={state.settings.freeRecall ?? 'auto'} onChange={v => set({ freeRecall: v })} />
        <Text style={styles.hint}>Auto shows Free Recall once every Level 1 unit is finished.</Text>
        <Text style={styles.label}>Romanization</Text>
        <Segmented options={ROMANIZATION} value={state.settings.romanization} onChange={v => set({ romanization: v })} />
        <Text style={styles.hint}>Changes apply from the next session.</Text>
      </View>
      <Button kind="secondary" label="Reset progress" onPress={confirmReset} />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function WordRow({ w, extra }: { w: Word; extra?: string }) {
  return (
    <View style={styles.wordRow}>
      <Geez style={styles.wordGeez}>{w.word}</Geez>
      <View style={{ flex: 1 }}>
        <Text style={styles.wordPron}>{w.pron}</Text>
        <Text style={styles.wordEn} numberOfLines={2}>{w.meaning}</Text>
      </View>
      {extra && <Text style={styles.wrong}>{extra}</Text>}
    </View>
  );
}

function Segmented<T extends string | number>({ options, value, onChange }:
  { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.segmented}>
      {options.map(o => (
        <Pressable key={String(o.value)} onPress={() => onChange(o.value)} accessibilityRole="button"
                   accessibilityState={{ selected: o.value === value }}
                   style={[styles.segment, o.value === value && styles.segmentOn]}>
          <Text style={[styles.segmentText, o.value === value && { color: '#FFFFFF' }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 22, color: colors.text },
  input: {
    minHeight: 56, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card,
    paddingHorizontal: 14, fontSize: 24, color: colors.text,
  },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.line },
  label: { fontSize: 14, color: colors.muted, textTransform: 'uppercase', fontWeight: '700' },
  hint: { fontSize: 14, color: colors.muted },
  heading: { fontSize: 20, fontWeight: '700', color: colors.text },
  stat: { flexDirection: 'row', justifyContent: 'space-between' },
  statLabel: { fontSize: 17, color: colors.muted },
  statValue: { fontSize: 17, fontWeight: '700', color: colors.text },
  levelText: { fontSize: 15, color: colors.text },
  convLine: { fontSize: 16, color: colors.text, paddingLeft: 12 },
  wordRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  wordGeez: { fontSize: 24, lineHeight: 36, color: colors.text, minWidth: 80 },
  wordPron: { fontSize: 15, color: colors.muted },
  wordEn: { fontSize: 16, color: colors.text },
  wrong: { fontSize: 15, fontWeight: '700', color: colors.wrong },
  segmented: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText: { fontSize: 18, color: colors.text },
});
