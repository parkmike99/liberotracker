/**
 * Set break: confirm set score, choose liberos for next set, start next set.
 */

import { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import type { Side } from '../types';

interface SetBreakModalProps {
  visible: boolean;
  setWinner: Side | null;
  homeScore: number;
  awayScore: number;
  homeName: string;
  awayName: string;
  nextSetIndex: number;
  totalSets: number;
  setWinners: (Side | null)[];
  homeRoster: number[];
  awayRoster: number[];
  homeLiberoColor: string;
  awayLiberoColor: string;
  onConfirm: (liberosHome: number[], liberosAway: number[]) => void;
  onMatchComplete?: () => void;
}

export function SetBreakModal({
  visible,
  setWinner,
  homeScore,
  awayScore,
  homeName,
  awayName,
  nextSetIndex,
  totalSets,
  setWinners,
  homeRoster,
  awayRoster,
  homeLiberoColor,
  awayLiberoColor,
  onConfirm,
  onMatchComplete,
}: SetBreakModalProps) {
  const [liberosHome, setLiberosHome] = useState<number[]>([]);
  const [liberosAway, setLiberosAway] = useState<number[]>([]);
  const homeSetsWon = setWinners.filter((s) => s === 'home').length;
  const awaySetsWon = setWinners.filter((s) => s === 'away').length;
  const matchOver = homeSetsWon >= 2 || awaySetsWon >= 2;
  const hasNextSet = nextSetIndex < totalSets && !matchOver;

  const addLibero = (side: 'home' | 'away', num: number) => {
    if (side === 'home') {
      setLiberosHome((prev) =>
        prev.includes(num) ? prev.filter((x) => x !== num) : prev.length < 2 ? [...prev, num] : prev
      );
    } else {
      setLiberosAway((prev) =>
        prev.includes(num) ? prev.filter((x) => x !== num) : prev.length < 2 ? [...prev, num] : prev
      );
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Set complete</Text>
          <Text style={styles.score}>
            {homeName} {homeScore} – {awayScore} {awayName}
          </Text>
          {setWinner && (
            <Text style={styles.winner}>Set won by: {setWinner === 'home' ? homeName : awayName}</Text>
          )}
          {hasNextSet ? (
            <>
              <Text style={styles.nextSet}>Set {nextSetIndex + 1} – Choose liberos</Text>
          <ScrollView style={styles.liberos} horizontal>
            <View style={styles.liberoSection}>
              <Text style={styles.sideLabel}>{homeName}</Text>
              <View style={styles.chipRow}>
                {homeRoster.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[
                      styles.liberoChip,
                      {
                        backgroundColor: liberosHome.includes(n) ? homeLiberoColor : '#eee',
                      },
                    ]}
                    onPress={() => addLibero('home', n)}
                  >
                    <Text style={styles.liberoChipText}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.liberoSection}>
              <Text style={styles.sideLabel}>{awayName}</Text>
              <View style={styles.chipRow}>
                {awayRoster.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[
                      styles.liberoChip,
                      {
                        backgroundColor: liberosAway.includes(n) ? awayLiberoColor : '#eee',
                      },
                    ]}
                    onPress={() => addLibero('away', n)}
                  >
                    <Text style={styles.liberoChipText}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={() => hasNextSet ? onConfirm(liberosHome, liberosAway) : onMatchComplete?.()}
          >
            <Text style={styles.confirmBtnText}>
              {hasNextSet ? `Start Set ${nextSetIndex + 1}` : 'Match complete – Back to home'}
            </Text>
          </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => onMatchComplete?.()}
            >
              <Text style={styles.confirmBtnText}>Match complete – Back to home</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
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
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  score: { fontSize: 18, color: '#333', marginBottom: 4, textAlign: 'center' },
  winner: { fontSize: 14, color: '#1a5fb4', marginBottom: 20, textAlign: 'center' },
  nextSet: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  liberos: { maxHeight: 120, marginBottom: 16 },
  liberoSection: { marginRight: 20 },
  sideLabel: { fontSize: 12, color: '#666', marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  liberoChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liberoChipText: { fontSize: 16, fontWeight: '700' },
  confirmBtn: {
    padding: 18,
    backgroundColor: '#1a5fb4',
    borderRadius: 14,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
