/**
 * Root layout: Stack + SafeArea, gesture handler, reanimated.
 * Hydrates stores on load.
 */

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTeamsStore } from '../src/store/useTeamsStore';
import { useMatchStore } from '../src/store/useMatchStore';
import { useAppModeStore } from '../src/store/useAppModeStore';
import { StyleSheet, View } from 'react-native';

export default function RootLayout() {
  const loadTeams = useTeamsStore((s) => s.load);
  const loadMatch = useMatchStore((s) => s.load);
  const loadAppMode = useAppModeStore((s) => s.load);

  useEffect(() => {
    loadTeams();
    loadMatch();
    loadAppMode();
  }, [loadTeams, loadMatch, loadAppMode]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <View style={styles.container}>
          <Stack
            screenOptions={{
              headerLargeTitle: true,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: '#f5f5f5' },
            }}
          >
            <Stack.Screen name="index" options={{ title: 'LiberoTracker' }} />
            <Stack.Screen name="teams/index" options={{ title: 'Teams' }} />
            <Stack.Screen name="teams/[id]" options={{ title: 'Team' }} />
            <Stack.Screen name="match/new" options={{ title: 'New Match' }} />
            <Stack.Screen name="match/[id]" options={{ title: 'Match', headerShown: false }} />
          </Stack>
          <StatusBar style="dark" />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
