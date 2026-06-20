import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { MapPin, Route } from 'lucide-react-native';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { resolveImageUrl } from '@/utils/imageUrl';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';
import type { ChatActivitySnippet, ChatParcoursSnippet } from '@/types';

/**
 * Carte d'activité partagée dans un fil (chat privé ou groupe). Tap → fiche
 * activité. Bordure encre en Mosaïque pop. Composant partagé pour garantir une
 * présentation identique entre messages privés et messages de groupe.
 */
export function MessageActivityCard({ activity }: { activity: ChatActivitySnippet }) {
  const colors = useOdosColors();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();

  const uri = resolveImageUrl(activity.imageUrl);
  const ink = isMosaicPop ? pop.ink : colors.text;
  const sub = isMosaicPop ? pop.muted : colors.muted;
  const cardBg = isMosaicPop ? pop.paper : colors.surface;

  return (
    <Pressable
      onPress={() => router.push(`/activity/${activity.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Voir l'activité ${activity.name}`}
      style={[
        styles.card,
        { backgroundColor: cardBg, borderColor: isMosaicPop ? pop.ink : colors.border },
        isMosaicPop && { borderWidth: 2 },
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.image} contentFit="cover" />
      ) : (
        <View style={[styles.image, styles.imageFallback, { backgroundColor: isMosaicPop ? pop.orange : colors.accent }]}>
          <MapPin size={22} color={isMosaicPop ? pop.ink : colors.onAccent} />
        </View>
      )}
      <View style={styles.text}>
        <Text style={[styles.name, { color: ink }]} numberOfLines={2}>{activity.name}</Text>
        {activity.city ? (
          <Text style={[styles.city, { color: sub }]} numberOfLines={1}>{activity.city}</Text>
        ) : null}
        <Text style={[styles.cta, { color: isMosaicPop ? pop.orange : colors.accent }]}>Voir l’activité ›</Text>
      </View>
    </Pressable>
  );
}

/**
 * Carte de parcours partagé dans un fil. Tap → détail du parcours (édition
 * collaborative). Style aligné sur la carte activité.
 */
export function MessageParcoursCard({ parcours }: { parcours: ChatParcoursSnippet }) {
  const colors = useOdosColors();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();

  const ink = isMosaicPop ? pop.ink : colors.text;
  const sub = isMosaicPop ? pop.muted : colors.muted;
  const cardBg = isMosaicPop ? pop.paper : colors.surface;
  const accent = isMosaicPop ? pop.orange : colors.accent;

  return (
    <Pressable
      onPress={() => router.push(`/parcours/${parcours.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Voir le parcours ${parcours.title}`}
      style={[
        styles.card,
        { backgroundColor: cardBg, borderColor: isMosaicPop ? pop.ink : colors.border },
        isMosaicPop && { borderWidth: 2 },
      ]}
    >
      <View style={[styles.image, styles.imageFallback, { backgroundColor: accent }]}>
        <Route size={22} color={isMosaicPop ? pop.ink : colors.onAccent} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.name, { color: ink }]} numberOfLines={2}>{parcours.title}</Text>
        <Text style={[styles.city, { color: sub }]}>
          Parcours · {parcours.itemCount} étape{parcours.itemCount > 1 ? 's' : ''}
        </Text>
        <Text style={[styles.cta, { color: accent }]}>Voir le parcours ›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 10, borderRadius: 12, borderWidth: 1, padding: 8, width: 240 },
  image: { width: 56, height: 56, borderRadius: 8 },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, justifyContent: 'center' },
  name: { fontFamily: FontFamily.uiBold, fontSize: 14 },
  city: { fontFamily: FontFamily.ui, fontSize: 12, marginTop: 2 },
  cta: { fontFamily: FontFamily.uiMedium, fontSize: 12, marginTop: 4 },
});
