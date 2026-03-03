/**
 * Bench players on the side – draggable circles. Drop on a court zone to sub in.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { ZoneBounds } from './CourtView';
import type { ZoneId } from '../types';

const SPRING_CONFIG = { damping: 15, stiffness: 150 };

function pointInZone(px: number, py: number, z: ZoneBounds): boolean {
  return px >= z.x && px <= z.x + z.width && py >= z.y && py <= z.y + z.height;
}

function DraggableBenchCircle({
  number,
  teamColor,
  numberColor,
  size,
  initialX,
  initialY,
  courtWidth,
  courtHeight,
  zoneBounds,
  onDrop,
  side,
  layoutMode,
  courtYOffset,
  stripLeft,
  courtLeftOffset = 0,
}: {
  number: number;
  teamColor: string;
  numberColor: string;
  size: number;
  initialX: number;
  initialY: number;
  courtWidth: number;
  courtHeight?: number;
  zoneBounds: ZoneBounds[];
  onDrop: (side: 'home' | 'away', zoneId: ZoneId, playerNumber: number) => void;
  side: 'home' | 'away';
  layoutMode: BenchLayoutMode;
  courtYOffset?: number;
  stripLeft?: number;
  courtLeftOffset?: number;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const handleDrop = useCallback(
    (zoneSide: 'home' | 'away', zoneId: ZoneId) => {
      onDrop(zoneSide, zoneId, number);
    },
    [number, onDrop]
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
    .onEnd(() => {
      let courtLocalX: number;
      let courtLocalY: number;
      let inCourt: boolean;
      if (layoutMode === 'portrait' && courtYOffset != null && courtHeight != null && stripLeft != null) {
        const containerX = stripLeft + initialX + size / 2 + translateX.value;
        const containerY = initialY + size / 2 + translateY.value;
        const courtLeft = courtLeftOffset ?? 0;
        courtLocalX = containerX - courtLeft;
        courtLocalY = containerY - courtYOffset;
        inCourt = containerY >= courtYOffset && courtLocalY < courtHeight && courtLocalX >= 0 && courtLocalX <= courtWidth;
      } else {
        const containerX = courtWidth + initialX + size / 2 + translateX.value;
        const containerY = initialY + size / 2 + translateY.value;
        courtLocalX = containerX;
        courtLocalY = containerY;
        inCourt = containerX >= 0 && containerX <= courtWidth;
      }
      if (!inCourt) {
        translateX.value = withSpring(0, SPRING_CONFIG);
        translateY.value = withSpring(0, SPRING_CONFIG);
        return;
      }
      for (const z of zoneBounds) {
        if (z.side !== side) continue;
        if (pointInZone(courtLocalX, courtLocalY, z)) {
          runOnJS(handleDrop)(z.side, z.zoneId);
          break;
        }
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
          styles.circle,
          {
            left: initialX,
            top: initialY,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: teamColor,
            borderWidth: 2,
            borderColor: 'rgba(0,0,0,0.3)',
          },
          animatedStyle,
        ]}
      >
        <Text style={[styles.number, { color: numberColor, fontSize: size * 0.45 }]}>{number}</Text>
      </Animated.View>
    </GestureDetector>
  );
}

export type BenchLayoutMode = 'landscape' | 'portrait';

interface BenchStripProps {
  side: 'home' | 'away';
  benchNumbers: number[];
  teamColor: string;
  numberColor: string;
  courtWidth: number;
  zoneBounds: ZoneBounds[];
  onDrop: (side: 'home' | 'away', zoneId: ZoneId, playerNumber: number) => void;
  stripWidth?: number;
  label?: string;
  layoutMode?: BenchLayoutMode;
  courtYOffset?: number;
  courtHeight?: number;
  stripLeft?: number;
  /** Court left edge (e.g. when court is centered). For drop detection. */
  courtLeftOffset?: number;
}

export function BenchStrip({
  side,
  benchNumbers,
  teamColor,
  numberColor,
  courtWidth,
  zoneBounds,
  onDrop,
  stripWidth = 88,
  label,
  layoutMode = 'landscape',
  courtYOffset,
  courtHeight,
  stripLeft = 0,
  courtLeftOffset = 0,
}: BenchStripProps) {
  const size = 40;
  const gap = 6;
  const padding = 8;

  return (
    <View style={[styles.strip, { width: stripWidth }]}>
      {label != null && <Text style={styles.label}>{label}</Text>}
      <View style={styles.row}>
        {benchNumbers.map((num, i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          const initialX = padding + col * (size + gap);
          const initialY = padding + (label ? 20 : 0) + row * (size + gap);
          return (
            <DraggableBenchCircle
              key={num}
              number={num}
              teamColor={teamColor}
              numberColor={numberColor}
              size={size}
              initialX={initialX}
              initialY={initialY}
              courtWidth={courtWidth}
              courtHeight={courtHeight}
              zoneBounds={zoneBounds}
              onDrop={onDrop}
              side={side}
              layoutMode={layoutMode}
              courtYOffset={courtYOffset}
              stripLeft={stripLeft}
              courtLeftOffset={courtLeftOffset}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  row: {
    position: 'relative',
    minHeight: 100,
  },
  circle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: { fontWeight: '800' },
});
