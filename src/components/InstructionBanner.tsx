/**
 * Non-blocking instruction banner (e.g. "Tap a zone on the court") so the court stays tappable.
 */

import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

interface InstructionBannerProps {
  visible: boolean;
  message: string;
  onCancel: () => void;
}

export function InstructionBanner({ visible, message, onCancel }: InstructionBannerProps) {
  if (!visible) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{message}</Text>
      <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
        <Text style={styles.cancelBtnText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#1a5fb4',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  text: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1 },
  cancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelBtnText: { color: '#fff', fontWeight: '700' },
});
