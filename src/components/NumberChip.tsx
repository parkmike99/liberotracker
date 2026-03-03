/**
 * Large number chip in team color for roster display and court.
 */

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface NumberChipProps {
  number: number;
  teamColor: string;
  numberColor: string;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
  isLibero?: boolean;
  liberoColor?: string;
  isServer?: boolean;
}

export function NumberChip({
  number,
  teamColor,
  numberColor,
  onPress,
  size = 'medium',
  isLibero,
  liberoColor,
  isServer,
}: NumberChipProps) {
  const bg = isLibero && liberoColor ? liberoColor : teamColor;
  const sizes = { small: 36, medium: 48, large: 64 };
  const dim = sizes[size];
  const fontSize = dim * 0.45;

  const content = (
    <View style={[styles.chip, { width: dim, height: dim, backgroundColor: bg }]}>
      <Text style={[styles.number, { color: numberColor, fontSize }]}>{number}</Text>
      {isLibero && <View style={styles.liberoBadge} />}
      {isServer && <View style={styles.serverRing} />}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: { fontWeight: '800' },
  liberoBadge: {
    position: 'absolute',
    bottom: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  serverRing: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#ff0',
  },
});
