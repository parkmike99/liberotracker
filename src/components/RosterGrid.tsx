/**
 * Grid of jersey numbers to tap to add/remove from roster.
 * Used in team setup and substitution picker.
 */

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface RosterGridProps {
  selected: number[];
  onAdd: (num: number) => void;
  onRemove: (num: number) => void;
  teamColor: string;
  numberColor: string;
  /** If true, tapping toggles selection. If false, only add. */
  toggleMode?: boolean;
  /** Max numbers to show in grid (e.g. 1-30) */
  maxNumber?: number;
}

const DEFAULT_MAX = 30;

export function RosterGrid({
  selected,
  onAdd,
  onRemove,
  teamColor,
  numberColor,
  toggleMode = true,
  maxNumber = DEFAULT_MAX,
}: RosterGridProps) {
  const rows = Math.ceil(maxNumber / 6);
  const cells: number[] = [];
  for (let i = 1; i <= maxNumber; i++) cells.push(i);

  return (
    <View style={styles.grid}>
      {cells.map((num) => {
        const isSelected = selected.includes(num);
        return (
          <TouchableOpacity
            key={num}
            style={[
              styles.cell,
              { backgroundColor: isSelected ? teamColor : '#eee' },
            ]}
            onPress={() => {
              if (toggleMode) {
                if (isSelected) onRemove(num);
                else onAdd(num);
              } else {
                onAdd(num);
              }
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.cellText,
                { color: isSelected ? numberColor : '#666' },
              ]}
            >
              {num}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  cell: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: { fontSize: 18, fontWeight: '700' },
});
