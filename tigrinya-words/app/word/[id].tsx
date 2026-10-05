import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen, colors } from '../../src/components/Screen';
import { WordCard } from '../../src/components/WordCard';
import { WORD_BY_ID } from '../../src/lib/data';
import { useAppState } from '../../src/lib/useAppState';

export default function WordDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useAppState();
  const w = WORD_BY_ID.get(Number(id));
  if (!w) return <Screen><Text>Word not found.</Text></Screen>;
  // A variant points at its main word; show that word's progress.
  const p = state?.progress[w.mainId ?? w.id];

  return (
    <Screen>
      <WordCard word={w}>
        {w.alsoWritten.length > 0 && <Info label="Also written" value={w.alsoWritten.join(', ')} />}
        {w.mainId && <Info label="Main spelling" value={WORD_BY_ID.get(w.mainId)?.word ?? ''} />}
        <Info label="Level · topic" value={`Level ${w.level} · ${w.topic}`} />
        <Info label="Box" value={p ? `${p.box} of 7` : w.active ? 'Not started yet' : 'Word Bank only'} />
      </WordCard>
    </Screen>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  info: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  label: { fontSize: 16, color: colors.muted },
  value: { fontSize: 16, color: colors.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
});
