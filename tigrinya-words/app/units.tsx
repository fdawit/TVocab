import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, colors } from '../src/components/Screen';
import { Geez } from '../src/components/Geez';
import { CONVERSATIONS, UNITS, WORD_BY_ID } from '../src/lib/data';
import { conversationStatus, conversationsAfterUnit, type Conversation } from '../src/lib/conversations';
import type { AppState } from '../src/lib/types';
import { currentUnit } from '../src/lib/session';
import { useAppState } from '../src/lib/useAppState';

const CHATS_AFTER = conversationsAfterUnit(CONVERSATIONS, UNITS);

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
              <View key={u.id} style={{ gap: 8 }}>
                <View style={[styles.unit, !reachable && { opacity: 0.5 }]}>
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
                {CHATS_AFTER.get(u.id)!.map(c => <ChatNode key={c.id} conv={c} state={state} />)}
              </View>
            );
          })}
        </View>
      ))}
    </Screen>
  );
}

/** A conversation on the map. Hidden until its unit is finished. */
function ChatNode({ conv, state }: { conv: Conversation; state: AppState }) {
  const status = conversationStatus(conv, state);
  if (status.kind === 'hidden') return null;
  const waiting = status.kind === 'waiting';
  return (
    <Pressable disabled={waiting} accessibilityRole="button"
               onPress={() => router.push({ pathname: '/conversation/[id]', params: { id: conv.id } })}
               style={[styles.chat, waiting ? styles.chatWaiting : styles.chatOpen]}>
      <Text style={styles.icon}>💬</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, waiting && { color: colors.muted }]}>{conv.title}</Text>
        <Text style={styles.chatSub}>
          {waiting
            ? `Almost ready: ${status.wordsLeft} word${status.wordsLeft === 1 ? '' : 's'} to go`
            : `Chat with ${conv.character.en}`}
        </Text>
      </View>
      {status.kind === 'done' && <Text style={styles.stars}>{'★'.repeat(status.stars)}{'☆'.repeat(3 - status.stars)}</Text>}
    </Pressable>
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
  chat: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 14, borderRadius: 14, marginLeft: 24, borderWidth: 2 },
  chatWaiting: { backgroundColor: '#F5F5F4', borderColor: colors.line, borderStyle: 'dashed' },
  chatOpen: { backgroundColor: '#DBEAFE', borderColor: colors.primary },
  chatSub: { fontSize: 14, color: colors.muted },
  stars: { fontSize: 18, color: colors.star },
});
