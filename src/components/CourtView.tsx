/**
 * Volleyball court: programmatic two-square court + player circles.
 * Portrait: two squares (height = 2 * width). Net and attack line at 1/3.
 */

import React, { useCallback, useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { CourtSvg } from './CourtSvg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { ZoneId } from '../types';

export interface CourtZoneData {
  playerNumber: number | null;
  isLibero?: boolean;
  isServer?: boolean;
  teamColor: string;
  numberColor: string;
  liberoColor?: string;
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

export type DragSource = { type: 'libero'; side: 'home' | 'away'; zoneId: ZoneId } | { type: 'bench'; side: 'home' | 'away'; playerNumber: number };

interface CourtViewProps {
  width: number;
  /** Height defaults to 2*width (two squares). Pass to override. */
  height?: number;
  homeZones: CourtZoneData[];
  awayZones: CourtZoneData[];
  onDrop?: (source: DragSource, side: 'home' | 'away', zoneId: ZoneId) => void;
  backRowZones?: ZoneId[];
}

const ZONE_GRID: { zone: ZoneId; row: number; col: number }[] = [
  { zone: 4, row: 0, col: 0 },
  { zone: 3, row: 0, col: 1 },
  { zone: 2, row: 0, col: 2 },
  { zone: 5, row: 1, col: 0 },
  { zone: 6, row: 1, col: 1 },
  { zone: 1, row: 1, col: 2 },
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
  const grid = ZONE_GRID.find((z) => z.zone === zoneId)!;
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
            borderWidth: isLibero ? 3 : 2,
            borderColor: isLibero ? '#c64600' : 'rgba(0,0,0,0.3)',
            alignItems: 'center',
            justifyContent: 'center',
          },
          animatedStyle,
        ]}
      >
        <Text style={{ color: numberColor, fontSize: size * 0.45, fontWeight: '800' }}>{number}</Text>
      </Animated.View>
    </GestureDetector>
  );
}

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
}: {
  number: number;
  fillColor: string;
  numberColor: string;
  size: number;
  x: number;
  y: number;
  isServer?: boolean;
  isLibero?: boolean;
}) {
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
          borderWidth: isServer ? 3 : 2,
          borderColor: isServer ? '#ffcc00' : isLibero ? '#c64600' : 'rgba(0,0,0,0.3)',
        },
      ]}
    >
      <Text style={[styles.playerNumber, { color: numberColor, fontSize: size * 0.45 }]}>{number}</Text>
    </View>
  );
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
  const zoneBoundsRef = useRef<ZoneBounds[]>([]);

  zoneBoundsRef.current = (() => {
    const bounds: ZoneBounds[] = [];
    for (const { zone } of ZONE_GRID) {
      bounds.push(getZoneBounds('away', zone, zoneW, zoneH, halfH));
      bounds.push(getZoneBounds('home', zone, zoneW, zoneH, halfH));
    }
    return bounds;
  })();

  const zoneCenter = (z: ZoneBounds) => ({
    x: z.x + z.width / 2 - circleSize / 2,
    y: z.y + z.height / 2 - circleSize / 2,
  });

  const content = (
    <>
      {/* Away side */}
      {ZONE_GRID.map(({ zone }) => {
        const data = awayZones[zone - 1];
        if (!data || data.playerNumber == null) return null;
        const num = data.playerNumber;
        const center = zoneCenter(getZoneBounds('away', zone, zoneW, zoneH, halfH));
        const fill = data.isLibero && data.liberoColor ? data.liberoColor : data.teamColor;
        const isLibero = data.isLibero === true;
        if (onDrop && isLibero) {
          return (
            <DraggableCircle
              key={`away-${zone}`}
              number={num}
              fillColor={fill}
              numberColor={data.numberColor}
              size={circleSize}
              initialX={center.x}
              initialY={center.y}
              source={{ type: 'libero', side: 'away', zoneId: zone }}
              zoneBoundsRef={zoneBoundsRef}
              backRowZones={backRowZones}
              onDrop={onDrop}
              isLibero
            />
          );
        }
        return (
          <PlayerCircle
            key={`away-${zone}`}
            number={num}
            fillColor={fill}
            numberColor={data.numberColor}
            size={circleSize}
            x={center.x}
            y={center.y}
            isServer={data.isServer}
            isLibero={isLibero}
          />
        );
      })}
      {/* Home side */}
      {ZONE_GRID.map(({ zone }) => {
        const data = homeZones[zone - 1];
        if (!data || data.playerNumber == null) return null;
        const num = data.playerNumber;
        const center = zoneCenter(getZoneBounds('home', zone, zoneW, zoneH, halfH));
        const fill = data.isLibero && data.liberoColor ? data.liberoColor : data.teamColor;
        const isLibero = data.isLibero === true;
        if (onDrop && isLibero) {
          return (
            <DraggableCircle
              key={`home-${zone}`}
              number={num}
              fillColor={fill}
              numberColor={data.numberColor}
              size={circleSize}
              initialX={center.x}
              initialY={center.y}
              source={{ type: 'libero', side: 'home', zoneId: zone }}
              zoneBoundsRef={zoneBoundsRef}
              backRowZones={backRowZones}
              onDrop={onDrop}
              isLibero
            />
          );
        }
        return (
          <PlayerCircle
            key={`home-${zone}`}
            number={num}
            fillColor={fill}
            numberColor={data.numberColor}
            size={circleSize}
            x={center.x}
            y={center.y}
            isServer={data.isServer}
            isLibero={isLibero}
          />
        );
      })}
    </>
  );

  return (
    <View style={[styles.wrapper, { width, height }]}>
      <View style={[styles.courtLayer, { width, height }]} pointerEvents="none">
        <CourtSvg width={width} height={height} />
      </View>
      <View style={[styles.playersLayer, { width, height }]} pointerEvents="box-none">
        {content}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative' },
  courtLayer: { position: 'absolute', left: 0, top: 0, zIndex: 0, elevation: 0 },
  playersLayer: { position: 'absolute', left: 0, top: 0, zIndex: 10, elevation: 10 },
  playerCircle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerNumber: { fontWeight: '800' },
});
