/**
 * Top bar scoreboard: Home X – Y Away, set indicator, serving team, Undo.
 */

import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

interface ScoreboardProps {
  homeScore: number;
  awayScore: number;
  homeName: string;
  awayName: string;
  setIndex: number;
  totalSets: number;
  servingTeam: 'home' | 'away' | null;
  serverNumber: number | null;
  onUndo?: () => void;
  canUndo?: boolean;
  /** Compact: Set + score only (for portrait top bar between benches) */
  compact?: boolean;
}

export function Scoreboard({
  homeScore,
  awayScore,
  homeName,
  awayName,
  setIndex,
  totalSets,
  servingTeam,
  serverNumber,
  onUndo,
  canUndo = true,
  compact = false,
}: ScoreboardProps) {
  if (compact) {
    return (
      <View style={[styles.compact]}>
        <Text style={styles.compactSet}>Set {setIndex + 1}/{totalSets}</Text>
        <Text style={styles.compactScore}>
          {homeScore} – {awayScore}
        </Text>
        {onUndo && (
          <TouchableOpacity
            style={[styles.undoBtn, !canUndo && styles.undoBtnDisabled]}
            onPress={onUndo}
            disabled={!canUndo}
          >
            <Text style={styles.undoBtnText}>Undo</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>{homeName}</Text>
        <Text style={styles.score}>
          {homeScore} – {awayScore}
        </Text>
        <Text style={styles.scoreLabel}>{awayName}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.setText}>
          Set {setIndex + 1} of {totalSets}
        </Text>
        {servingTeam != null && (
          <Text style={styles.serveText}>
            Serving: {servingTeam === 'home' ? 'HOME' : 'AWAY'}
            {serverNumber != null ? ` #${serverNumber}` : ''}
          </Text>
        )}
        {onUndo && (
          <TouchableOpacity
            style={[styles.undoBtn, !canUndo && styles.undoBtnDisabled]}
            onPress={onUndo}
            disabled={!canUndo}
          >
            <Text style={styles.undoBtnText}>Undo</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  compactSet: { fontSize: 11, fontWeight: '600', color: '#555' },
  compactScore: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreLabel: { fontSize: 14, fontWeight: '600', color: '#555', flex: 1 },
  score: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1a1a1a',
    marginHorizontal: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 16,
  },
  setText: { fontSize: 13, color: '#666' },
  serveText: { fontSize: 13, fontWeight: '600', color: '#1a5fb4' },
  undoBtn: { marginLeft: 'auto', padding: 4 },
  undoBtnDisabled: { opacity: 0.4 },
  undoBtnText: { fontSize: 11, fontWeight: '600', color: '#1a5fb4' },
});
