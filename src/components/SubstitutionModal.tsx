/**
 * Substitution: tap outgoing zone on court, then tap incoming number from roster.
 */

import { Modal, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import type { Side, ZoneId } from '../types';

interface SubstitutionModalProps {
  visible: boolean;
  onClose: () => void;
  side: Side | null;
  rosterNumbers: number[];
  teamColor: string;
  numberColor: string;
  outgoingZone: ZoneId | null;
  onSelectZone: (zone: ZoneId) => void;
  onSelectPlayer: (number: number) => void;
  remainingSubs: number;
}

export function SubstitutionModal({
  visible,
  onClose,
  rosterNumbers,
  teamColor,
  numberColor,
  outgoingZone,
  onSelectPlayer,
  remainingSubs,
}: SubstitutionModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Substitution</Text>
          <Text style={styles.subsLeft}>Subs left: {remainingSubs}</Text>
          {!outgoingZone ? (
            <Text style={styles.hint}>Tap the outgoing player's zone on the court</Text>
          ) : (
            <>
              <Text style={styles.hint}>Outgoing zone: {outgoingZone}. Tap incoming player:</Text>
              <View style={styles.chipRow}>
                {rosterNumbers.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.chip, { backgroundColor: teamColor }]}
                    onPress={() => onSelectPlayer(n)}
                  >
                    <Text style={[styles.chipText, { color: numberColor }]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '70%',
  },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  subsLeft: { fontSize: 14, color: '#666', marginBottom: 12 },
  hint: { fontSize: 14, color: '#555', marginBottom: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  chip: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontSize: 18, fontWeight: '700' },
  cancelBtn: { marginTop: 16, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: '#666', fontSize: 16 },
});
