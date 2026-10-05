import { StyleSheet, Text } from 'react-native';
import { Screen, colors } from '../src/components/Screen';

// The sound lesson and the letter chart are built in Step 9 of the guide.
export default function Sounds() {
  return (
    <Screen title="Sounds">
      <Text style={styles.text}>The sound lesson and letter chart are coming soon.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 18, color: colors.muted },
});
