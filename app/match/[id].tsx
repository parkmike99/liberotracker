/**
 * Match tracking screen (iPad landscape first).
 * Scoreboard, court SVG, action panel: Point Home, Point Away, Undo, Libero, Sub.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useTeamsStore } from '../../src/store/useTeamsStore';
import { useMatchStore } from '../../src/store/useMatchStore';
import { CourtView, type CourtZoneData, type DragSource, getZoneBounds } from '../../src/components/CourtView';
import { BenchStrip } from '../../src/components/BenchStrip';
import { Scoreboard } from '../../src/components/Scoreboard';
import { LiberoModal } from '../../src/components/LiberoModal';
import { SubstitutionModal } from '../../src/components/SubstitutionModal';
import { SetBreakModal } from '../../src/components/SetBreakModal';
import { ViolationBanner } from '../../src/components/ViolationBanner';
import { useAppModeStore } from '../../src/store/useAppModeStore';
import type { Side, ZoneId } from '../../src/types';

const BACK_ROW_ZONES: ZoneId[] = [1, 6, 5];
const TOP_ROW_HEIGHT = 72;
const SCOREBOARD_WIDTH = 80;
const DEFAULT_HOME_COLOR = '#1a5fb4';
const DEFAULT_AWAY_COLOR = '#c64600';

export default function MatchTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const loadMatch = useMatchStore((s) => s.loadMatch);
  const match = useMatchStore((s) => s.match);
  const setMatch = useMatchStore((s) => s.setMatch);
  const getCurrentSet = useMatchStore((s) => s.getCurrentSet);
  const point = useMatchStore((s) => s.point);
  const undo = useMatchStore((s) => s.undo);
  const liberoIn = useMatchStore((s) => s.liberoIn);
  const liberoOut = useMatchStore((s) => s.liberoOut);
  const substitution = useMatchStore((s) => s.substitution);
  const startNextSet = useMatchStore((s) => s.startNextSet);
  const completeSet = useMatchStore((s) => s.completeSet);
  const saveMatch = useMatchStore((s) => s.saveMatch);

  const getTeam = useTeamsStore((s) => s.getTeam);

  const [liberoModalVisible, setLiberoModalVisible] = useState(false);
  const [liberoMode, setLiberoMode] = useState<'choose_side' | 'in' | 'out'>('choose_side');
  const [liberoSide, setLiberoSide] = useState<Side | null>(null);
  const [subModalVisible, setSubModalVisible] = useState(false);
  const [subSide, setSubSide] = useState<Side | null>(null);
  const [subOutgoingZone, setSubOutgoingZone] = useState<ZoneId | null>(null);
  const [setBreakVisible, setSetBreakVisible] = useState(false);
  const [setBreakWinner, setSetBreakWinner] = useState<Side | null>(null);
  const [violation, setViolation] = useState<string | null>(null);
  const appMode = useAppModeStore((s) => s.mode);
  const setAppMode = useAppModeStore((s) => s.setMode);

  useEffect(() => {
    if (!id) return;
    loadMatch(id).then((m) => {
      if (m) setMatch(m);
      else router.replace('/');
    });
  }, [id]);

  const currentSet = getCurrentSet();
  const homeTeam = match ? getTeam(match.homeTeamId) : null;
  const awayTeam = match ? getTeam(match.awayTeamId) : null;

  useEffect(() => {
    if (!match || !currentSet) return;
    const ruleSet = match.ruleSet;
    const target = ruleSet.setTargetScores[match.currentSetIndex] ?? 25;
    const winBy = ruleSet.winBy;
    const { home, away } = currentSet.score;
    if (home >= target && home - away >= winBy) {
      setSetBreakWinner('home');
      setSetBreakVisible(true);
      completeSet('home');
    } else if (away >= target && away - home >= winBy) {
      setSetBreakWinner('away');
      setSetBreakVisible(true);
      completeSet('away');
    }
  }, [currentSet?.score, match?.currentSetIndex, match?.ruleSet]);

  const nextServer = useMemo(() => {
    if (!currentSet) return null;
    const side = currentSet.servingTeam;
    if (!side) return null;
    const court = currentSet[side].court;
    const zone1Player = court[0];
    return zone1Player;
  }, [currentSet]);

  const remainingSubsHome = (match?.ruleSet.substitutionsPerSet ?? 15) - (currentSet?.home.subsUsed ?? 0);
  const remainingSubsAway = (match?.ruleSet.substitutionsPerSet ?? 15) - (currentSet?.away.subsUsed ?? 0);

  const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
  const topRowHeight = TOP_ROW_HEIGHT;
  const actionPanelHeight = 80;
  const availableHeight = windowHeight - topRowHeight - actionPanelHeight;
  const courtHeight = Math.floor((2 / 3) * availableHeight);
  const courtWidth = courtHeight / 2;
  const benchStripWidth = Math.floor((windowWidth - SCOREBOARD_WIDTH) / 2);
  const scoreboardWidth = SCOREBOARD_WIDTH;
  const courtLeftOffset = Math.floor((windowWidth - courtWidth) / 2);
  const displayHomeColor = useMemo(() => {
    if (!homeTeam || !awayTeam) return homeTeam?.teamColor ?? DEFAULT_HOME_COLOR;
    return homeTeam.teamColor;
  }, [homeTeam, awayTeam]);
  const displayAwayColor = useMemo(() => {
    if (!homeTeam || !awayTeam) return awayTeam?.teamColor ?? DEFAULT_AWAY_COLOR;
    const same = homeTeam.teamColor.toLowerCase() === awayTeam.teamColor.toLowerCase();
    return same ? DEFAULT_AWAY_COLOR : awayTeam.teamColor;
  }, [homeTeam, awayTeam]);
  const displayHomeNumberColor = homeTeam?.numberColor ?? '#ffffff';
  const displayAwayNumberColor = awayTeam?.numberColor ?? '#ffffff';

  const homeZones: CourtZoneData[] = useMemo(() => {
    if (!currentSet || !homeTeam) return [];
    const team = currentSet.home;
    const teamColor = displayHomeColor;
    const numberColor = displayHomeNumberColor;
    return [1, 2, 3, 4, 5, 6].map((zoneId) => {
      const num = team.court[zoneId - 1];
      const isLibero = num !== null && team.liberoState.onCourtLiberoNumber === num;
      const isServer = currentSet.servingTeam === 'home' && zoneId === 1 && num === nextServer;
      return {
        playerNumber: num,
        isLibero,
        isServer,
        teamColor,
        numberColor,
        liberoColor: homeTeam.liberoColor,
      };
    });
  }, [currentSet, homeTeam, nextServer, displayHomeColor, displayHomeNumberColor]);

  const awayZones: CourtZoneData[] = useMemo(() => {
    if (!currentSet || !awayTeam) return [];
    const team = currentSet.away;
    const teamColor = displayAwayColor;
    const numberColor = displayAwayNumberColor;
    return [1, 2, 3, 4, 5, 6].map((zoneId) => {
      const num = team.court[zoneId - 1];
      const isLibero = num !== null && team.liberoState.onCourtLiberoNumber === num;
      const isServer = currentSet.servingTeam === 'away' && zoneId === 1 && num === nextServer;
      return {
        playerNumber: num,
        isLibero,
        isServer,
        teamColor,
        numberColor,
        liberoColor: awayTeam.liberoColor,
      };
    });
  }, [currentSet, awayTeam, nextServer, displayAwayColor, displayAwayNumberColor]);

  const zoneBounds = useMemo(() => {
    const zoneW = courtWidth / 3;
    const zoneH = courtHeight / 2 / 2;
    const halfH = courtHeight / 2;
    const bounds: ReturnType<typeof getZoneBounds>[] = [];
    for (const zone of [1, 2, 3, 4, 5, 6] as ZoneId[]) {
      bounds.push(getZoneBounds('away', zone, zoneW, zoneH, halfH));
      bounds.push(getZoneBounds('home', zone, zoneW, zoneH, halfH));
    }
    return bounds;
  }, [courtWidth, courtHeight]);

  const benchHome = useMemo(() => {
    if (!currentSet || !homeTeam) return [];
    const onCourt = new Set(currentSet.home.court.filter((n): n is number => n != null));
    return homeTeam.rosterNumbers.filter((n) => !onCourt.has(n));
  }, [currentSet?.home.court, homeTeam?.rosterNumbers]);

  const benchAway = useMemo(() => {
    if (!currentSet || !awayTeam) return [];
    const onCourt = new Set(currentSet.away.court.filter((n): n is number => n != null));
    return awayTeam.rosterNumbers.filter((n) => !onCourt.has(n));
  }, [currentSet?.away.court, awayTeam?.rosterNumbers]);

  const handleZonePress = (side: Side, zone: ZoneId) => {
    if (liberoMode === 'in' && liberoSide === side && BACK_ROW_ZONES.includes(zone)) {
      const team = currentSet?.[side];
      const playerInZone = team?.court[zone - 1];
      if (playerInZone != null && team?.liberoState.designatedLiberos.length) {
        const lib = team.liberoState.designatedLiberos[0];
        liberoIn(side, zone, playerInZone);
        setLiberoModalVisible(false);
        setLiberoMode('choose_side');
        setLiberoSide(null);
      }
      return;
    }
    if (subModalVisible && subOutgoingZone === null) {
      setSubSide(side);
      setSubOutgoingZone(zone);
      return;
    }
  };

  const handleLiberoIn = (side: Side) => {
    setLiberoSide(side);
    setLiberoMode('in');
  };

  const handleLiberoOut = (side: Side) => {
    liberoOut(side);
    setLiberoModalVisible(false);
    setLiberoMode('choose_side');
    setLiberoSide(null);
  };

  const handleSubPlayer = (number: number) => {
    if (subSide == null || subOutgoingZone == null) return;
    const remaining = subSide === 'home' ? remainingSubsHome : remainingSubsAway;
    if (appMode === 'guided' && remaining <= 0) {
      setViolation('No substitutions remaining this set (15 max).');
      return;
    }
    setViolation(null);
    substitution(subSide, subOutgoingZone, number);
    setSubModalVisible(false);
    setSubSide(null);
    setSubOutgoingZone(null);
  };

  const handleDrop = useCallback(
    (source: DragSource, side: 'home' | 'away', zoneId: ZoneId) => {
      if (source.type === 'libero') {
        liberoOut(source.side);
        const playerInZone = currentSet?.[side].court[zoneId - 1];
        if (playerInZone != null) liberoIn(side, zoneId, playerInZone);
        return;
      }
      if (source.type === 'bench') {
        const remaining = source.side === 'home' ? remainingSubsHome : remainingSubsAway;
        if (appMode === 'guided' && remaining <= 0) {
          setViolation('No substitutions remaining this set (15 max).');
          return;
        }
        setViolation(null);
        substitution(source.side, zoneId, source.playerNumber);
      }
    },
    [currentSet, liberoIn, liberoOut, substitution, appMode, remainingSubsHome, remainingSubsAway]
  );

  const handleSetBreakConfirm = (liberosHome: number[], liberosAway: number[]) => {
    startNextSet(liberosHome, liberosAway);
    const updated = useMatchStore.getState().match;
    if (updated) saveMatch(updated);
    setSetBreakVisible(false);
    setSetBreakWinner(null);
  };

  useEffect(() => {
    if (match) saveMatch(match);
  }, [currentSet?.score, currentSet?.eventLog?.length]);

  if (!match || !homeTeam || !awayTeam) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loading}>Loading match…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ViolationBanner
        visible={violation != null}
        message={violation ?? ''}
        onFix={() => setViolation(null)}
        onOverride={appMode === 'guided' ? () => { setAppMode('coach'); setViolation(null); } : undefined}
      />

      <ScrollView
        style={styles.courtScroll}
        contentContainerStyle={[styles.courtScrollContent, { alignItems: 'center' }]}
        showsVerticalScrollIndicator={false}
      >
        <CourtView
          width={courtWidth}
          height={courtHeight}
          homeZones={homeZones}
          awayZones={awayZones}
          onDrop={handleDrop}
          backRowZones={BACK_ROW_ZONES}
        />
      </ScrollView>

      <View style={[styles.topRowOverlay, { top: 0, left: 0, right: 0, height: topRowHeight }]} pointerEvents="box-none">
        <View style={[styles.benchWrap, { width: benchStripWidth }]}>
          <BenchStrip
            side="home"
            label={homeTeam.name}
            benchNumbers={benchHome}
            teamColor={displayHomeColor}
            numberColor={displayHomeNumberColor}
            courtWidth={courtWidth}
            courtHeight={courtHeight}
            zoneBounds={zoneBounds}
            onDrop={(side, zoneId, playerNumber) => handleDrop({ type: 'bench', side: 'home', playerNumber }, side, zoneId)}
            stripWidth={benchStripWidth - 8}
            layoutMode="portrait"
            courtYOffset={topRowHeight}
            stripLeft={0}
            courtLeftOffset={courtLeftOffset}
          />
        </View>
        <View style={[styles.scoreboardWrap, { width: scoreboardWidth }]}>
          <Scoreboard
            homeScore={currentSet?.score.home ?? 0}
            awayScore={currentSet?.score.away ?? 0}
            homeName={homeTeam.name}
            awayName={awayTeam.name}
            setIndex={match.currentSetIndex}
            totalSets={match.ruleSet.setTargetScores.length}
            servingTeam={currentSet?.servingTeam ?? null}
            serverNumber={nextServer ?? null}
            onUndo={undo}
            canUndo={(currentSet?.eventLog.length ?? 0) > 0}
            compact
          />
        </View>
        <View style={[styles.benchWrap, { width: benchStripWidth }]}>
          <BenchStrip
            side="away"
            label={awayTeam.name}
            benchNumbers={benchAway}
            teamColor={displayAwayColor}
            numberColor={displayAwayNumberColor}
            courtWidth={courtWidth}
            courtHeight={courtHeight}
            zoneBounds={zoneBounds}
            onDrop={(side, zoneId, playerNumber) => handleDrop({ type: 'bench', side: 'away', playerNumber }, side, zoneId)}
            stripWidth={benchStripWidth - 8}
            layoutMode="portrait"
            courtYOffset={topRowHeight}
            stripLeft={benchStripWidth + scoreboardWidth}
            courtLeftOffset={courtLeftOffset}
          />
        </View>
      </View>

      <View style={styles.actionPanel}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.pointHome]}
          onPress={() => point('home')}
        >
          <Text style={styles.actionBtnText}>Point Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.pointAway]}
          onPress={() => point('away')}
        >
          <Text style={styles.actionBtnText}>Point Away</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.undoBtn]}
          onPress={undo}
          disabled={!(currentSet?.eventLog.length)}
        >
          <Text style={styles.actionBtnText}>Undo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.liberoBtn]}
          onPress={() => { setLiberoModalVisible(true); setLiberoMode('choose_side'); }}
        >
          <Text style={styles.actionBtnText}>Libero</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.subBtn]}
          onPress={() => { setSubModalVisible(true); setSubSide(null); setSubOutgoingZone(null); }}
        >
          <Text style={styles.actionBtnText}>Sub</Text>
        </TouchableOpacity>
      </View>

      <LiberoModal
        visible={liberoModalVisible}
        onClose={() => { setLiberoModalVisible(false); setLiberoMode('choose_side'); setLiberoSide(null); }}
        onLiberoIn={handleLiberoIn}
        onLiberoOut={handleLiberoOut}
        mode={liberoMode}
        selectedSide={liberoSide}
      />

      <SubstitutionModal
        visible={subModalVisible}
        onClose={() => { setSubModalVisible(false); setSubSide(null); setSubOutgoingZone(null); }}
        side={subSide}
        rosterNumbers={subSide === 'home' ? homeTeam.rosterNumbers : subSide === 'away' ? awayTeam.rosterNumbers : []}
        teamColor={subSide === 'home' ? homeTeam.teamColor : subSide === 'away' ? awayTeam.teamColor : '#888'}
        numberColor={subSide === 'home' ? homeTeam.numberColor : subSide === 'away' ? awayTeam.numberColor : '#fff'}
        outgoingZone={subOutgoingZone}
        onSelectZone={() => {}}
        onSelectPlayer={handleSubPlayer}
        remainingSubs={subSide === 'home' ? remainingSubsHome : subSide === 'away' ? remainingSubsAway : 0}
      />

      <SetBreakModal
        visible={setBreakVisible}
        setWinner={setBreakWinner}
        homeScore={currentSet?.score.home ?? 0}
        awayScore={currentSet?.score.away ?? 0}
        homeName={homeTeam.name}
        awayName={awayTeam.name}
        nextSetIndex={match.currentSetIndex}
        totalSets={match.ruleSet.setTargetScores.length}
        setWinners={match.setWinners}
        homeRoster={homeTeam.rosterNumbers}
        awayRoster={awayTeam.rosterNumbers}
        homeLiberoColor={homeTeam.liberoColor}
        awayLiberoColor={awayTeam.liberoColor}
        onConfirm={handleSetBreakConfirm}
        onMatchComplete={() => { setSetBreakVisible(false); setSetBreakWinner(null); router.replace('/'); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loading: { fontSize: 18, color: '#666' },
  topRowOverlay: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  benchWrap: { paddingVertical: 4 },
  scoreboardWrap: { justifyContent: 'center', alignItems: 'center' },
  courtScroll: { flex: 1 },
  courtScrollContent: { paddingVertical: 0 },
  courtRow: { flexDirection: 'row', alignItems: 'stretch' },
  benchColumn: { justifyContent: 'center', gap: 8 },
  actionPanel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionBtn: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  actionBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  pointHome: { backgroundColor: '#1a5fb4' },
  pointAway: { backgroundColor: '#3584e4' },
  undoBtn: { backgroundColor: '#5e5c64' },
  liberoBtn: { backgroundColor: '#c64600' },
  subBtn: { backgroundColor: '#26a269' },
});
