import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export const colors = {
  bg: '#FFFBF5',
  card: '#FFFFFF',
  text: '#1F2933',
  muted: '#6B7280',
  line: '#E5E1DA',
  primary: '#2563EB',
  correct: '#16A34A',
  correctBg: '#DCFCE7',
  wrong: '#DC2626',
  wrongBg: '#FEE2E2',
  star: '#F59E0B',
};

/** Page frame: safe area, optional back button and title, scrolling body. */
export function Screen({ title, back = true, scroll = true, children }:
  { title?: string; back?: boolean; scroll?: boolean; children: ReactNode }) {
  const body = scroll
    ? <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">{children}</ScrollView>
    : <View style={[styles.body, { flex: 1 }]}>{children}</View>;
  return (
    <SafeAreaView style={styles.safe}>
      {(back || title) && (
        <View style={styles.header}>
          {back && (
            <Pressable onPress={() => (router.canGoBack() ? router.back() : router.dismissTo('/'))}
                       hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
              <Text style={styles.back}>‹ Back</Text>
            </Pressable>
          )}
          {title && <Text style={styles.title}>{title}</Text>}
        </View>
      )}
      {body}
    </SafeAreaView>
  );
}

/** Full-width primary or secondary action button. */
export function Button({ label, onPress, kind = 'primary', disabled }:
  { label: string; onPress: () => void; kind?: 'primary' | 'secondary'; disabled?: boolean }) {
  const primary = kind === 'primary';
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
               style={({ pressed }) => [styles.button, primary ? styles.buttonPrimary : styles.buttonSecondary,
                                        (pressed || disabled) && { opacity: 0.6 }]}>
      <Text style={[styles.buttonText, { color: primary ? '#FFFFFF' : colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

export function ProgressBar({ value, color = colors.primary }: { value: number; color?: string }) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 4 },
  back: { fontSize: 18, color: colors.primary },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  body: { padding: 16, gap: 12 },
  button: { minHeight: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonSecondary: { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.primary },
  buttonText: { fontSize: 20, fontWeight: '700' },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
});
