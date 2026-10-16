import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, colors } from '../src/components/Screen';
import { Geez } from '../src/components/Geez';
import { WORDS } from '../src/lib/data';

const TOPICS = [...new Set(WORDS.map(w => w.topic))].sort();
// Romanization is hyphenated by syllable ("se-lam"), so search ignores hyphens and apostrophes.
const plain = (s: string) => s.toLowerCase().replace(/[-'’]/g, '');

export default function Bank() {
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<number | null>(null);
  const [topic, setTopic] = useState<string | null>(null);

  const results = useMemo(() => {
    const q = query.trim();
    const qp = plain(q);
    return WORDS.filter(w =>
      (level === null || w.level === level) &&
      (topic === null || w.topic === topic) &&
      (!q || w.word.includes(q) || w.alsoWritten.some(a => a.includes(q)) ||
        w.meaning.toLowerCase().includes(q.toLowerCase()) || plain(w.pron).includes(qp)));
  }, [query, level, topic]);

  return (
    <Screen title="Word Bank" scroll={false}>
      <TextInput value={query} onChangeText={setQuery} placeholder="Search English, ትግርኛ or romanization"
                 placeholderTextColor={colors.muted} style={styles.search} autoCorrect={false}
                 autoCapitalize="none" clearButtonMode="while-editing" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}
                  contentContainerStyle={styles.chips}>
        {[null, 1, 2, 3, 4].map(l => (
          <Chip key={String(l)} label={l === null ? 'All levels' : `Level ${l}`} on={level === l} onPress={() => setLevel(l)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}
                  contentContainerStyle={styles.chips}>
        <Chip label="All topics" on={topic === null} onPress={() => setTopic(null)} />
        {TOPICS.map(t => <Chip key={t} label={t} on={topic === t} onPress={() => setTopic(t)} />)}
      </ScrollView>
      <Text style={styles.count}>{results.length} words</Text>
      <FlatList
        data={results}
        keyExtractor={w => String(w.id)}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={20}
        renderItem={({ item: w }) => (
          <Pressable accessibilityRole="button" style={styles.row}
                     onPress={() => router.push({ pathname: '/word/[id]', params: { id: String(w.id) } })}>
            <Geez style={styles.geez}>{w.word}</Geez>
            <View style={{ flex: 1 }}>
              <Text style={styles.meaning} numberOfLines={1}>{w.meaning}</Text>
              <Text style={styles.pron}>{w.pron} · L{w.level}</Text>
            </View>
          </Pressable>
        )}
      />
    </Screen>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }}
               style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipText, on && { color: '#FFFFFF' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  search: {
    minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card,
    paddingHorizontal: 14, fontSize: 18, color: colors.text,
  },
  // Horizontal ScrollViews shrink by default; with 1,000 words below they were squeezed and clipped.
  // Full-bleed rows (past the 16pt page padding) make it clear they scroll sideways.
  chipsRow: { flexGrow: 0, flexShrink: 0, marginHorizontal: -16 },
  chips: { gap: 8, paddingHorizontal: 16 },
  chip: { paddingHorizontal: 14, minHeight: 40, justifyContent: 'center', borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 15, color: colors.text },
  count: { fontSize: 14, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60, borderBottomWidth: 1, borderColor: colors.line },
  geez: { fontSize: 26, lineHeight: 38, color: colors.text, minWidth: 90 },
  meaning: { fontSize: 17, color: colors.text },
  pron: { fontSize: 14, color: colors.muted },
});
