/**
 * History: list recent matches with team names and set score.
 * Tap to resume or view.
 */

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { loadJson } from '../src/storage';
import { STORAGE_KEYS } from '../src/storage/types';
import type { StoredMatchHistoryIds, StoredMatchSummaries } from '../src/storage/types';
import type { MatchSummary } from '../src/storage/types';

export default function HistoryScreen() {
  const router = useRouter();
  const [matchIds, setMatchIds] = useState<string[]>([]);
  const [summaries, setSummaries] = useState<Record<string, MatchSummary>>({});

  useEffect(() => {
    loadJson<StoredMatchHistoryIds>(STORAGE_KEYS.MATCH_HISTORY_IDS).then((data) => {
      setMatchIds(data?.ids ?? []);
    });
  }, []);

  useEffect(() => {
    if (matchIds.length === 0) return;
    loadJson<StoredMatchSummaries>(STORAGE_KEYS.MATCH_SUMMARIES).then((data) => {
      if (!data) return;
      const out: Record<string, MatchSummary> = {};
      for (const id of matchIds) {
        const raw = data[id];
        if (raw) {
          try {
            out[id] = JSON.parse(raw) as MatchSummary;
          } catch {
            // skip
          }
        }
      }
      setSummaries(out);
    });
  }, [matchIds.join(',')]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Recent matches</Text>
      {matchIds.length === 0 ? (
        <Text style={styles.empty}>No matches yet. Start a new match from the home screen.</Text>
      ) : (
        matchIds.map((id) => {
          const sum = summaries[id];
          const label = sum
            ? `${sum.homeName} vs ${sum.awayName} — ${sum.setWinners.filter((w) => w === 'home').length}–${sum.setWinners.filter((w) => w === 'away').length}`
            : `Match ${id.slice(0, 8)}`;
          return (
            <TouchableOpacity
              key={id}
              style={styles.row}
              onPress={() => router.push(`/match/${id}`)}
              activeOpacity={0.7}
            >
              <Text style={styles.rowText}>{label}</Text>
            </TouchableOpacity>
          );
        })
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  empty: { fontSize: 15, color: '#666', marginTop: 8 },
  row: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
  },
  rowText: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
});
