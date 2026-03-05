/**
 * Team setup screen: name, colors, roster builder.
 * Create new (id=new) or edit existing.
 * Color picking: preset palette on all platforms; on web, native color input for custom.
 */

import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useTeamsStore } from '../../src/store/useTeamsStore';
import type { TeamProfile } from '../../src/types';
import { NumberChip } from '../../src/components/NumberChip';
import { RosterGrid } from '../../src/components/RosterGrid';

const DEFAULT_COLORS = {
  teamColor: '#1a5fb4',
  numberColor: '#ffffff',
  liberoColor: '#c64600',
};

/** Preset colors so tapping actually changes the color (works on web and native). */
const TEAM_COLOR_PRESETS = [
  '#1a5fb4', '#c64600', '#26a269', '#813d9c', '#3584e4', '#e5a50a',
  '#2ec27e', '#a347ba', '#ed333b', '#1c71d8', '#33d17a', '#986a44',
];
const NUMBER_COLOR_PRESETS = [
  '#ffffff', '#000000', '#f5f5f5', '#2d2d2d', '#f9f06b', '#ffebe6',
  '#e0e0e0', '#1a1a1a', '#ffcc00', '#c0c0c0',
];
const LIBERO_COLOR_PRESETS = [
  '#c64600', '#9b59b6', '#27ae60', '#e67e22', '#3498db', '#e74c3c',
  '#1abc9c', '#f1c40f', '#95a5a6', '#2ecc71',
];

export default function TeamSetupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const getTeam = useTeamsStore((s) => s.getTeam);
  const addTeam = useTeamsStore((s) => s.addTeam);
  const updateTeam = useTeamsStore((s) => s.updateTeam);
  const deleteTeam = useTeamsStore((s) => s.deleteTeam);

  const [name, setName] = useState('');
  const [teamColor, setTeamColor] = useState(DEFAULT_COLORS.teamColor);
  const [numberColor, setNumberColor] = useState(DEFAULT_COLORS.numberColor);
  const [liberoColor, setLiberoColor] = useState(DEFAULT_COLORS.liberoColor);
  const [rosterNumbers, setRosterNumbers] = useState<number[]>([]);
  const [pasteInput, setPasteInput] = useState('');

  const isNew = id === 'new' || !id;
  const team = !isNew ? getTeam(id) : null;

  useEffect(() => {
    if (team) {
      setName(team.name);
      setTeamColor(team.teamColor);
      setNumberColor(team.numberColor);
      setLiberoColor(team.liberoColor);
      setRosterNumbers(team.rosterNumbers);
    }
  }, [team?.id]);

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Enter a team name.');
      return;
    }
    if (isNew) {
      const created = addTeam({
        name: trimmed,
        teamColor,
        numberColor,
        liberoColor,
        rosterNumbers,
      });
      router.replace(`/teams/${created.id}`);
    } else {
      updateTeam(id!, {
        name: trimmed,
        teamColor,
        numberColor,
        liberoColor,
        rosterNumbers,
      });
      router.back();
    }
  };

  const removeNumber = (num: number) => {
    setRosterNumbers((prev) => prev.filter((n) => n !== num));
  };

  const addNumber = (num: number) => {
    if (num < 1 || num > 99) return;
    if (rosterNumbers.includes(num)) return;
    setRosterNumbers((prev) => [...prev, num].sort((a, b) => a - b));
  };

  const handlePaste = () => {
    const parts = pasteInput.split(/[\s,]+/).map((s) => parseInt(s, 10));
    const valid = parts.filter((n) => !Number.isNaN(n) && n >= 1 && n <= 99);
    const combined = [...new Set([...rosterNumbers, ...valid])].sort((a, b) => a - b);
    setRosterNumbers(combined);
    setPasteInput('');
  };

  const handleDelete = () => {
    if (!isNew) {
      Alert.alert('Delete team', 'Remove this team?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { deleteTeam(id!); router.replace('/teams'); } },
      ]);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.field}>
        <Text style={styles.label}>Team name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Thunder 14U"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Team color</Text>
        <View style={styles.colorRow}>
          {TEAM_COLOR_PRESETS.map((hex) => (
            <ColorSwatch
              key={hex}
              hex={hex}
              selected={teamColor.toLowerCase() === hex.toLowerCase()}
              onPress={() => setTeamColor(hex)}
            />
          ))}
          {Platform.OS === 'web' && (
            <WebColorInput value={teamColor} onChange={setTeamColor} />
          )}
        </View>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Jersey number color</Text>
        <View style={styles.colorRow}>
          {NUMBER_COLOR_PRESETS.map((hex) => (
            <ColorSwatch
              key={hex}
              hex={hex}
              selected={numberColor.toLowerCase() === hex.toLowerCase()}
              onPress={() => setNumberColor(hex)}
            />
          ))}
          {Platform.OS === 'web' && (
            <WebColorInput value={numberColor} onChange={setNumberColor} />
          )}
        </View>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Libero jersey color</Text>
        <View style={styles.colorRow}>
          {LIBERO_COLOR_PRESETS.map((hex) => (
            <ColorSwatch
              key={hex}
              hex={hex}
              selected={liberoColor.toLowerCase() === hex.toLowerCase()}
              onPress={() => setLiberoColor(hex)}
            />
          ))}
          {Platform.OS === 'web' && (
            <WebColorInput value={liberoColor} onChange={setLiberoColor} />
          )}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Roster numbers</Text>
        <Text style={styles.hint}>Tap to add, or paste comma-separated numbers</Text>
        <TextInput
          style={styles.input}
          value={pasteInput}
          onChangeText={setPasteInput}
          placeholder="e.g. 1, 3, 5, 7, 9, 11"
          placeholderTextColor="#999"
          onSubmitEditing={handlePaste}
        />
        <TouchableOpacity style={styles.pasteButton} onPress={handlePaste}>
          <Text style={styles.pasteButtonText}>Paste numbers</Text>
        </TouchableOpacity>
        <RosterGrid
          selected={rosterNumbers}
          onAdd={addNumber}
          onRemove={removeNumber}
          teamColor={teamColor}
          numberColor={numberColor}
        />
        <View style={styles.chipRow}>
          {rosterNumbers.map((n) => (
            <NumberChip
              key={n}
              number={n}
              teamColor={teamColor}
              numberColor={numberColor}
              onPress={() => removeNumber(n)}
              size="large"
            />
          ))}
        </View>
      </View>

      <TouchableOpacity style={[styles.bigButton, { backgroundColor: '#1a5fb4' }]} onPress={save}>
        <Text style={styles.bigButtonText}>{isNew ? 'Create team' : 'Save'}</Text>
      </TouchableOpacity>

      {!isNew && (
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Delete team</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function ColorSwatch({
  hex,
  selected,
  onPress,
}: {
  hex: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.colorSwatch,
        { backgroundColor: hex },
        selected && styles.colorSwatchSelected,
      ]}
      accessibilityLabel={`Color ${hex}`}
    />
  );
}

/** Web-only: native color picker. Invisible input overlays the swatch so tap opens browser picker. */
function WebColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const normalized = value.startsWith('#') ? value : `#${value}`;
  return (
    <View style={styles.webColorInputWrap}>
      <View style={[styles.colorSwatch, { backgroundColor: normalized }]} />
      {typeof document !== 'undefined' &&
        React.createElement('input', {
          type: 'color',
          value: normalized,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
          style: {
            position: 'absolute',
            top: 0,
            left: 0,
            width: 44,
            height: 44,
            opacity: 0,
            cursor: 'pointer',
          },
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24 },
  field: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  hint: { fontSize: 12, color: '#666', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'center' },
  colorSwatch: { width: 44, height: 44, borderRadius: 22 },
  colorSwatchSelected: { borderWidth: 3, borderColor: '#1a1a1a' },
  webColorInputWrap: { position: 'relative', width: 44, height: 44 },
  pasteButton: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    alignItems: 'center',
  },
  pasteButtonText: { fontSize: 14, fontWeight: '600', color: '#333' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  bigButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  bigButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  deleteButton: { marginTop: 16, padding: 16, alignItems: 'center' },
  deleteButtonText: { color: '#c01c28', fontSize: 16 },
});
