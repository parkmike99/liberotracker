/**
 * Libero IN/OUT flow: choose side, then Libero In (tap back-row zone or drag from bench) or Libero Out.
 * When Libero OUT is chosen, show who enters: return replaced player or sub in their pair-mate.
 */

import { useState, useEffect } from 'react';
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
  /** Notify parent when user selects a side (so parent can pass correct replacedPlayer for who-enters). */
  onSideChange?: (side: Side) => void;
  /** Called when user taps Libero OUT and there is no libero on court */
  onLiberoOutRequest?: (side: Side) => void;
  /** When OUT is chosen, who can enter: replaced player number and optional pair-mate */
  replacedPlayer?: number | null;
  pairMate?: number | null;
  remainingSubs?: number;
  onReturnReplaced?: () => void;
  onSubPairMate?: (playerNumber: number) => void;
  mode: 'choose_side' | 'in' | 'out';
  selectedSide: Side | null;
}

export function LiberoModal({
  visible,
  onClose,
  onLiberoIn,
  onSideChange,
  onLiberoOutRequest,
  replacedPlayer,
  pairMate,
  remainingSubs = 0,
  onReturnReplaced,
  onSubPairMate,
  mode,
  selectedSide,
}: LiberoModalProps) {
  const [side, setSide] = useState<Side | null>(selectedSide);
  const [showWhoEnters, setShowWhoEnters] = useState(false);

  const currentSide = selectedSide ?? side;

  useEffect(() => {
    if (!visible) setShowWhoEnters(false);
  }, [visible]);

  const handleLiberoOutTap = () => {
    if (!currentSide) return;
    if (replacedPlayer != null && onReturnReplaced != null) {
      setShowWhoEnters(true);
    } else if (onLiberoOutRequest) {
      onLiberoOutRequest(currentSide);
    }
  };

  const canSubPairMate = pairMate != null && remainingSubs > 0 && onSubPairMate != null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Libero</Text>
          {mode === 'choose_side' && !showWhoEnters && (
            <>
              <Text style={styles.subtitle}>Choose team</Text>
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.sideBtn, side === 'home' && styles.sideBtnActive]}
                  onPress={() => { setSide('home'); onSideChange?.('home'); }}
                >
                  <Text style={styles.sideBtnText}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sideBtn, side === 'away' && styles.sideBtnActive]}
                  onPress={() => { setSide('away'); onSideChange?.('away'); }}
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
                onPress={handleLiberoOutTap}
                disabled={!side}
              >
                <Text style={styles.actionBtnText}>Libero OUT</Text>
              </TouchableOpacity>
            </>
          )}
          {mode === 'choose_side' && showWhoEnters && replacedPlayer != null && (
            <>
              <Text style={styles.subtitle}>Who enters for the libero&apos;s position?</Text>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  onReturnReplaced?.();
                  setShowWhoEnters(false);
                  onClose();
                }}
              >
                <Text style={styles.actionBtnText}>Return #{replacedPlayer}</Text>
              </TouchableOpacity>
              {canSubPairMate && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnOut]}
                  onPress={() => {
                    onSubPairMate?.(pairMate!);
                    setShowWhoEnters(false);
                    onClose();
                  }}
                >
                  <Text style={styles.actionBtnText}>Sub in #{pairMate}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowWhoEnters(false)}>
                <Text style={styles.cancelBtnText}>Back</Text>
              </TouchableOpacity>
            </>
          )}
          {mode === 'in' && currentSide && (
            <Text style={styles.hint}>Tap a back-row zone (1, 6, 5) or drag libero from bench onto a back-row zone</Text>
          )}
          {mode === 'out' && currentSide && !showWhoEnters && (
            <Text style={styles.hint}>Choose who enters above</Text>
          )}
          {!showWhoEnters && (
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          )}
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
