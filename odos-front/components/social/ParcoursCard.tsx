import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Route, Users } from 'lucide-react-native';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { resolveImageUrl } from '@/utils/imageUrl';
import { PopSurface } from '@/components/pop/PopSurface';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';
import type { ParcoursSummary } from '@/types';

/**
 * Carte de bibliothèque « playlist » (façon Spotify) : pochette + titre + méta
 * (nb d'étapes, badge partagé/collaboratif). Tap → détail `/parcours/{id}`.
 */
export function ParcoursCard({ parcours }: { parcours: ParcoursSummary }) {
  const colors = useOdosColors();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();

  const cover = resolveImageUrl(parcours.coverImageUrl);
  const ink = isMosaicPop ? pop.ink : colors.text;
  const sub = isMosaicPop ? pop.muted : colors.muted;
  const accent = isMosaicPop ? pop.orange : colors.accent;

  const meta = `${parcours.itemCount} étape${parcours.itemCount > 1 ? 's' : ''}`;
  const shared = !parcours.isOwner;
  const collaborative = parcours.collaboratorCount > 0;

  const popBorder = isMosaicPop ? { borderWidth: 2, borderColor: pop.ink } : null;
  const cover_node = cover ? (
    <Image source={{ uri: cover }} style={[styles.cover, popBorder]} contentFit="cover" />
  ) : (
    <View style={[styles.cover, styles.coverFallback, { backgroundColor: accent }, popBorder]}>
      <Route size={26} color={isMosaicPop ? pop.ink : colors.onAccent} />
    </View>
  );

  const body = (
    <>
      {cover_node}
      <View style={styles.text}>
        <Text style={[styles.title, { color: ink }]} numberOfLines={1}>
          {parcours.title}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.meta, { color: sub }]} numberOfLines={1}>
            {meta}
            {shared ? ' · Partagé' : ''}
          </Text>
          {collaborative ? (
            <View style={styles.collabPill}>
              <Users size={12} color={accent} />
              <Text style={[styles.collabText, { color: accent }]}>{parcours.collaboratorCount + 1}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </>
  );

  if (isMosaicPop) {
    return (
      <Pressable
        onPress={() => router.push(`/parcours/${parcours.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`Ouvrir le parcours ${parcours.title}`}
        style={({ pressed }) => (pressed ? styles.popPressed : undefined)}
      >
        <PopSurface shadow={5} radius={14} contentStyle={styles.popContent}>{body}</PopSurface>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => router.push(`/parcours/${parcours.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir le parcours ${parcours.title}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.85 },
      ]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, borderWidth: 1, padding: 12 },
  popContent: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12 },
  popPressed: { transform: [{ translateX: 1.5 }, { translateY: 1.5 }] },
  cover: { width: 64, height: 64, borderRadius: 10 },
  coverFallback: { alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0, gap: 4 },
  title: { fontFamily: FontFamily.uiBold, fontSize: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meta: { fontFamily: FontFamily.ui, fontSize: 13, flexShrink: 1 },
  collabPill: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  collabText: { fontFamily: FontFamily.uiBold, fontSize: 12 },
});
