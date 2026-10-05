import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, Button, ProgressBar, colors } from '../src/components/Screen';
import { Geez } from '../src/components/Geez';
import { WORDS, UNITS } from '../src/lib/data';
import { buildSession, currentUnit } from '../src/lib/session';
import { dayString } from '../src/lib/scheduler';
import { useAppState } from '../src/lib/useAppState';

export default function Home() {
  const { state } = useAppState();

  // Today's counts, from the same builder the session uses.
  const today = useMemo(() => {
    if (!state) return null;
    const steps = buildSession(WORDS, UNITS, state, dayString());
    const fresh = steps.filter(s => s.kind === 'intro').length;
    return { fresh, reviews: steps.length - fresh * 3, empty: steps.length === 0 };
  }, [state]);

  if (!state || !today) return <Screen back={false}><View /></Screen>;
  const unit = currentUnit(UNITS, state);
  const levels = ([1, 2, 3] as const).map(level => {
    const inLevel = WORDS.filter(w => w.active && w.level === level);
    const started = inLevel.filter(w => state.progress[w.id]).length;
    return { level, started, total: inLevel.length };
  });

  return (
    <Screen back={false}>
      <Geez bold style={styles.hello}>ሰላም!</Geez>
      <Text style={styles.streak}>🔥 {state.streak.count} day{state.streak.count === 1 ? '' : 's'} in a row</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Current unit</Text>
        <Text style={styles.unit}>{unit ? `${unit.id}. ${unit.title}` : 'All units finished!'}</Text>
        <Button label={today.empty ? 'All done for today!' : 'Start'} disabled={today.empty}
                onPress={() => router.push('/session')} />
        {!today.empty && <Text style={styles.counts}>{today.fresh} new · {today.reviews} reviews</Text>}
      </View>

      <View style={styles.card}>
        {levels.map(l => (
          <View key={l.level} style={{ gap: 4 }}>
            <Text style={styles.levelText}>Level {l.level}: {l.started} / {l.total} words</Text>
            <ProgressBar value={l.started / l.total} />
          </View>
        ))}
      </View>

      <View style={styles.links}>
        <Button kind="secondary" label="Units" onPress={() => router.push('/units')} />
        <Button kind="secondary" label="Word Bank" onPress={() => router.push('/bank')} />
        <Button kind="secondary" label="Sounds" onPress={() => router.push('/sounds')} />
      </View>
      <Pressable onPress={() => router.push('/parent')} accessibilityRole="button" style={styles.parent}>
        <Text style={styles.parentText}>Parents</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hello: { fontSize: 44, lineHeight: 64, color: colors.text, textAlign: 'center', marginTop: 8 },
  streak: { fontSize: 18, color: colors.muted, textAlign: 'center' },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.line },
  label: { fontSize: 14, color: colors.muted, textTransform: 'uppercase', fontWeight: '700' },
  unit: { fontSize: 22, fontWeight: '700', color: colors.text },
  counts: { fontSize: 17, color: colors.muted, textAlign: 'center' },
  levelText: { fontSize: 16, color: colors.text },
  links: { gap: 12 },
  parent: { alignSelf: 'center', padding: 12 },
  parentText: { fontSize: 16, color: colors.muted, textDecorationLine: 'underline' },
});
