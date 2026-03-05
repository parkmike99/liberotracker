/**
 * Volleyball court: programmatic two-square court + player circles.
 * Portrait: two squares (height = 2 * width). Net and attack line at 1/3.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { CourtSvg, COURT_BORDER_PERCENT } from './CourtSvg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { ZoneId } from '../types';

export interface CourtZoneData {
  playerNumber: number | null;
  isLibero?: boolean;
  isServer?: boolean;
  teamColor: string;
  numberColor: string;
  liberoColor?: string;
  /** Substitution pair: show outline and small number of paired player (not used for liberos). */
  pairMateNumber?: number | null;
  pairOutlineColor?: string | null;
}

/** Bounds in court-local coordinates (same as width/height) */
export interface ZoneBounds {
  side: 'home' | 'away';
  zoneId: ZoneId;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type DragSource =
  | { type: 'libero'; side: 'home' | 'away'; zoneId: ZoneId }
  | { type: 'bench'; side: 'home' | 'away'; playerNumber: number; isLibero?: boolean };

interface CourtViewProps {
  width: number;
  /** Height defaults to 2*width (two squares). Pass to override. */
  height?: number;
  homeZones: CourtZoneData[];
  awayZones: CourtZoneData[];
  onDrop?: (source: DragSource, side: 'home' | 'away', zoneId: ZoneId) => void;
  backRowZones?: ZoneId[];
}

/** Bottom team: front row 4-3-2, back row 5-6-1 (server/zone 1 at bottom-right) */
const ZONE_GRID: { zone: ZoneId; row: number; col: number }[] = [
  { zone: 4, row: 0, col: 0 },
  { zone: 3, row: 0, col: 1 },
  { zone: 2, row: 0, col: 2 },
  { zone: 5, row: 1, col: 0 },
  { zone: 6, row: 1, col: 1 },
  { zone: 1, row: 1, col: 2 },
];

/** Top team: same layout as bottom but rotated 180° (row and col flip: front↔back, left↔right) */
const AWAY_ZONE_GRID: { zone: ZoneId; row: number; col: number }[] = [
  { zone: 1, row: 0, col: 0 },
  { zone: 6, row: 0, col: 1 },
  { zone: 5, row: 0, col: 2 },
  { zone: 2, row: 1, col: 0 },
  { zone: 3, row: 1, col: 1 },
  { zone: 4, row: 1, col: 2 },
];

const SPRING_CONFIG = { damping: 15, stiffness: 150 };

/** Exported for drop detection in bench/court shared layout */
export function getZoneBounds(
  side: 'home' | 'away',
  zoneId: ZoneId,
  zoneW: number,
  zoneH: number,
  halfH: number
): ZoneBounds {
  const grid = side === 'away' ? AWAY_ZONE_GRID.find((z) => z.zone === zoneId)! : ZONE_GRID.find((z) => z.zone === zoneId)!;
  const col = grid.col;
  const row = grid.row;
  const y = side === 'away' ? row * zoneH : halfH + row * zoneH;
  return {
    side,
    zoneId,
    x: col * zoneW,
    y,
    width: zoneW,
    height: zoneH,
  };
}

function pointInZone(px: number, py: number, z: ZoneBounds): boolean {
  return px >= z.x && px <= z.x + z.width && py >= z.y && py <= z.y + z.height;
}

/** Draggable circle with number inside */
function DraggableCircle({
  number,
  fillColor,
  numberColor,
  size,
  initialX,
  initialY,
  source,
  zoneBoundsRef,
  backRowZones,
  onDrop,
  isLibero,
  pairMateNumber,
  pairOutlineColor,
}: {
  number: number;
  fillColor: string;
  numberColor: string;
  size: number;
  initialX: number;
  initialY: number;
  source: DragSource;
  zoneBoundsRef: React.MutableRefObject<ZoneBounds[]>;
  backRowZones: ZoneId[];
  onDrop: (source: DragSource, side: 'home' | 'away', zoneId: ZoneId) => void;
  isLibero?: boolean;
  pairMateNumber?: number | null;
  pairOutlineColor?: string | null;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const handleDrop = useCallback(
    (side: 'home' | 'away', zoneId: ZoneId) => {
      onDrop(source, side, zoneId);
    },
    [source, onDrop]
  );

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = startX.value + e.translationX;
      translateY.value = startY.value + e.translationY;
    })
    .onEnd((e) => {
      const centerX = initialX + translateX.value + size / 2;
      const centerY = initialY + translateY.value + size / 2;
      const bounds = zoneBoundsRef.current;
      for (const z of bounds) {
        if (!pointInZone(centerX, centerY, z)) continue;
        if (source.type === 'libero' && !backRowZones.includes(z.zoneId)) continue;
        runOnJS(handleDrop)(z.side, z.zoneId);
        translateX.value = withSpring(0, SPRING_CONFIG);
        translateY.value = withSpring(0, SPRING_CONFIG);
        return;
      }
      translateX.value = withSpring(0, SPRING_CONFIG);
      translateY.value = withSpring(0, SPRING_CONFIG);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  const borderColor = pairOutlineColor
    ? pairOutlineColor
    : isLibero
      ? '#c64600'
      : 'rgba(0,0,0,0.3)';
  const borderWidth = pairOutlineColor || isLibero ? 3 : 2;
  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: initialX,
            top: initialY,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: fillColor,
            borderWidth,
            borderColor,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
            elevation: 2,
          },
          animatedStyle,
        ]}
      >
        <Text style={{ color: numberColor, fontSize: size * 0.45, fontWeight: '800' }}>{number}</Text>
        {pairMateNumber != null && (
          <Text style={[styles.pairMateNumber, { color: numberColor, fontSize: size * 0.22 }]}>{pairMateNumber}</Text>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const ROTATION_ANIM_DURATION = 2000;

/** Static (non-draggable) circle for on-court players when drag is not in use for that type */
function PlayerCircle({
  number,
  fillColor,
  numberColor,
  size,
  x,
  y,
  isServer,
  isLibero,
  pairMateNumber,
  pairOutlineColor,
}: {
  number: number;
  fillColor: string;
  numberColor: string;
  size: number;
  x: number;
  y: number;
  isServer?: boolean;
  isLibero?: boolean;
  pairMateNumber?: number | null;
  pairOutlineColor?: string | null;
}) {
  const borderColor = pairOutlineColor
    ? pairOutlineColor
    : isServer
      ? '#ffcc00'
      : isLibero
        ? '#c64600'
        : 'rgba(0,0,0,0.3)';
  const borderWidth = pairOutlineColor ? 3 : isServer ? 3 : 2;
  return (
    <View
      style={[
        styles.playerCircle,
        {
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: fillColor,
          borderWidth,
          borderColor,
        },
      ]}
    >
      <Text style={[styles.playerNumber, { color: numberColor, fontSize: size * 0.45 }]}>{number}</Text>
      {pairMateNumber != null && (
        <Text style={[styles.pairMateNumber, { color: numberColor, fontSize: size * 0.22 }]}>{pairMateNumber}</Text>
      )}
    </View>
  );
}

/** Player circle that animates from previous zone to current zone on rotation */
function AnimatedPlayerCircle({
  side,
  playerNumber,
  currentZoneId,
  previousZoneId,
  zoneCenter,
  getZoneBounds,
  getServePosition,
  circleSize,
  zoneW,
  zoneH,
  halfH,
  width,
  height,
  isServer,
  fillColor,
  numberColor,
  isLibero,
  pairMateNumber,
  pairOutlineColor,
  onAnimationComplete,
}: {
  side: 'home' | 'away';
  playerNumber: number;
  currentZoneId: ZoneId;
  previousZoneId: ZoneId | undefined;
  zoneCenter: (z: ZoneBounds) => { x: number; y: number };
  getZoneBounds: (side: 'home' | 'away', zoneId: ZoneId, zoneW: number, zoneH: number, halfH: number) => ZoneBounds;
  getServePosition: (side: 'home' | 'away', zoneW: number, zoneH: number, halfH: number, width: number, height: number, circleSize: number) => { x: number; y: number };
  circleSize: number;
  zoneW: number;
  zoneH: number;
  halfH: number;
  width: number;
  height: number;
  isServer?: boolean;
  fillColor: string;
  numberColor: string;
  isLibero?: boolean;
  pairMateNumber?: number | null;
  pairOutlineColor?: string | null;
  onAnimationComplete?: (playerNumber: number, zoneId: ZoneId) => void;
}) {
  const currentZ = getZoneBounds(side, currentZoneId, zoneW, zoneH, halfH);
  const currentPos = isServer && currentZoneId === 1
    ? getServePosition(side, zoneW, zoneH, halfH, width, height, circleSize)
    : zoneCenter(currentZ);
  const prevZ = previousZoneId != null ? getZoneBounds(side, previousZoneId, zoneW, zoneH, halfH) : null;
  const prevPos = prevZ != null
    ? (isServer && previousZoneId === 1
        ? getServePosition(side, zoneW, zoneH, halfH, width, height, circleSize)
        : zoneCenter(prevZ))
    : null;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (previousZoneId != null && previousZoneId !== currentZoneId && prevPos != null) {
      translateX.value = prevPos.x - currentPos.x;
      translateY.value = prevPos.y - currentPos.y;
      translateX.value = withTiming(0, { duration: ROTATION_ANIM_DURATION });
      translateY.value = withTiming(0, { duration: ROTATION_ANIM_DURATION }, (finished) => {
        if (finished && onAnimationComplete) runOnJS(onAnimationComplete)(playerNumber, currentZoneId);
      });
    }
  }, [currentZoneId, previousZoneId]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  const borderColor = pairOutlineColor
    ? pairOutlineColor
    : isServer
      ? '#ffcc00'
      : isLibero
        ? '#c64600'
        : 'rgba(0,0,0,0.3)';
  const borderWidth = pairOutlineColor ? 3 : isServer ? 3 : 2;

  return (
    <Animated.View
      style={[
        styles.playerCircle,
        {
          left: currentPos.x,
          top: currentPos.y,
          width: circleSize,
          height: circleSize,
          borderRadius: circleSize / 2,
          backgroundColor: fillColor,
          borderWidth,
          borderColor,
          zIndex: 1,
          elevation: 1,
        },
        animatedStyle,
      ]}
    >
      <Text style={[styles.playerNumber, { color: numberColor, fontSize: circleSize * 0.45 }]}>{playerNumber}</Text>
      {pairMateNumber != null && (
        <Text style={[styles.pairMateNumber, { color: numberColor, fontSize: circleSize * 0.22 }]}>{pairMateNumber}</Text>
      )}
    </Animated.View>
  );
}

/** Server circle position: behind the back line. Away = back left (top-left), Home = back right (bottom-right). */
function getServePosition(side: 'home' | 'away', zoneW: number, zoneH: number, halfH: number, width: number, height: number, circleSize: number): { x: number; y: number } {
  if (side === 'away') {
    const centerX = 0.5 * zoneW;
    const centerY = -0.4 * zoneH;
    return { x: centerX - circleSize / 2, y: centerY - circleSize / 2 };
  }
  const centerX = 2.5 * zoneW;
  const centerY = height + 0.4 * zoneH;
  return { x: centerX - circleSize / 2, y: centerY - circleSize / 2 };
}

export function CourtView({
  width,
  height: heightProp,
  homeZones,
  awayZones,
  onDrop,
  backRowZones = [1, 6, 5],
}: CourtViewProps) {
  const height = heightProp ?? width * 2;
  const halfH = height / 2;
  const zoneW = width / 3;
  const zoneH = halfH / 2;
  const circleSize = Math.min(zoneW, zoneH) * 0.7;
  const border = width * COURT_BORDER_PERCENT;
  const totalW = width + 2 * border;
  const totalH = height + 2 * border;
  const zoneBoundsRef = useRef<ZoneBounds[]>([]);
  const prevHomeRef = useRef<Map<number, ZoneId>>(new Map());
  const prevAwayRef = useRef<Map<number, ZoneId>>(new Map());

  zoneBoundsRef.current = (() => {
    const bounds: ZoneBounds[] = [];
    for (const { zone } of ZONE_GRID) {
      bounds.push(getZoneBounds('away', zone, zoneW, zoneH, halfH));
      bounds.push(getZoneBounds('home', zone, zoneW, zoneH, halfH));
    }
    return bounds;
  })();

  const zoneCenter = useCallback((z: ZoneBounds) => ({
    x: z.x + z.width / 2 - circleSize / 2,
    y: z.y + z.height / 2 - circleSize / 2,
  }), [circleSize]);

  const awayPlayers = (() => {
    const list: (CourtZoneData & { zoneId: ZoneId; playerNumber: number })[] = [];
    for (let i = 0; i < 6; i++) {
      const data = awayZones[i];
      if (!data || data.playerNumber == null) continue;
      list.push({ ...data, zoneId: (i + 1) as ZoneId, playerNumber: data.playerNumber });
    }
    return list;
  })();
  const homePlayers = (() => {
    const list: (CourtZoneData & { zoneId: ZoneId; playerNumber: number })[] = [];
    for (let i = 0; i < 6; i++) {
      const data = homeZones[i];
      if (!data || data.playerNumber == null) continue;
      list.push({ ...data, zoneId: (i + 1) as ZoneId, playerNumber: data.playerNumber });
    }
    return list;
  })();

  if (awayPlayers.length === 6 && prevAwayRef.current.size === 0) {
    awayPlayers.forEach((p) => prevAwayRef.current.set(p.playerNumber, p.zoneId));
  }
  if (homePlayers.length === 6 && prevHomeRef.current.size === 0) {
    homePlayers.forEach((p) => prevHomeRef.current.set(p.playerNumber, p.zoneId));
  }
  const awayAllSynced = awayPlayers.length === 6 && awayPlayers.every((p) => prevAwayRef.current.get(p.playerNumber) === p.zoneId);
  const homeAllSynced = homePlayers.length === 6 && homePlayers.every((p) => prevHomeRef.current.get(p.playerNumber) === p.zoneId);
  if (awayAllSynced) {
    awayPlayers.forEach((p) => prevAwayRef.current.set(p.playerNumber, p.zoneId));
  }
  if (homeAllSynced) {
    homePlayers.forEach((p) => prevHomeRef.current.set(p.playerNumber, p.zoneId));
  }

  const onAwayAnimComplete = useCallback((playerNumber: number, zoneId: ZoneId) => {
    prevAwayRef.current.set(playerNumber, zoneId);
  }, []);
  const onHomeAnimComplete = useCallback((playerNumber: number, zoneId: ZoneId) => {
    prevHomeRef.current.set(playerNumber, zoneId);
  }, []);

  const content = (
    <>
      {/* Away side - by player for rotation animation */}
      {awayPlayers.map((data) => {
        const { zoneId, playerNumber } = data;
        const z = getZoneBounds('away', zoneId, zoneW, zoneH, halfH);
        const center = zoneCenter(z);
        const pos = (zoneId === 1 && data.isServer) ? getServePosition('away', zoneW, zoneH, halfH, width, height, circleSize) : center;
        const fill = data.isLibero && data.liberoColor ? data.liberoColor : data.teamColor;
        const isLibero = data.isLibero === true;
        if (onDrop && isLibero) {
          return (
            <DraggableCircle
              key={`away-${playerNumber}`}
              number={playerNumber}
              fillColor={fill}
              numberColor={data.numberColor}
              size={circleSize}
              initialX={pos.x}
              initialY={pos.y}
              source={{ type: 'libero', side: 'away', zoneId }}
              zoneBoundsRef={zoneBoundsRef}
              backRowZones={backRowZones}
              onDrop={onDrop}
              isLibero
              pairMateNumber={data.pairMateNumber}
              pairOutlineColor={data.pairOutlineColor}
            />
          );
        }
        return (
          <AnimatedPlayerCircle
            key={`away-${playerNumber}`}
            side="away"
            playerNumber={playerNumber}
            currentZoneId={zoneId}
            previousZoneId={prevAwayRef.current.get(playerNumber)}
            zoneCenter={zoneCenter}
            getZoneBounds={getZoneBounds}
            getServePosition={getServePosition}
            circleSize={circleSize}
            zoneW={zoneW}
            zoneH={zoneH}
            halfH={halfH}
            width={width}
            height={height}
            isServer={data.isServer}
            fillColor={fill}
            numberColor={data.numberColor}
            isLibero={isLibero}
            pairMateNumber={data.pairMateNumber}
            pairOutlineColor={data.pairOutlineColor}
            onAnimationComplete={onAwayAnimComplete}
          />
        );
      })}
      {/* Home side - by player for rotation animation */}
      {homePlayers.map((data) => {
        const { zoneId, playerNumber } = data;
        const z = getZoneBounds('home', zoneId, zoneW, zoneH, halfH);
        const center = zoneCenter(z);
        const pos = (zoneId === 1 && data.isServer) ? getServePosition('home', zoneW, zoneH, halfH, width, height, circleSize) : center;
        const fill = data.isLibero && data.liberoColor ? data.liberoColor : data.teamColor;
        const isLibero = data.isLibero === true;
        if (onDrop && isLibero) {
          return (
            <DraggableCircle
              key={`home-${playerNumber}`}
              number={playerNumber}
              fillColor={fill}
              numberColor={data.numberColor}
              size={circleSize}
              initialX={pos.x}
              initialY={pos.y}
              source={{ type: 'libero', side: 'home', zoneId }}
              zoneBoundsRef={zoneBoundsRef}
              backRowZones={backRowZones}
              onDrop={onDrop}
              isLibero
              pairMateNumber={data.pairMateNumber}
              pairOutlineColor={data.pairOutlineColor}
            />
          );
        }
        return (
          <AnimatedPlayerCircle
            key={`home-${playerNumber}`}
            side="home"
            playerNumber={playerNumber}
            currentZoneId={zoneId}
            previousZoneId={prevHomeRef.current.get(playerNumber)}
            zoneCenter={zoneCenter}
            getZoneBounds={getZoneBounds}
            getServePosition={getServePosition}
            circleSize={circleSize}
            zoneW={zoneW}
            zoneH={zoneH}
            halfH={halfH}
            width={width}
            height={height}
            isServer={data.isServer}
            fillColor={fill}
            numberColor={data.numberColor}
            isLibero={isLibero}
            pairMateNumber={data.pairMateNumber}
            pairOutlineColor={data.pairOutlineColor}
            onAnimationComplete={onHomeAnimComplete}
          />
        );
      })}
    </>
  );

  return (
    <View style={[styles.wrapper, { width: totalW, height: totalH }]} collapsable={false}>
      <View style={[styles.courtLayer, { width: totalW, height: totalH }]} pointerEvents="none">
        <CourtSvg width={width} height={height} />
      </View>
      <View style={[styles.playersLayer, { width, height, left: border, top: border }, styles.playersLayerOverflow]} pointerEvents="box-none">
        {content}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative', overflow: 'visible' as const },
  courtLayer: { position: 'absolute', left: 0, top: 0, zIndex: 0, elevation: 0 },
  playersLayer: { position: 'absolute', zIndex: 100, elevation: 100 },
  playersLayerOverflow: { overflow: 'visible' as const },
  playerCircle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    elevation: 1,
  },
  playerNumber: { fontWeight: '800' },
  pairMateNumber: { fontWeight: '700', marginTop: -2 },
});
