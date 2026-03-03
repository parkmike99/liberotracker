/**
 * Match setup flow: Select Home → Away → Liberos Set 1 → First server → Start.
 * Target < 60 seconds.
 */

import { useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useTeamsStore } from '../../src/store/useTeamsStore';
import { useMatchStore } from '../../src/store/useMatchStore';
import type { TeamProfile } from '../../src/types';
import { DEFAULT_RULE_SET } from '../../src/types';
import { v4 as uuidv4 } from 'uuid';
import type { CourtRow } from '../../src/types';

type Step = 'home' | 'away' | 'liberos' | 'server' | 'ready';

export default function MatchSetupScreen() {
  const router = useRouter();
  const teamsRecord = useTeamsStore((s) => s.teams);
  const teams = useMemo(() => Object.values(teamsRecord), [teamsRecord]);
  const getTeam = useTeamsStore((s) => s.getTeam);
  const setMatch = useMatchStore((s) => s.setMatch);
  const saveMatch = useMatchStore((s) => s.saveMatch);
  const addMatchToHistory = useMatchStore((s) => s.addMatchToHistory);

  const [step, setStep] = useState<Step>('home');
  const [homeTeamId, setHomeTeamId] = useState<string | null>(null);
  const [awayTeamId, setAwayTeamId] = useState<string | null>(null);
  const [liberosHome, setLiberosHome] = useState<number[]>([]);
  const [liberosAway, setLiberosAway] = useState<number[]>([]);
  const [servingFirst, setServingFirst] = useState<'home' | 'away' | null>(null);

  const homeTeam = homeTeamId ? getTeam(homeTeamId) : null;
  const awayTeam = awayTeamId ? getTeam(awayTeamId) : null;

  const startMatch = () => {
    if (!homeTeam || !awayTeam || !servingFirst) return;
    const id = uuidv4();
    const now = Date.now();

    // Initial court: first 6 of roster for each team
    const homeCourt: CourtRow = [
      homeTeam.rosterNumbers[0] ?? null,
      homeTeam.rosterNumbers[1] ?? null,
      homeTeam.rosterNumbers[2] ?? null,
      homeTeam.rosterNumbers[3] ?? null,
      homeTeam.rosterNumbers[4] ?? null,
      homeTeam.rosterNumbers[5] ?? null,
    ];
    const awayCourt: CourtRow = [
      awayTeam.rosterNumbers[0] ?? null,
      awayTeam.rosterNumbers[1] ?? null,
      awayTeam.rosterNumbers[2] ?? null,
      awayTeam.rosterNumbers[3] ?? null,
      awayTeam.rosterNumbers[4] ?? null,
      awayTeam.rosterNumbers[5] ?? null,
    ];

    const initialSet = {
      score: { home: 0, away: 0 },
      servingTeam: servingFirst,
      home: {
        rotationIndex: 0,
        court: homeCourt,
        liberoState: {
          designatedLiberos: liberosHome,
          onCourtLiberoNumber: null,
          replacedPlayerNumber: null,
          liberoServePosition: null,
        },
        subsUsed: 0,
      },
      away: {
        rotationIndex: 0,
        court: awayCourt,
        liberoState: {
          designatedLiberos: liberosAway,
          onCourtLiberoNumber: null,
          replacedPlayerNumber: null,
          liberoServePosition: null,
        },
        subsUsed: 0,
      },
      eventLog: [],
    };

    const match = {
      id,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      ruleSet: DEFAULT_RULE_SET,
      currentSetIndex: 0,
      sets: [initialSet],
      setWinners: [null] as (null | 'home' | 'away')[],
      createdAt: now,
      updatedAt: now,
    };

    setMatch(match);
    saveMatch(match);
    addMatchToHistory(id);
    router.replace(`/match/${id}`);
  };

  const canStart = homeTeam && awayTeam && liberosHome.length <= 2 && liberosAway.length <= 2 && servingFirst;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {step === 'home' && (
        <>
          <Text style={styles.title}>Select home team</Text>
          {teams.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.teamCard, { backgroundColor: t.teamColor }]}
              onPress={() => { setHomeTeamId(t.id); setStep('away'); }}
            >
              <Text style={[styles.teamName, { color: t.numberColor }]}>{t.name}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      {step === 'away' && (
        <>
          <Text style={styles.title}>Select away team</Text>
          {teams.filter((t) => t.id !== homeTeamId).map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.teamCard, { backgroundColor: t.teamColor }]}
              onPress={() => { setAwayTeamId(t.id); setStep('liberos'); }}
            >
              <Text style={[styles.teamName, { color: t.numberColor }]}>{t.name}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep('home')}>
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        </>
      )}

      {step === 'liberos' && homeTeam && awayTeam && (
        <>
          <Text style={styles.title}>Liberos for Set 1 (tap to select, max 2 per team)</Text>
          <View style={styles.liberosSection}>
            <Text style={styles.sideLabel}>Home: {homeTeam.name}</Text>
            <View style={styles.chipRow}>
              {homeTeam.rosterNumbers.map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[
                    styles.liberoChip,
                    {
                      backgroundColor: liberosHome.includes(n)
                        ? homeTeam.liberoColor
                        : homeTeam.teamColor,
                    },
                  ]}
                  onPress={() => {
                    setLiberosHome((prev) =>
                      prev.includes(n) ? prev.filter((x) => x !== n) : prev.length < 2 ? [...prev, n] : prev
                    );
                  }}
                >
                  <Text style={{ color: homeTeam.numberColor, fontWeight: '700' }}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.liberosSection}>
            <Text style={styles.sideLabel}>Away: {awayTeam.name}</Text>
            <View style={styles.chipRow}>
              {awayTeam.rosterNumbers.map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[
                    styles.liberoChip,
                    {
                      backgroundColor: liberosAway.includes(n)
                        ? awayTeam.liberoColor
                        : awayTeam.teamColor,
                    },
                  ]}
                  onPress={() => {
                    setLiberosAway((prev) =>
                      prev.includes(n) ? prev.filter((x) => x !== n) : prev.length < 2 ? [...prev, n] : prev
                    );
                  }}
                >
                  <Text style={{ color: awayTeam.numberColor, fontWeight: '700' }}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('server')}>
            <Text style={styles.primaryBtnText}>Next: First server</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep('away')}>
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        </>
      )}

      {step === 'server' && homeTeam && awayTeam && (
        <>
          <Text style={styles.title}>Who serves first?</Text>
          <TouchableOpacity
            style={[styles.teamCard, { backgroundColor: homeTeam.teamColor }]}
            onPress={() => setServingFirst('home')}
          >
            <Text style={[styles.teamName, { color: homeTeam.numberColor }]}>
              {homeTeam.name} {servingFirst === 'home' ? ' ✓' : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.teamCard, { backgroundColor: awayTeam.teamColor }]}
            onPress={() => setServingFirst('away')}
          >
            <Text style={[styles.teamName, { color: awayTeam.numberColor }]}>
              {awayTeam.name} {servingFirst === 'away' ? ' ✓' : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, !canStart && styles.primaryBtnDisabled]}
            onPress={() => canStart && startMatch()}
            disabled={!canStart}
          >
            <Text style={styles.primaryBtnText}>Start match</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep('liberos')}>
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16, color: '#1a1a1a' },
  teamCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
  },
  teamName: { fontSize: 18, fontWeight: '700' },
  liberosSection: { marginBottom: 20 },
  sideLabel: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  liberoChip: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    backgroundColor: '#1a5fb4',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  backBtn: { marginTop: 12, padding: 16, alignItems: 'center' },
  backBtnText: { color: '#3584e4', fontSize: 16 },
});
