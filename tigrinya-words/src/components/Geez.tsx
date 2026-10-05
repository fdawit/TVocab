import { Text, TextProps } from 'react-native';

export function Geez({ style, bold, ...rest }: TextProps & { bold?: boolean }) {
  return (
    <Text
      {...rest}
      style={[{ fontFamily: bold ? 'NotoSansEthiopic_700Bold' : 'NotoSansEthiopic_400Regular',
                fontSize: 28, lineHeight: 40 }, style]}
    />
  );
}
