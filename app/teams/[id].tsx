/**
 * Team setup screen: name, colors, roster builder.
 * Create new (id=new) or edit existing.
 */

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
        <Text style={styles.label}>Jersey / number color</Text>
        <View style={styles.colorRow}>
          <ColorButton label="Team" value={teamColor} onPress={() => setTeamColor('#1a5fb4')} />
          <ColorButton label="Numbers" value={numberColor} onPress={() => setNumberColor('#ffffff')} />
          <ColorButton label="Libero" value={liberoColor} onPress={() => setLiberoColor('#c64600')} />
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

function ColorButton({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.colorButton} onPress={onPress}>
      <View style={[styles.colorSwatch, { backgroundColor: value }]} />
      <Text style={styles.colorLabel}>{label}</Text>
    </TouchableOpacity>
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
  colorRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  colorButton: { alignItems: 'center' },
  colorSwatch: { width: 44, height: 44, borderRadius: 22, marginBottom: 4 },
  colorLabel: { fontSize: 12, color: '#666' },
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
