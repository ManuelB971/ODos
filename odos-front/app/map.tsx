import React, { useMemo } from 'react';
import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';

import { ThemedStatusBar } from '@/components/ThemedStatusBar';
import { MapExperience } from '@/components/map/MapExperience';
import { useOdosColors } from '@/context/ThemeContext';
import { useActivities } from '@/hooks/useActivities';
import { toAppError } from '@/utils/errorHandling';

/**
 * Route plein-écran `/map` — expérience immersive de découverte ODOS.
 *
 * Voulu comme une "surface produit" à part entière (pas un tab) : statusBar
 * claire, header caché, la map occupe toute la hauteur et le bottom sheet
 * vient par dessus. Depuis la home on y accède via un CTA dédié.
 */
export default function MapScreen() {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const query = useActivities();
  const error = query.error
    ? toAppError(query.error, 'Impossible de charger la carte.').userMessage
    : null;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <ThemedStatusBar />
      <MapExperience
        activities={query.data ?? []}
        loading={query.isLoading}
        error={error}
      />
    </View>
  );
}

function createStyles(colors: { background: string }) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });
}
