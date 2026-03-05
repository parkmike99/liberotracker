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
import { loadJson, saveJson, STORAGE_KEYS } from '../../src/storage';
import type { StoredMatchSummaries } from '../../src/storage/types';
import { CourtView, type CourtZoneData, type DragSource, getZoneBounds } from '../../src/components/CourtView';
import { COURT_BORDER_PERCENT } from '../../src/components/CourtSvg';
import { BenchStrip } from '../../src/components/BenchStrip';
import { Scoreboard } from '../../src/components/Scoreboard';
import { LiberoModal } from '../../src/components/LiberoModal';
import { SubstitutionModal } from '../../src/components/SubstitutionModal';
import { SetBreakModal } from '../../src/components/SetBreakModal';
import { ViolationBanner } from '../../src/components/ViolationBanner';
import { InstructionBanner } from '../../src/components/InstructionBanner';
import { useAppModeStore } from '../../src/store/useAppModeStore';
import type { Side, ZoneId } from '../../src/types';
import { getPairMate, getPairIndex, SUB_PAIR_OUTLINE_COLORS } from '../../src/types';

const BACK_ROW_ZONES: ZoneId[] = [1, 6, 5];
const SCOREBOARD_HEIGHT = 56;
const BENCH_SIDE_WIDTH = 56;
const COURT_TOP_PADDING = 48;
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
  const actionPanelHeight = 80;
  const courtTotalWidth = (w: number) => w * (1 + 2 * COURT_BORDER_PERCENT);
  const availableHeight = windowHeight - actionPanelHeight - SCOREBOARD_HEIGHT;
  const courtHeight = Math.floor((2 / 3) * availableHeight);
  const courtWidth = Math.min(courtHeight / 2, Math.floor((windowWidth - 2 * BENCH_SIDE_WIDTH - 16) / (1 + 2 * COURT_BORDER_PERCENT)));
  const totalCourtW = courtTotalWidth(courtWidth);
  const totalContentWidth = 2 * BENCH_SIDE_WIDTH + totalCourtW;
  const contentLeftOffset = Math.floor((windowWidth - totalContentWidth) / 2);
  const courtLeftOffset = contentLeftOffset + BENCH_SIDE_WIDTH;
  const courtYOffset = SCOREBOARD_HEIGHT + COURT_TOP_PADDING;
  const stripLeftHome = contentLeftOffset;
  const stripLeftAway = contentLeftOffset + BENCH_SIDE_WIDTH + totalCourtW;
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
      const pairMate = num != null && !team.liberoState.designatedLiberos.includes(num) ? getPairMate(team, num) : null;
      const pairIdx = num != null ? getPairIndex(team, num) : -1;
      const pairOutlineColor = pairIdx >= 0 ? SUB_PAIR_OUTLINE_COLORS[pairIdx % SUB_PAIR_OUTLINE_COLORS.length] : null;
      return {
        playerNumber: num,
        isLibero,
        isServer,
        teamColor,
        numberColor,
        liberoColor: homeTeam.liberoColor,
        pairMateNumber: pairMate ?? undefined,
        pairOutlineColor: pairOutlineColor ?? undefined,
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
      const pairMate = num != null && !team.liberoState.designatedLiberos.includes(num) ? getPairMate(team, num) : null;
      const pairIdx = num != null ? getPairIndex(team, num) : -1;
      const pairOutlineColor = pairIdx >= 0 ? SUB_PAIR_OUTLINE_COLORS[pairIdx % SUB_PAIR_OUTLINE_COLORS.length] : null;
      return {
        playerNumber: num,
        isLibero,
        isServer,
        teamColor,
        numberColor,
        liberoColor: awayTeam.liberoColor,
        pairMateNumber: pairMate ?? undefined,
        pairOutlineColor: pairOutlineColor ?? undefined,
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
    return homeTeam.rosterNumbers.filter((n) => !onCourt.has(n)).sort((a, b) => a - b);
  }, [currentSet?.home.court, homeTeam?.rosterNumbers]);

  const benchAway = useMemo(() => {
    if (!currentSet || !awayTeam) return [];
    const onCourt = new Set(currentSet.away.court.filter((n): n is number => n != null));
    return awayTeam.rosterNumbers.filter((n) => !onCourt.has(n)).sort((a, b) => a - b);
  }, [currentSet?.away.court, awayTeam?.rosterNumbers]);

  /** Liberos on bench (designated but not on court) for drag-to-back-row = Libero IN */
  const liberosOnBenchHome = useMemo(() => {
    if (!currentSet?.home.liberoState.designatedLiberos.length) return [];
    const onCourt = currentSet.home.liberoState.onCourtLiberoNumber;
    return currentSet.home.liberoState.designatedLiberos.filter((n) => n !== onCourt);
  }, [currentSet?.home.liberoState.designatedLiberos, currentSet?.home.liberoState.onCourtLiberoNumber]);

  const liberosOnBenchAway = useMemo(() => {
    if (!currentSet?.away.liberoState.designatedLiberos.length) return [];
    const onCourt = currentSet.away.liberoState.onCourtLiberoNumber;
    return currentSet.away.liberoState.designatedLiberos.filter((n) => n !== onCourt);
  }, [currentSet?.away.liberoState.designatedLiberos, currentSet?.away.liberoState.onCourtLiberoNumber]);

  const getPairInfoHome = useCallback(
    (playerNumber: number) => {
      if (!currentSet) return { pairMate: null as number | null, outlineColor: null as string | null };
      const team = currentSet.home;
      const pairMate = getPairMate(team, playerNumber);
      const idx = getPairIndex(team, playerNumber);
      const outlineColor = idx >= 0 ? SUB_PAIR_OUTLINE_COLORS[idx % SUB_PAIR_OUTLINE_COLORS.length] : null;
      return { pairMate, outlineColor };
    },
    [currentSet]
  );

  const getPairInfoAway = useCallback(
    (playerNumber: number) => {
      if (!currentSet) return { pairMate: null as number | null, outlineColor: null as string | null };
      const team = currentSet.away;
      const pairMate = getPairMate(team, playerNumber);
      const idx = getPairIndex(team, playerNumber);
      const outlineColor = idx >= 0 ? SUB_PAIR_OUTLINE_COLORS[idx % SUB_PAIR_OUTLINE_COLORS.length] : null;
      return { pairMate, outlineColor };
    },
    [currentSet]
  );

  const handleZonePress = (side: Side, zone: ZoneId) => {
    if (liberoMode === 'in' && liberoSide === side && BACK_ROW_ZONES.includes(zone)) {
      const team = currentSet?.[side];
      const playerInZone = team?.court[zone - 1];
      if (playerInZone != null && team?.liberoState.designatedLiberos.length) {
        const result = liberoIn(side, zone, playerInZone);
        if (result.success) {
          setLiberoModalVisible(false);
          setLiberoMode('choose_side');
          setLiberoSide(null);
          setViolation(null);
        } else {
          setViolation(result.violation ?? 'Libero replacement not allowed.');
        }
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
    setLiberoModalVisible(false);
  };

  const handleLiberoOutReturn = () => {
    if (liberoSide == null) return;
    const result = liberoOut(liberoSide);
    if (result.success) {
      setViolation(null);
      setLiberoModalVisible(false);
      setLiberoMode('choose_side');
      setLiberoSide(null);
    } else {
      setViolation(result.violation ?? 'Libero out failed.');
    }
  };

  const handleLiberoOutSubPairMate = (playerNumber: number) => {
    if (liberoSide == null) return;
    const result = liberoOut(liberoSide, { incomingNumber: playerNumber });
    if (result.success) {
      setViolation(null);
      setLiberoModalVisible(false);
      setLiberoMode('choose_side');
      setLiberoSide(null);
    } else {
      setViolation(result.violation ?? 'Sub not allowed.');
    }
  };

  const liberoOutReplacedPlayer = liberoSide != null && currentSet ? currentSet[liberoSide].liberoState.replacedPlayerNumber ?? null : null;
  const liberoOutPairMate = liberoOutReplacedPlayer != null && currentSet && liberoSide != null
    ? getPairMate(currentSet[liberoSide], liberoOutReplacedPlayer)
    : null;
  const liberoOutRemainingSubs = liberoSide === 'home' ? remainingSubsHome : liberoSide === 'away' ? remainingSubsAway : 0;

  const handleSubPlayer = (number: number) => {
    if (subSide == null || subOutgoingZone == null) return;
    const remaining = subSide === 'home' ? remainingSubsHome : remainingSubsAway;
    if (appMode === 'guided' && remaining <= 0) {
      setViolation('No substitutions remaining this set (15 max).');
      return;
    }
    const result = substitution(subSide, subOutgoingZone, number);
    if (result.success) {
      setViolation(null);
      setSubModalVisible(false);
      setSubSide(null);
      setSubOutgoingZone(null);
    } else {
      setViolation(result.violation ?? 'Substitution not allowed.');
    }
  };

  const handleDrop = useCallback(
    (source: DragSource, side: 'home' | 'away', zoneId: ZoneId) => {
      if (source.type === 'libero') {
        liberoOut(source.side);
        const playerInZone = currentSet?.[side].court[zoneId - 1];
        if (playerInZone != null) {
          const result = liberoIn(source.side, zoneId, playerInZone);
          if (!result.success) setViolation(result.violation ?? 'Libero replacement not allowed.');
        }
        return;
      }
      if (source.type === 'bench') {
        if (source.isLibero && BACK_ROW_ZONES.includes(zoneId)) {
          const playerInZone = currentSet?.[side].court[zoneId - 1];
          if (playerInZone != null && !currentSet?.[side].liberoState.designatedLiberos.includes(playerInZone)) {
            const result = liberoIn(side, zoneId, playerInZone, source.playerNumber);
            if (result.success) setViolation(null);
            else setViolation(result.violation ?? 'Libero replacement not allowed.');
          } else {
            setViolation('Libero can only replace a back-row non-libero player.');
          }
          return;
        }
        const remaining = source.side === 'home' ? remainingSubsHome : remainingSubsAway;
        if (appMode === 'guided' && remaining <= 0) {
          setViolation('No substitutions remaining this set (15 max).');
          return;
        }
        const result = substitution(source.side, zoneId, source.playerNumber);
        if (result.success) {
          setViolation(null);
        } else {
          setViolation(result.violation ?? 'Substitution not allowed.');
        }
      }
    },
    [currentSet, liberoIn, liberoOut, substitution, appMode, remainingSubsHome, remainingSubsAway]
  );

  const handleSetBreakConfirm = (liberosHome: number[], liberosAway: number[]) => {
    if (setBreakWinner == null) return;
    startNextSet(liberosHome, liberosAway, setBreakWinner);
    const updated = useMatchStore.getState().match;
    if (updated) saveMatch(updated);
    setSetBreakVisible(false);
    setSetBreakWinner(null);
  };

  useEffect(() => {
    if (!match) return;
    saveMatch(match);
    const home = useTeamsStore.getState().getTeam(match.homeTeamId);
    const away = useTeamsStore.getState().getTeam(match.awayTeamId);
    if (home && away) {
      const summary = {
        id: match.id,
        homeName: home.name,
        awayName: away.name,
        setWinners: match.setWinners,
        updatedAt: match.updatedAt,
      };
      loadJson<StoredMatchSummaries>(STORAGE_KEYS.MATCH_SUMMARIES).then((data) => {
        const next = { ...(data || {}), [match.id]: JSON.stringify(summary) };
        return saveJson(STORAGE_KEYS.MATCH_SUMMARIES, next);
      });
    }
  }, [match?.id, match?.updatedAt, currentSet?.score, currentSet?.eventLog?.length]);

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
      <InstructionBanner
        visible={liberoMode === 'in'}
        message="Tap a back-row zone (1, 6, 5) or drag libero from bench onto a back-row zone"
        onCancel={() => { setLiberoMode('choose_side'); setLiberoSide(null); setLiberoModalVisible(false); }}
      />
      <InstructionBanner
        visible={subModalVisible && subOutgoingZone === null}
        message="Tap the outgoing player's zone on the court"
        onCancel={() => { setSubModalVisible(false); setSubSide(null); setSubOutgoingZone(null); }}
      />

      <View style={styles.mainRow}>
        <View style={styles.centerColumn}>
          <View style={[styles.scoreboardBar, { height: SCOREBOARD_HEIGHT }]}>
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
          <ScrollView
            style={styles.courtScroll}
            contentContainerStyle={[styles.courtScrollContent, { paddingTop: COURT_TOP_PADDING, paddingBottom: 16, alignItems: 'center' }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.courtRow}>
              <View style={[styles.sideBenchWrap, { width: BENCH_SIDE_WIDTH }]}>
                <BenchStrip
                  side="home"
                  label={homeTeam.name}
                  benchNumbers={benchHome}
                  teamColor={displayHomeColor}
                  numberColor={displayHomeNumberColor}
                  courtWidth={courtWidth}
                  courtHeight={courtHeight}
                  zoneBounds={zoneBounds}
                  onDrop={(side, zoneId, playerNumber, isLibero) => handleDrop({ type: 'bench', side: 'home', playerNumber, isLibero }, side, zoneId)}
                  stripWidth={BENCH_SIDE_WIDTH - 8}
                  layoutMode="portrait"
                  courtYOffset={courtYOffset}
                  stripLeft={stripLeftHome}
                  courtLeftOffset={courtLeftOffset}
                  getPairInfo={getPairInfoHome}
                  liberoNumbers={liberosOnBenchHome}
                  liberoColor={homeTeam.liberoColor}
                  displayLayout="column"
                />
              </View>
              <CourtView
                width={courtWidth}
                height={courtHeight}
                homeZones={homeZones}
                awayZones={awayZones}
                onDrop={handleDrop}
                backRowZones={BACK_ROW_ZONES}
              />
              <View style={[styles.sideBenchWrap, styles.sideBenchWrapRight, { width: BENCH_SIDE_WIDTH }]}>
                <BenchStrip
                  side="away"
                  label={awayTeam.name}
                  benchNumbers={benchAway}
                  teamColor={displayAwayColor}
                  numberColor={displayAwayNumberColor}
                  courtWidth={courtWidth}
                  courtHeight={courtHeight}
                  zoneBounds={zoneBounds}
                  onDrop={(side, zoneId, playerNumber, isLibero) => handleDrop({ type: 'bench', side: 'away', playerNumber, isLibero }, side, zoneId)}
                  stripWidth={BENCH_SIDE_WIDTH - 8}
                  layoutMode="portrait"
                  courtYOffset={courtYOffset}
                  stripLeft={stripLeftAway}
                  courtLeftOffset={courtLeftOffset}
                  getPairInfo={getPairInfoAway}
                  liberoNumbers={liberosOnBenchAway}
                  liberoColor={awayTeam.liberoColor}
                  displayLayout="column"
                />
              </View>
            </View>
          </ScrollView>
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
        onClose={() => { setLiberoModalVisible(false); setLiberoMode('choose_side'); setLiberoSide(null); setViolation(null); }}
        onLiberoIn={handleLiberoIn}
        onSideChange={setLiberoSide}
        onLiberoOutRequest={liberoSide != null ? () => setViolation('No libero on court for this team.') : undefined}
        replacedPlayer={liberoOutReplacedPlayer}
        pairMate={liberoOutPairMate}
        remainingSubs={liberoOutRemainingSubs}
        onReturnReplaced={handleLiberoOutReturn}
        onSubPairMate={handleLiberoOutSubPairMate}
        mode={liberoMode}
        selectedSide={liberoSide}
      />

      <SubstitutionModal
        visible={subModalVisible && subOutgoingZone != null}
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
  mainRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  sideBenchWrap: {
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRightWidth: 1,
    borderLeftWidth: 0,
    borderColor: '#e0e0e0',
    zIndex: 10,
    elevation: 10,
  },
  sideBenchWrapRight: {
    borderRightWidth: 0,
    borderLeftWidth: 1,
  },
  centerColumn: {
    flex: 1,
    minWidth: 0,
    zIndex: 0,
    elevation: 0,
  },
  scoreboardBar: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  courtScroll: { flex: 1 },
  courtScrollContent: {},
  courtRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
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
