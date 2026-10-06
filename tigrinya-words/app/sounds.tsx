import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, Button, colors } from '../src/components/Screen';
import { Geez } from '../src/components/Geez';
import soundsJson from '../src/data/sounds.json';
import { WORDS } from '../src/lib/data';
import { letterChart } from '../src/lib/letters';
import { loadState, markSoundsSeen, saveState } from '../src/lib/storage';
import { useAppState } from '../src/lib/useAppState';

interface SoundCard { section: string; symbol: string; sayLike: string; letters: string; example: string; exampleMeaning: string }
const SOUNDS = soundsJson as SoundCard[];
// Every letter that appears in the app's words, built once.
const CHART = letterChart(WORDS.map(w => w.word + (w.exTi ?? '')).join(''));

export default function Sounds() {
  const { first } = useLocalSearchParams<{ first?: string }>();
  const firstLaunch = first === '1';
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width, 600) - 32;
  const [page, setPage] = useState(0);
  const [letter, setLetter] = useState<string | null>(null);
  const [askLearner, setAskLearner] = useState(false);
  const { state } = useAppState();

  const started = useMemo(() => WORDS.filter(w => state?.progress[w.id]), [state]);
  const startedText = useMemo(() => new Set([...started.map(w => w.word).join('')]), [started]);

  // After the sound lesson, ask once how conversation characters should address the child.
  async function finishLesson(learner: 'boy' | 'girl') {
    const saved = await loadState();
    await saveState({ ...saved, settings: { ...saved.settings, learner } });
    await markSoundsSeen();
    router.dismissTo('/');
  }

  if (askLearner) {
    return (
      <Screen title="One question" back={false}>
        <Text style={styles.question}>Is the learner a boy or a girl?</Text>
        <Text style={styles.hint}>Characters in the chats talk to boys and girls a little differently. Parents can change this later.</Text>
        <Button label="Boy" onPress={() => finishLesson('boy')} />
        <Button label="Girl" onPress={() => finishLesson('girl')} />
      </Screen>
    );
  }

  const card = SOUNDS[page];
  return (
    <Screen title={firstLaunch ? 'Tigrinya sounds' : 'Sounds'} back={!firstLaunch}>
      {firstLaunch && <Text style={styles.text}>Before your first lesson, meet the sounds of Tigrinya. Swipe through the cards.</Text>}
      <Text style={styles.section}>{card.section} · {page + 1} / {SOUNDS.length}</Text>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                  snapToInterval={cardWidth} decelerationRate="fast"
                  onMomentumScrollEnd={e => setPage(Math.round(e.nativeEvent.contentOffset.x / cardWidth))}
                  onScroll={e => setPage(Math.min(SOUNDS.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / cardWidth))))}
                  scrollEventThrottle={64}>
        {SOUNDS.map((s, i) => (
          <View key={i} style={[styles.card, { width: cardWidth }]}>
            <Text style={styles.symbol}>{s.symbol}</Text>
            <Text style={styles.sayLike}>{s.sayLike}</Text>
            {!!s.letters && <Geez style={styles.letters}>{s.letters}</Geez>}
            {!!s.example && <Text style={styles.example}>{s.example}</Text>}
            {!!s.exampleMeaning && <Text style={styles.meaning}>{s.exampleMeaning}</Text>}
          </View>
        ))}
      </ScrollView>
      {firstLaunch && (
        <Button label={page === SOUNDS.length - 1 ? "Let's start!" : 'Skip to the first lesson'} onPress={() => setAskLearner(true)}
                kind={page === SOUNDS.length - 1 ? 'primary' : 'secondary'} />
      )}

      {!firstLaunch && (
        <>
          <Text style={styles.heading}>Letter chart</Text>
          <Text style={styles.hint}>Letters from words you have started are in color. Tap a letter to see your words with it.</Text>
          {CHART.map(row => (
            <View key={row.consonant + row.letters[0].char} style={styles.row}>
              <Text style={styles.consonant}>{row.consonant}</Text>
              {row.letters.map(l => {
                const known = startedText.has(l.char);
                return (
                  <Pressable key={l.char} onPress={() => setLetter(letter === l.char ? null : l.char)}
                             accessibilityRole="button" accessibilityLabel={`${l.char} ${l.sound}`}
                             style={[styles.letter, known && styles.letterKnown, letter === l.char && styles.letterOn]}>
                    <Geez style={[styles.letterChar, !known && { color: '#A8A29E' }]}>{l.char}</Geez>
                    <Text style={styles.letterSound}>{l.sound}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
          {letter && (
            <View style={styles.found}>
              <Geez bold style={styles.foundTitle}>{letter}</Geez>
              {started.filter(w => w.word.includes(letter)).length === 0
                ? <Text style={styles.hint}>None of your words use this letter yet.</Text>
                : started.filter(w => w.word.includes(letter)).map(w => (
                  <Pressable key={w.id} onPress={() => router.push({ pathname: '/word/[id]', params: { id: String(w.id) } })}
                             accessibilityRole="button" style={styles.foundRow}>
                    <Geez style={styles.foundWord}>{w.word}</Geez>
                    <Text style={styles.foundMeaning} numberOfLines={1}>{w.pron} · {w.meaning.split(';')[0]}</Text>
                  </Pressable>
                ))}
            </View>
          )}
          <Text style={styles.note}>።  is a full stop and ፡  is an old word separator. They are punctuation, not letters.</Text>
          <Text style={styles.note}>The sixth form (ህ, ብ, ስ…) is often silent at the end of a word: ኣብ is "ab", not "abi".</Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 18, color: colors.text },
  question: { fontSize: 24, fontWeight: '700', color: colors.text },
  section: { fontSize: 14, color: colors.muted, textTransform: 'uppercase', fontWeight: '700' },
  card: {
    backgroundColor: colors.card, borderRadius: 18, padding: 20, gap: 10, borderWidth: 1, borderColor: colors.line,
    alignItems: 'center', justifyContent: 'center', minHeight: 300,
  },
  symbol: { fontSize: 48, fontWeight: '700', color: colors.text, textAlign: 'center' },
  sayLike: { fontSize: 20, color: colors.text, textAlign: 'center' },
  letters: { fontSize: 36, lineHeight: 52, color: colors.primary, textAlign: 'center' },
  example: { fontSize: 22, color: colors.text, textAlign: 'center' },
  meaning: { fontSize: 18, color: colors.muted, textAlign: 'center' },
  heading: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 12 },
  hint: { fontSize: 16, color: colors.muted },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  consonant: { width: 30, fontSize: 14, fontWeight: '700', color: colors.muted },
  letter: { width: 40, alignItems: 'center', borderRadius: 8, paddingVertical: 2, backgroundColor: '#F5F5F4' },
  letterKnown: { backgroundColor: '#DBEAFE' },
  letterOn: { borderWidth: 2, borderColor: colors.primary },
  letterChar: { fontSize: 22, lineHeight: 32, color: colors.text },
  letterSound: { fontSize: 11, color: colors.muted },
  found: { backgroundColor: colors.card, borderRadius: 14, padding: 12, gap: 6, borderWidth: 1, borderColor: colors.line },
  foundTitle: { fontSize: 30, lineHeight: 44, color: colors.text },
  foundRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  foundWord: { fontSize: 22, lineHeight: 32, color: colors.text },
  foundMeaning: { flex: 1, fontSize: 16, color: colors.muted },
  note: { fontSize: 16, color: colors.text },
});
