/**
 * Home screen: New Match, Teams, History.
 * Shows saved teams as color cards and recent matches.
 */

import { useRouter } from 'expo-router';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useTeamsStore } from '../src/store/useTeamsStore';
import { useEffect, useState, useMemo } from 'react';
import type { TeamProfile } from '../src/types';
import { loadJson } from '../src/storage';
import { STORAGE_KEYS } from '../src/storage/types';
import type { StoredMatchHistoryIds } from '../src/storage/types';

export default function HomeScreen() {
  const router = useRouter();
  const teamsRecord = useTeamsStore((s) => s.teams);
  const hydrated = useTeamsStore((s) => s.hydrated);
  const teams = useMemo(() => Object.values(teamsRecord), [teamsRecord]);
  const [recentMatchIds, setRecentMatchIds] = useState<string[]>([]);

  useEffect(() => {
    loadJson<StoredMatchHistoryIds>(STORAGE_KEYS.MATCH_HISTORY_IDS).then((data) => {
      setRecentMatchIds(data?.ids ?? []);
    });
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <TouchableOpacity
          style={[styles.bigButton, styles.primaryButton]}
          onPress={() => router.push('/match/new')}
          activeOpacity={0.8}
        >
          <Text style={styles.bigButtonText}>New Match</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bigButton, styles.secondaryButton]}
          onPress={() => router.push('/teams')}
          activeOpacity={0.8}
        >
          <Text style={styles.bigButtonText}>Teams</Text>
        </TouchableOpacity>
      </View>

      {hydrated && teams.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your teams</Text>
          <View style={styles.teamCards}>
            {teams.map((team) => (
              <TeamCard key={team.id} team={team} onPress={() => router.push(`/teams/${team.id}`)} />
            ))}
          </View>
        </View>
      )}

      {recentMatchIds.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent matches</Text>
          {recentMatchIds.slice(0, 5).map((id) => (
            <TouchableOpacity
              key={id}
              style={styles.historyRow}
              onPress={() => router.push(`/match/${id}`)}
            >
              <Text style={styles.historyId}>Match {id.slice(0, 8)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function TeamCard({
  team,
  onPress,
}: {
  team: TeamProfile;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.teamCard, { backgroundColor: team.teamColor }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Text style={[styles.teamCardName, { color: team.numberColor }]} numberOfLines={1}>
        {team.name}
      </Text>
      <Text style={[styles.teamCardRoster, { color: team.numberColor }]}>
        #{team.rosterNumbers.join(', #')}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingTop: 16 },
  section: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  bigButton: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 12,
    minHeight: 64,
    justifyContent: 'center',
  },
  primaryButton: { backgroundColor: '#1a5fb4' },
  secondaryButton: { backgroundColor: '#3584e4' },
  bigButtonText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  teamCards: { gap: 12 },
  teamCard: {
    padding: 20,
    borderRadius: 16,
    minHeight: 80,
    justifyContent: 'center',
  },
  teamCardName: { fontSize: 18, fontWeight: '700' },
  teamCardRoster: { fontSize: 14, marginTop: 4, opacity: 0.9 },
  historyRow: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
  },
  historyId: { fontSize: 15, color: '#333' },
});
