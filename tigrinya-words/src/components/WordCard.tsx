import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Word } from '../lib/types';
import { Geez } from './Geez';
import { colors } from './Screen';

/** The full word layout used by intro cards and Word detail:
 *  Ge'ez, romanization, English, the example in three lines, and the learning note. */
export function WordCard({ word, children }: { word: Word; children?: ReactNode }) {
  return (
    <View style={styles.card}>
      <Geez bold style={styles.word}>{word.word}</Geez>
      <Text style={styles.pron}>{word.pron}</Text>
      <Text style={styles.meaning}>{word.meaning}</Text>
      {word.exTi && (
        <View style={styles.example}>
          <Geez style={styles.exTi}>{word.exTi}</Geez>
          {word.exRom && <Text style={styles.exRom}>{word.exRom}</Text>}
          {word.exEn && <Text style={styles.exEn}>{word.exEn}</Text>}
        </View>
      )}
      {!!word.note && <Tip note={word.note} />}
      {children}
    </View>
  );
}

/** Learning note under a "Tip" label (system font: notes mix English and Ge'ez). */
export function Tip({ note }: { note: string }) {
  return (
    <View style={styles.tip}>
      <Text style={styles.tipLabel}>Tip</Text>
      <Text style={styles.tipText}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 20, gap: 6, borderWidth: 1, borderColor: colors.line },
  word: { fontSize: 36, lineHeight: 52, color: colors.text, textAlign: 'center' },
  pron: { fontSize: 20, color: colors.muted, textAlign: 'center' },
  meaning: { fontSize: 22, color: colors.text, textAlign: 'center', fontWeight: '600' },
  example: { marginTop: 12, gap: 2, alignItems: 'center' },
  exTi: { fontSize: 24, lineHeight: 36, color: colors.text, textAlign: 'center' },
  exRom: { fontSize: 17, color: colors.muted, textAlign: 'center', fontStyle: 'italic' },
  exEn: { fontSize: 18, color: colors.text, textAlign: 'center' },
  tip: { marginTop: 12, backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, gap: 2 },
  tipLabel: { fontSize: 14, fontWeight: '700', color: '#92400E', textTransform: 'uppercase' },
  tipText: { fontSize: 17, color: colors.text },
});
