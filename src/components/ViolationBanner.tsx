/**
 * Big red banner for illegal action in Guided Mode.
 * FIX button to correct, or long-press to switch to Coach Mode.
 */

import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

interface ViolationBannerProps {
  message: string;
  onFix?: () => void;
  onOverride?: () => void;
  visible: boolean;
}

export function ViolationBanner({
  message,
  onFix,
  onOverride,
  visible,
}: ViolationBannerProps) {
  if (!visible) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{message}</Text>
      {onFix && (
        <TouchableOpacity style={styles.fixBtn} onPress={onFix}>
          <Text style={styles.fixBtnText}>FIX</Text>
        </TouchableOpacity>
      )}
      {onOverride && (
        <TouchableOpacity style={styles.overrideBtn} onPress={onOverride}>
          <Text style={styles.overrideBtnText}>Override (Coach Mode)</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#c01c28',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  text: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1 },
  fixBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  fixBtnText: { color: '#c01c28', fontWeight: '700' },
  overrideBtn: { padding: 8 },
  overrideBtnText: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
});
