import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';

import { MapExperience } from '@/components/map/MapExperience';
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
  const query = useActivities();
  const error = query.error
    ? toAppError(query.error, 'Impossible de charger la carte.').userMessage
    : null;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />
      <MapExperience
        activities={query.data ?? []}
        loading={query.isLoading}
        error={error}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
