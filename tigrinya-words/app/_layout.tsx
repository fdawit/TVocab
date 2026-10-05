import { Stack } from 'expo-router';
import { useFonts, NotoSansEthiopic_400Regular, NotoSansEthiopic_700Bold }
  from '@expo-google-fonts/noto-sans-ethiopic';

export default function RootLayout() {
  const [loaded] = useFonts({ NotoSansEthiopic_400Regular, NotoSansEthiopic_700Bold });
  if (!loaded) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}
