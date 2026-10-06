import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, colors } from '../../src/components/Screen';
import { Geez } from '../../src/components/Geez';
import { CONVERSATIONS } from '../../src/lib/data';
import {
  conversationStatus, finishConversation, forLearner, recordReply, replyOptions,
  type Conversation, type Learner, type Line, type ReplyOption,
} from '../../src/lib/conversations';
import { dayString } from '../../src/lib/scheduler';
import { loadState, saveState } from '../../src/lib/storage';
import type { AppState } from '../../src/lib/types';

const TYPING_MS = 700;   // typing dots before each character line
const GREEN_MS = 400;    // a right pick stays green this long before it becomes a bubble

type Bubble = { from: 'them' | 'me'; line: Line };
type Phase = 'loading' | 'locked' | 'warmup' | 'chat' | 'end';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conv = CONVERSATIONS.find(c => c.id === id);
  const day = useRef(dayString()).current;
  const stateRef = useRef<AppState | null>(null);
  const [learner, setLearner] = useState<Learner>('boy');
  const [phase, setPhase] = useState<Phase>('loading');
  const [play, setPlay] = useState(0);   // bumps on "Play again"

  useEffect(() => {
    if (!conv) return;
    loadState().then(state => {
      stateRef.current = state;
      setLearner(state.settings.learner ?? 'boy');
      const status = conversationStatus(conv, state).kind;
      setPhase(status === 'open' || status === 'done' ? (conv.glossary.length ? 'warmup' : 'chat') : 'locked');
    });
  }, [conv]);

  if (!conv) return <Frame title="Chat"><Text style={styles.center}>Conversation not found.</Text></Frame>;
  const replyTurns = conv.turns.filter(t => t.reply).length;

  if (phase === 'loading') return <Frame conv={conv}><View /></Frame>;
  if (phase === 'locked') {
    return (
      <Frame conv={conv}>
        <Text style={styles.center}>This chat opens once you know all of its words. Keep doing your daily lessons!</Text>
      </Frame>
    );
  }
  if (phase === 'warmup') {
    return (
      <Frame conv={conv}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>New words in this chat</Text>
          {conv.glossary.map(g => (
            <View key={g.ti} style={styles.glossRow}>
              <Geez bold style={styles.glossTi}>{g.ti}</Geez>
              <View style={{ flex: 1 }}>
                <Text style={styles.glossRom}>{g.rom}</Text>
                <Text style={styles.glossEn}>{g.en}</Text>
              </View>
            </View>
          ))}
        </View>
        <Button label="Start chat" onPress={() => setPhase('chat')} />
      </Frame>
    );
  }
  return (
    <Chat key={play} conv={conv} learner={learner} stateRef={stateRef} day={day} replyTurns={replyTurns}
          onPlayAgain={() => setPlay(p => p + 1)} />
  );
}

function Chat({ conv, learner, stateRef, day, replyTurns, onPlayAgain }: {
  conv: Conversation; learner: Learner; stateRef: React.MutableRefObject<AppState | null>; day: string;
  replyTurns: number; onPlayAgain: () => void;
}) {
  const [turn, setTurn] = useState(0);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [typing, setTyping] = useState(false);
  const [options, setOptions] = useState<ReplyOption[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);     // Ge'ez of wrong picks this turn
  const [hint, setHint] = useState<string | null>(null);
  const [green, setGreen] = useState<string | null>(null);
  const [showSounds, setShowSounds] = useState(false);
  const [repliesDone, setRepliesDone] = useState(0);
  const [stars, setStars] = useState<1 | 2 | 3 | null>(null);
  const mistakes = useRef(0);
  const finished = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const tier = conv.tier;

  // Play each turn: a character line after typing dots, or a set of reply buttons.
  useEffect(() => {
    if (turn >= conv.turns.length) {
      if (finished.current) return;
      finished.current = true;
      const state = finishConversation(stateRef.current!, conv, mistakes.current, day);
      stateRef.current = state;
      saveState(state);
      // Show this play's stars; finishConversation keeps the best result across plays.
      setStars(mistakes.current === 0 ? 3 : mistakes.current === 1 ? 2 : 1);
      return;
    }
    const t = conv.turns[turn];
    if (t.them) {
      setTyping(true);
      const timer = setTimeout(() => {
        setTyping(false);
        setBubbles(b => [...b, { from: 'them', line: forLearner(t.them!, learner) }]);
        setTurn(n => n + 1);
      }, TYPING_MS);
      return () => clearTimeout(timer);
    }
    setOptions(replyOptions(t, learner));
    setWrong([]);
    setHint(null);
    setShowSounds(false);
  }, [turn, conv, learner, day, stateRef]);

  useEffect(() => { setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50); }, [bubbles, typing, options, hint]);

  const current = conv.turns[turn];
  const replying = !!current?.reply && !green && stars === null;

  async function pick(o: ReplyOption) {
    if (green || wrong.includes(o.ti)) return;
    if (!o.correct) {
      mistakes.current++;
      setWrong(w => [...w, o.ti]);
      setHint(o.why ?? null);
      return;
    }
    const firstTry = wrong.length === 0;
    const state = recordReply(stateRef.current!, current, firstTry, day);
    stateRef.current = state;
    await saveState(state);
    setGreen(o.ti);
    setTimeout(() => {
      setGreen(null);
      setHint(null);
      setOptions([]);
      setBubbles(b => [...b, { from: 'me', line: o }]);
      setRepliesDone(n => n + 1);
      setTurn(n => n + 1);
    }, GREEN_MS);
  }

  if (stars !== null) {
    return (
      <Frame conv={conv} dots={{ done: replyTurns, total: replyTurns }}>
        <View style={styles.endCard}>
          <Text style={styles.stars}>{'★'.repeat(stars)}<Text style={{ color: colors.line }}>{'★'.repeat(3 - stars)}</Text></Text>
          <Geez bold style={styles.praise}>{stars === 3 ? 'ብሉጽ!' : 'ጽቡቕ!'}</Geez>
          <Text style={styles.center}>You talked with {conv.character.en} in Tigrinya!</Text>
        </View>
        <Button label="Play again" kind="secondary" onPress={onPlayAgain} />
        <Button label="Done" onPress={() => router.back()} />
      </Frame>
    );
  }

  return (
    <Frame conv={conv} dots={{ done: repliesDone, total: replyTurns }} scrollRef={scroll}
           footer={replying ? (
             <View style={styles.footer}>
               {tier === 'geez' && !showSounds && (
                 <Pressable onPress={() => setShowSounds(true)} accessibilityRole="button" style={styles.soundsButton}>
                   <Text style={styles.soundsText}>Show sounds</Text>
                 </Pressable>
               )}
               {options.map(o => (
                 <ReplyButton key={o.ti} option={o} tier={tier} showSounds={showSounds}
                              state={green === o.ti ? 'green' : wrong.includes(o.ti) ? 'wrong' : 'idle'}
                              onPress={() => pick(o)} />
               ))}
               {hint && <View style={styles.hint}><Text style={styles.hintText}>{hint}</Text></View>}
             </View>
           ) : green ? (
             <View style={styles.footer}>
               {options.map(o => (
                 <ReplyButton key={o.ti} option={o} tier={tier} showSounds={showSounds}
                              state={green === o.ti ? 'green' : 'wrong'} onPress={() => {}} />
               ))}
             </View>
           ) : null}>
      {bubbles.map((b, i) => <ChatBubble key={i} bubble={b} tier={tier} />)}
      {typing && <View style={[styles.bubble, styles.them]}><Text style={styles.typing}>• • •</Text></View>}
    </Frame>
  );
}

function ChatBubble({ bubble, tier }: { bubble: Bubble; tier: Conversation['tier'] }) {
  const [english, setEnglish] = useState(false);
  const [sounds, setSounds] = useState(false);
  const them = bubble.from === 'them';
  // Character lines: romanization under the Ge'ez, except in the Ge'ez tier where it sits behind "Show sounds".
  const romShown = tier !== 'geez' || sounds;
  return (
    <View style={[styles.bubble, them ? styles.them : styles.me]}>
      <Geez style={styles.bubbleTi}>{bubble.line.ti}</Geez>
      {romShown
        ? <Text style={styles.bubbleRom}>{bubble.line.rom}</Text>
        : (
          <Pressable onPress={() => setSounds(true)} accessibilityRole="button">
            <Text style={styles.smallLink}>Show sounds</Text>
          </Pressable>
        )}
      {them && (english
        ? <Text style={styles.bubbleEn}>{bubble.line.en}</Text>
        : (
          <Pressable onPress={() => setEnglish(true)} accessibilityRole="button" accessibilityLabel="Show English"
                     style={styles.question} hitSlop={8}>
            <Text style={styles.questionText}>?</Text>
          </Pressable>
        ))}
    </View>
  );
}

function ReplyButton({ option, tier, showSounds, state, onPress }: {
  option: ReplyOption; tier: Conversation['tier']; showSounds: boolean;
  state: 'idle' | 'green' | 'wrong'; onPress: () => void;
}) {
  const shake = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (state !== 'wrong') return;
    Animated.sequence([10, -10, 8, -8, 0].map(x => Animated.timing(shake, { toValue: x, duration: 60, useNativeDriver: true }))).start();
  }, [state, shake]);
  const look = state === 'green' ? { borderColor: colors.correct, backgroundColor: colors.correctBg }
    : state === 'wrong' ? { opacity: 0.35 } : null;
  return (
    <Animated.View style={{ transform: [{ translateX: shake }] }}>
      <Pressable onPress={onPress} disabled={state !== 'idle'} accessibilityRole="button"
                 accessibilityLabel={tier === 'romanized' ? option.rom : option.ti}
                 style={({ pressed }) => [styles.reply, look, pressed && { opacity: 0.7 }]}>
        {/* Reply buttons never show English: understanding the replies is the point. */}
        {tier === 'romanized'
          ? <Text style={styles.replyRomBig}>{option.rom}</Text>
          : <Geez style={styles.replyTi}>{option.ti}</Geez>}
        {(tier === 'mixed' || (tier === 'geez' && showSounds)) && <Text style={styles.replyRom}>{option.rom}</Text>}
      </Pressable>
    </Animated.View>
  );
}

/** Chat frame: top bar with the character, one dot per reply turn and a close button. */
function Frame({ conv, title, dots, children, footer, scrollRef }: {
  conv?: Conversation; title?: string; dots?: { done: number; total: number };
  children: React.ReactNode; footer?: React.ReactNode; scrollRef?: React.RefObject<ScrollView | null>;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          {conv
            ? <Text style={styles.who}><Geez bold style={styles.whoTi}>{conv.character.ti}</Geez> · {conv.character.en}</Text>
            : <Text style={styles.who}>{title}</Text>}
          {dots && (
            <View style={styles.dots}>
              {Array.from({ length: dots.total }, (_, i) => (
                <View key={i} style={[styles.dot, i < dots.done && { backgroundColor: colors.correct }]} />
              ))}
            </View>
          )}
        </View>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close chat">
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.body}>{children}</ScrollView>
      {footer}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 12, borderBottomWidth: 1, borderColor: colors.line },
  who: { fontSize: 20, fontWeight: '700', color: colors.text },
  whoTi: { fontSize: 22, lineHeight: 32, color: colors.text },
  dots: { flexDirection: 'row', gap: 6, marginTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.line },
  close: { fontSize: 26, color: colors.muted },
  body: { padding: 16, gap: 10 },
  center: { fontSize: 19, color: colors.text, textAlign: 'center' },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.line },
  cardTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  glossRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  glossTi: { fontSize: 28, lineHeight: 40, color: colors.text, minWidth: 110 },
  glossRom: { fontSize: 17, color: colors.muted },
  glossEn: { fontSize: 17, color: colors.text },
  bubble: { maxWidth: '85%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, gap: 2 },
  them: { alignSelf: 'flex-start', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderBottomLeftRadius: 4, paddingRight: 36 },
  me: { alignSelf: 'flex-end', backgroundColor: '#DBEAFE', borderBottomRightRadius: 4 },
  bubbleTi: { fontSize: 26, lineHeight: 38, color: colors.text },
  bubbleRom: { fontSize: 16, color: colors.muted, fontStyle: 'italic' },
  bubbleEn: { fontSize: 16, color: colors.text, marginTop: 2 },
  smallLink: { fontSize: 14, color: colors.primary },
  question: { position: 'absolute', right: 8, top: 8, width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  questionText: { fontSize: 14, fontWeight: '700', color: colors.muted },
  typing: { fontSize: 20, color: colors.muted, letterSpacing: 2 },
  footer: { padding: 16, gap: 12, borderTopWidth: 1, borderColor: colors.line, backgroundColor: colors.bg },
  reply: {
    minHeight: 56, borderRadius: 14, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 8,
  },
  replyRomBig: { fontSize: 24, color: colors.text, textAlign: 'center' },
  replyTi: { fontSize: 26, lineHeight: 38, color: colors.text, textAlign: 'center' },
  replyRom: { fontSize: 16, color: colors.muted, textAlign: 'center' },
  hint: { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12 },
  hintText: { fontSize: 17, color: colors.text },
  soundsButton: { alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.line },
  soundsText: { fontSize: 15, color: colors.primary },
  endCard: { backgroundColor: colors.card, borderRadius: 18, padding: 24, gap: 10, borderWidth: 1, borderColor: colors.line, alignItems: 'center' },
  stars: { fontSize: 48, color: colors.star },
  praise: { fontSize: 34, lineHeight: 50, color: colors.correct },
});
