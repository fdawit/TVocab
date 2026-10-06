import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, Button, colors } from '../../src/components/Screen';
import { RECALL, WORDS } from '../../src/lib/data';
import {
  DEFAULT_RECALL_SETTINGS, resumable, selectSession, startRecall, type RecallSettings,
} from '../../src/lib/recallSession';
import { dayString } from '../../src/lib/scheduler';
import { useAppState } from '../../src/lib/useAppState';

const DIRECTIONS: { value: RecallSettings['direction']; label: string }[] = [
  { value: 'en-ti', label: 'English → Tigrinya' },
  { value: 'ti-en', label: 'Tigrinya → English' },
  { value: 'mixed', label: 'Mixed' },
];
const FORMATS: { value: RecallSettings['format']; label: string }[] = [
  { value: 'fidel-or-roman', label: 'Fidel or romanization' },
  { value: 'fidel-only', label: 'Fidel only' },
];
const LENGTHS: RecallSettings['length'][] = [10, 20, 30];

export default function RecallSetup() {
  const { state, update } = useAppState();
  const day = dayString();
  const settings = state?.recall?.settings ?? DEFAULT_RECALL_SETTINGS;
  // Preview with a fixed shuffle: only the notice and the word count matter here.
  const preview = useMemo(
    () => (state ? selectSession(RECALL, WORDS, state, settings, day, () => 0.5) : null),
    [state, settings, day]);
  if (!state || !preview) return <Screen title="Free Recall"><View /></Screen>;
  const resume = resumable(state, day);

  const set = (s: Partial<RecallSettings>) =>
    update({ ...state, recall: { records: {}, ...state.recall, settings: { ...settings, ...s } } });

  async function start() {
    const { queue, notice } = selectSession(RECALL, WORDS, state!, settings, day);
    if (queue.length === 0) return;
    await update(startRecall(state!, queue, day, notice));
    router.push('/recall/session');
  }

  if (preview.queue.length === 0) {
    return (
      <Screen title="Free Recall">
        <Text style={styles.text}>{preview.notice}</Text>
        <Button label="Back to lessons" onPress={() => router.dismissTo('/')} />
      </Screen>
    );
  }

  return (
    <Screen title="Free Recall">
      <Text style={styles.text}>Remember the word. Type it yourself.</Text>
      <Text style={styles.label}>Direction</Text>
      <Choices options={DIRECTIONS} value={settings.direction} onChange={v => set({ direction: v })} />
      {settings.direction !== 'ti-en' && (
        <>
          <Text style={styles.label}>Answer format</Text>
          <Choices options={FORMATS} value={settings.format} onChange={v => set({ format: v })} />
        </>
      )}
      <Text style={styles.label}>Length</Text>
      <Choices options={LENGTHS.map(n => ({ value: n, label: `${n} words` }))} value={settings.length}
               onChange={v => set({ length: v })} />
      <Text style={styles.hint}>Counts different words. Missed words may come back for another try.</Text>
      {preview.notice && <View style={styles.notice}><Text style={styles.noticeText}>{preview.notice}</Text></View>}
      {resume && (
        <Button label="Continue where you left off" kind="secondary" onPress={() => router.push('/recall/session')} />
      )}
      <Button label="Start" onPress={start} />
    </Screen>
  );
}

function Choices<T extends string | number>({ options, value, onChange }:
  { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.choices}>
      {options.map(o => (
        <Pressable key={String(o.value)} onPress={() => onChange(o.value)} accessibilityRole="radio"
                   accessibilityState={{ selected: o.value === value }}
                   style={[styles.choice, o.value === value && styles.choiceOn]}>
          <Text style={[styles.choiceText, o.value === value && { color: '#FFFFFF' }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 19, color: colors.text },
  label: { fontSize: 14, color: colors.muted, textTransform: 'uppercase', fontWeight: '700', marginTop: 8 },
  hint: { fontSize: 15, color: colors.muted },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minHeight: 48, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.line,
            backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', flexGrow: 1 },
  choiceOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceText: { fontSize: 17, color: colors.text },
  notice: { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12 },
  noticeText: { fontSize: 16, color: colors.text },
});
