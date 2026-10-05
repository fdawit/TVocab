import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, Button, colors } from '../../src/components/Screen';
import { Geez } from '../../src/components/Geez';
import { Tip } from '../../src/components/WordCard';
import { UNITS, WORD_BY_ID } from '../../src/lib/data';
import { loadState, saveState } from '../../src/lib/storage';
import type { Addressee } from '../../src/lib/types';

const SAY_TO: Record<'boy' | 'girl' | 'group' | 'none', string> = {
  boy: 'Say this to a boy or man, like Dad, a brother or a cousin.',
  girl: 'Say this to a girl or woman, like Mom, a sister or an aunt.',
  group: 'Say this to the whole family together.',
  none: 'Say this to anyone at home.',
};
const sayTo = (a: Addressee) => SAY_TO[a ?? 'none'];

export default function HomeCard() {
  const { unitId, next } = useLocalSearchParams<{ unitId: string; next?: string }>();
  const unit = UNITS.find(u => u.id === Number(unitId));
  if (!unit) return <Screen title="Say it at home"><Text>Unit not found.</Text></Screen>;
  const w = WORD_BY_ID.get(unit.homeWordId)!;
  const rest = (next ?? '').split(',').filter(Boolean);

  /** Go on to the next finished unit's card, or back to Home. */
  function goOn() {
    if (rest.length) {
      router.replace({ pathname: '/home-card/[unitId]', params: { unitId: rest[0], next: rest.slice(1).join(',') } });
    } else {
      router.dismissTo('/');
    }
  }

  async function weDidIt() {
    // Read the saved state now: this screen is reused from card to card, so a copy
    // loaded when it opened could miss the card confirmed just before.
    const state = await loadState();
    if (!state.homeDone.includes(unit!.id)) {
      await saveState({ ...state, homeDone: [...state.homeDone, unit!.id] });
    }
    goOn();
  }

  return (
    <Screen title="Say it at home">
      <Text style={styles.unit}>Unit {unit.id}: {unit.title}</Text>
      <View style={styles.card}>
        <Geez bold style={styles.geez}>{w.exTi}</Geez>
        <Text style={styles.rom}>{w.exRom}</Text>
        <Text style={styles.en}>{w.exEn}</Text>
      </View>
      <Text style={styles.who}>{sayTo(w.addressee)}</Text>
      {!!w.note && <Tip note={w.note} />}
      <Button label="We did it!" onPress={weDidIt} />
      {/* Later leaves the unit pending; Home shows a badge until every finished unit is done. */}
      <Button kind="secondary" label="Later" onPress={goOn} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  unit: { fontSize: 18, color: colors.muted, textAlign: 'center' },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 20, gap: 8, borderWidth: 1, borderColor: colors.line },
  geez: { fontSize: 32, lineHeight: 48, color: colors.text, textAlign: 'center' },
  rom: { fontSize: 20, color: colors.muted, textAlign: 'center', fontStyle: 'italic' },
  en: { fontSize: 20, color: colors.text, textAlign: 'center' },
  who: { fontSize: 18, color: colors.text, textAlign: 'center' },
});
