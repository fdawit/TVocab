import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, Button, colors } from '../src/components/Screen';
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
    const doReset = async () => { await resetState(); router.replace('/'); };
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

  return (
    <Screen title="Parents">
      {/* Progress, this week's words and words that need practice are added in Step 10. */}
      <View style={styles.card}>
        <Text style={styles.label}>New words per day</Text>
        <Segmented options={[3, 5, 8].map(n => ({ value: n as Settings['newPerDay'], label: String(n) }))}
                   value={state.settings.newPerDay} onChange={v => set({ newPerDay: v })} />
        <Text style={styles.label}>Romanization</Text>
        <Segmented options={ROMANIZATION} value={state.settings.romanization} onChange={v => set({ romanization: v })} />
        <Text style={styles.hint}>Changes apply from the next session.</Text>
      </View>
      <Button kind="secondary" label="Reset progress" onPress={confirmReset} />
    </Screen>
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
  segmented: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText: { fontSize: 18, color: colors.text },
});
