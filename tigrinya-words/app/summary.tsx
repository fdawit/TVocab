import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, Button, colors } from '../src/components/Screen';
import { Geez } from '../src/components/Geez';
import { UNITS } from '../src/lib/data';
import { useAppState } from '../src/lib/useAppState';

export default function Summary() {
  const p = useLocalSearchParams<{ correct?: string; graded?: string; met?: string; finished?: string }>();
  const { state } = useAppState();
  const finished = (p.finished ?? '').split(',').filter(Boolean).map(Number);
  const units = finished.map(id => UNITS.find(u => u.id === id)).filter(u => u !== undefined);

  return (
    <Screen back={false}>
      <Geez bold style={styles.big}>ብሉጽ!</Geez>
      <Text style={styles.center}>Session finished</Text>
      <View style={styles.card}>
        <Row label="Answers correct" value={`${p.correct ?? 0} / ${p.graded ?? 0}`} />
        <Row label="Words met today" value={p.met ?? '0'} />
        <Row label="Streak" value={`${state?.streak.count ?? 0} day${state?.streak.count === 1 ? '' : 's'}`} />
      </View>
      {units.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.label}>Units finished</Text>
          {units.map(u => <Text key={u.id} style={styles.unit}>✓ {u.id}. {u.title}</Text>)}
        </View>
      )}
      {units.length > 0
        ? <Button label="Say it at home" onPress={() => router.replace({
            pathname: '/home-card/[unitId]',
            params: { unitId: String(finished[0]), next: finished.slice(1).join(',') },
          })} />
        : null}
      <Button kind={units.length ? 'secondary' : 'primary'} label="Back to Home" onPress={() => router.dismissTo('/')} />
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
  big: { fontSize: 40, lineHeight: 58, color: colors.correct, textAlign: 'center', marginTop: 12 },
  center: { fontSize: 20, color: colors.text, textAlign: 'center' },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.line },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontSize: 18, color: colors.muted },
  rowValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  label: { fontSize: 14, color: colors.muted, textTransform: 'uppercase', fontWeight: '700' },
  unit: { fontSize: 18, color: colors.correct, fontWeight: '600' },
});
