import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, colors } from '../src/components/Screen';
import { Geez } from '../src/components/Geez';
import { UNITS, WORD_BY_ID } from '../src/lib/data';
import { currentUnit } from '../src/lib/session';
import { useAppState } from '../src/lib/useAppState';

export default function Units() {
  const { state } = useAppState();
  const [open, setOpen] = useState<number | null>(null);
  if (!state) return <Screen title="Units"><View /></Screen>;
  const current = currentUnit(UNITS, state)?.id;

  return (
    <Screen title="Units">
      {([1, 2, 3] as const).map(level => (
        <View key={level} style={{ gap: 8 }}>
          <Text style={styles.level}>Level {level}</Text>
          {UNITS.filter(u => u.level === level).map(u => {
            const done = state.completedUnits.includes(u.id);
            const isCurrent = u.id === current;
            const reachable = done || isCurrent;
            return (
              <View key={u.id} style={[styles.unit, !reachable && { opacity: 0.5 }]}>
                <Pressable disabled={!reachable} onPress={() => setOpen(open === u.id ? null : u.id)}
                           accessibilityRole="button" style={styles.row}>
                  <Text style={styles.icon}>{done ? '✅' : isCurrent ? '⭐' : '🔒'}</Text>
                  <Text style={styles.title}>{u.id}. {u.title}</Text>
                  <Text style={styles.count}>{u.wordIds.length}</Text>
                </Pressable>
                {open === u.id && (
                  <View style={styles.words}>
                    {u.wordIds.map(id => {
                      const w = WORD_BY_ID.get(id)!;
                      return (
                        <Pressable key={id} accessibilityRole="button" style={styles.word}
                                   onPress={() => router.push({ pathname: '/word/[id]', params: { id: String(id) } })}>
                          <Geez style={styles.geez}>{w.word}</Geez>
                          <Text style={styles.meaning} numberOfLines={1}>{w.meaning.split(';')[0]}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  level: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 8 },
  unit: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 14 },
  icon: { fontSize: 20 },
  title: { flex: 1, fontSize: 18, color: colors.text },
  count: { fontSize: 15, color: colors.muted },
  words: { borderTopWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingBottom: 8 },
  word: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  geez: { fontSize: 24, lineHeight: 36, color: colors.text },
  meaning: { flex: 1, fontSize: 17, color: colors.muted },
});
