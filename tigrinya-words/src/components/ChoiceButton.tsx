import { Pressable, StyleSheet, Text } from 'react-native';
import { Geez } from './Geez';
import { colors } from './Screen';

export type ChoiceState = 'idle' | 'correct' | 'wrong' | 'dim';

/** One tap-to-choose answer: full width, at least 56 points tall. */
export function ChoiceButton({ label, geez, state = 'idle', onPress, disabled }:
  { label: string; geez?: boolean; state?: ChoiceState; onPress: () => void; disabled?: boolean }) {
  const look = state === 'correct' ? { borderColor: colors.correct, backgroundColor: colors.correctBg }
    : state === 'wrong' ? { borderColor: colors.wrong, backgroundColor: colors.wrongBg }
    : state === 'dim' ? { opacity: 0.5 } : null;
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label}
               style={({ pressed }) => [styles.button, look, pressed && !disabled && { opacity: 0.7 }]}>
      {geez
        ? <Geez style={styles.geez}>{label}</Geez>
        : <Text style={styles.text}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56, borderRadius: 14, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 8,
  },
  geez: { fontSize: 26, lineHeight: 38, color: colors.text, textAlign: 'center' },
  text: { fontSize: 22, color: colors.text, textAlign: 'center' },
});
