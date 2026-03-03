/**
 * Team list screen: show all teams, tap to edit, FAB or button to add.
 */

import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useTeamsStore } from '../../src/store/useTeamsStore';
import type { TeamProfile } from '../../src/types';

export default function TeamListScreen() {
  const router = useRouter();
  const teamsRecord = useTeamsStore((s) => s.teams);
  const teams = useMemo(() => Object.values(teamsRecord), [teamsRecord]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {teams.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No teams yet</Text>
          <Text style={styles.emptySubtext}>Add a team to get started</Text>
        </View>
      ) : (
        teams.map((team) => (
          <TouchableOpacity
            key={team.id}
            style={[styles.card, { backgroundColor: team.teamColor }]}
            onPress={() => router.push(`/teams/${team.id}`)}
            activeOpacity={0.9}
          >
            <Text style={[styles.cardName, { color: team.numberColor }]}>{team.name}</Text>
            <Text style={[styles.cardRoster, { color: team.numberColor }]}>
              #{team.rosterNumbers.join(', #')}
            </Text>
          </TouchableOpacity>
        ))
      )}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push('/teams/new')}
        activeOpacity={0.8}
      >
        <Text style={styles.addButtonText}>+ Add team</Text>
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24 },
  empty: { paddingVertical: 48, alignItems: 'center' },
  emptyText: { fontSize: 18, color: '#666' },
  emptySubtext: { fontSize: 14, color: '#999', marginTop: 4 },
  card: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
  },
  cardName: { fontSize: 18, fontWeight: '700' },
  cardRoster: { fontSize: 14, marginTop: 4, opacity: 0.9 },
  addButton: {
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#3584e4',
    alignItems: 'center',
  },
  addButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
