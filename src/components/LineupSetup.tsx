/**
 * Lineup setup: drag roster numbers onto 6 court zones (one team).
 * Tap a filled zone to clear. Used in match setup before start.
 */

import React, { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { ZoneBounds } from './CourtView';
import type { TeamProfile } from '../types';
import type { CourtRow } from '../types';
import type { ZoneId } from '../types';

/** Zone layout for one half-court: 1=back right, 2=back middle, 3=back left, 4=front left, 5=front middle, 6=front right */
const ZONE_GRID: { zone: ZoneId; row: number; col: number }[] = [
  { zone: 4, row: 0, col: 0 },
  { zone: 3, row: 0, col: 1 },
  { zone: 2, row: 0, col: 2 },
  { zone: 5, row: 1, col: 0 },
  { zone: 6, row: 1, col: 1 },
  { zone: 1, row: 1, col: 2 },
];

const SPRING_CONFIG = { damping: 15, stiffness: 150 };

function pointInZone(px: number, py: number, z: ZoneBounds): boolean {
  return px >= z.x && px <= z.x + z.width && py >= z.y && py <= z.y + z.height;
}

const COURT_WIDTH = 240;
const COURT_HALF_HEIGHT = 120;

interface LineupSetupProps {
  team: TeamProfile;
  court: CourtRow;
  onChange: (court: CourtRow) => void;
  label: string;
}

/** Draggable roster number circle */
function DraggableRosterCircle({
  number,
  teamColor,
  numberColor,
  size,
  initialX,
  initialY,
  onDropEnd,
}: {
  number: number;
  teamColor: string;
  numberColor: string;
  size: number;
  initialX: number;
  initialY: number;
  onDropEnd: (playerNumber: number, absoluteX: number, absoluteY: number) => void;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

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
      runOnJS(onDropEnd)(number, e.absoluteX, e.absoluteY);
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
          styles.rosterCircle,
          {
            left: initialX,
            top: initialY,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: teamColor,
            borderWidth: 2,
            borderColor: 'rgba(0,0,0,0.3)',
            zIndex: 1000,
            elevation: 1000,
          },
          animatedStyle,
        ]}
      >
        <Text style={[styles.rosterNumber, { color: numberColor, fontSize: size * 0.45 }]}>{number}</Text>
      </Animated.View>
    </GestureDetector>
  );
}

export function LineupSetup({ team, court, onChange, label }: LineupSetupProps) {
  const courtRef = useRef<View>(null);
  const [courtLayout, setCourtLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const zoneW = COURT_WIDTH / 3;
  const zoneH = COURT_HALF_HEIGHT / 2;
  const zoneBoundsHome: ZoneBounds[] = ZONE_GRID.map(({ zone, row, col }) => ({
    side: 'home',
    zoneId: zone,
    x: col * zoneW,
    y: row * zoneH,
    width: zoneW,
    height: zoneH,
  }));

  const onLayoutCourt = useCallback(() => {
    courtRef.current?.measureInWindow((x, y, width, height) => {
      setCourtLayout({ x, y, width, height });
    });
  }, []);

  const handleDropEnd = useCallback(
    (playerNumber: number, absoluteX: number, absoluteY: number) => {
      if (!courtLayout) return;
      const localX = absoluteX - courtLayout.x;
      const localY = absoluteY - courtLayout.y;
      for (const z of zoneBoundsHome) {
        if (pointInZone(localX, localY, z)) {
          const idx = z.zoneId - 1;
          const next: CourtRow = [...court];
          next[idx] = playerNumber;
          onChange(next);
          break;
        }
      }
    },
    [court, courtLayout, onChange, zoneBoundsHome]
  );

  const handleZonePress = useCallback(
    (zoneId: ZoneId) => {
      const idx = zoneId - 1;
      if (court[idx] == null) return;
      const next: CourtRow = [...court];
      next[idx] = null;
      onChange(next);
    },
    [court, onChange]
  );

  const onCourt = new Set(court.filter((n): n is number => n != null));
  const availableRoster = team.rosterNumbers.filter((n) => !onCourt.has(n)).sort((a, b) => a - b);

  const size = 40;
  const gap = 6;
  const padding = 8;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <View
          ref={courtRef}
          onLayout={onLayoutCourt}
          style={[styles.courtWrap, { width: COURT_WIDTH, height: COURT_HALF_HEIGHT }]}
          collapsable={false}
        >
          <View style={[styles.courtInner, { width: COURT_WIDTH, height: COURT_HALF_HEIGHT, backgroundColor: '#d4b896' }]}>
            {ZONE_GRID.map(({ zone }) => {
              const z = zoneBoundsHome.find((zb) => zb.zoneId === zone)!;
              const num = court[zone - 1];
              return (
                <TouchableOpacity
                  key={zone}
                  style={[
                    styles.zoneSlot,
                    {
                      left: z.x,
                      top: z.y,
                      width: z.width,
                      height: z.height,
                      borderColor: num != null ? team.teamColor : 'rgba(0,0,0,0.25)',
                      backgroundColor: num != null ? team.teamColor : 'transparent',
                    },
                  ]}
                  onPress={() => handleZonePress(zone)}
                  activeOpacity={0.8}
                >
                  {num != null ? (
                    <Text style={[styles.zoneNumber, { color: team.numberColor }]}>{num}</Text>
                  ) : (
                    <Text style={styles.zoneEmpty}>{zone}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <View style={[styles.rosterStrip, { minHeight: 2 * size + gap + padding * 2 }]}>
          <Text style={styles.rosterLabel}>Drag to court</Text>
          {availableRoster.map((num, i) => {
            const col = i % 4;
            const row = Math.floor(i / 4);
            const initialX = padding + col * (size + gap);
            const initialY = padding + 20 + row * (size + gap);
            return (
              <DraggableRosterCircle
                key={num}
                number={num}
                teamColor={team.teamColor}
                numberColor={team.numberColor}
                size={size}
                initialX={initialX}
                initialY={initialY}
                onDropEnd={handleDropEnd}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  courtWrap: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  courtInner: { position: 'relative', overflow: 'visible' },
  zoneSlot: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneNumber: { fontSize: 22, fontWeight: '800' },
  zoneEmpty: { fontSize: 14, color: 'rgba(0,0,0,0.4)', fontWeight: '600' },
  rosterStrip: {
    flex: 1,
    minWidth: 180,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 8,
    position: 'relative',
  },
  rosterLabel: { fontSize: 12, color: '#666', marginBottom: 8 },
  rosterCircle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rosterNumber: { fontWeight: '800' },
});
