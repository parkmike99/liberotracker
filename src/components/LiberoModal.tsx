/**
 * Libero IN/OUT flow: choose side, then Libero In (tap back-row zone) or Libero Out.
 */

import { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import type { Side } from '../types';

interface LiberoModalProps {
  visible: boolean;
  onClose: () => void;
  onLiberoIn: (side: Side) => void;
  onLiberoOut: (side: Side) => void;
  /** When IN is chosen, parent should show court with back-row zones active and call onZonePick */
  mode: 'choose_side' | 'in' | 'out';
  selectedSide: Side | null;
}

export function LiberoModal({
  visible,
  onClose,
  onLiberoIn,
  onLiberoOut,
  mode,
  selectedSide,
}: LiberoModalProps) {
  const [side, setSide] = useState<Side | null>(selectedSide);

  const currentSide = selectedSide ?? side;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Libero</Text>
          {mode === 'choose_side' && (
            <>
              <Text style={styles.subtitle}>Choose team</Text>
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.sideBtn, side === 'home' && styles.sideBtnActive]}
                  onPress={() => setSide('home')}
                >
                  <Text style={styles.sideBtnText}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sideBtn, side === 'away' && styles.sideBtnActive]}
                  onPress={() => setSide('away')}
                >
                  <Text style={styles.sideBtnText}>Away</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.subtitle}>Then</Text>
              <TouchableOpacity
                style={[styles.actionBtn, !side && styles.actionBtnDisabled]}
                onPress={() => side && onLiberoIn(side)}
                disabled={!side}
              >
                <Text style={styles.actionBtnText}>Libero IN</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnOut, !side && styles.actionBtnDisabled]}
                onPress={() => side && onLiberoOut(side)}
                disabled={!side}
              >
                <Text style={styles.actionBtnText}>Libero OUT</Text>
              </TouchableOpacity>
            </>
          )}
          {mode === 'in' && currentSide && (
            <Text style={styles.hint}>Tap a back-row zone (1, 6, 5) on the court</Text>
          )}
          {mode === 'out' && currentSide && (
            <Text style={styles.hint}>Libero OUT recorded for {currentSide}</Text>
          )}
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
  },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  sideBtn: {
    flex: 1,
    padding: 16,
    backgroundColor: '#eee',
    borderRadius: 12,
    alignItems: 'center',
  },
  sideBtnActive: { backgroundColor: '#1a5fb4' },
  sideBtnText: { fontSize: 16, fontWeight: '600' },
  actionBtn: {
    padding: 18,
    backgroundColor: '#1a5fb4',
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionBtnOut: { backgroundColor: '#3584e4' },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  hint: { fontSize: 14, color: '#666', marginBottom: 16, textAlign: 'center' },
  cancelBtn: { marginTop: 8, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: '#666', fontSize: 16 },
});
