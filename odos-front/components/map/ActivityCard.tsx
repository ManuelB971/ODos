import React, { memo, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { MapPin as MapPinIcon } from 'lucide-react-native';
import { DaIcon } from '@/components/ui/DaIcon';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useOdosColors, type OdosColorPalette } from '@/context/ThemeContext';
import { OdosTokens } from '@/constants/themes/tokens';
import { ApiActivity } from '@/types';
import { resolveImageUrl } from '@/utils/imageUrl';
import { ActivityCardQuickActions } from '@/components/cards/ActivityCardQuickActions';

export type ActivityCardProps = {
  activity: ApiActivity;
  /** Distance en km (si connue) — affichée à côté de la note. */
  distanceKm?: number | null;
  active?: boolean;
  /** Si `true`, la card prend la largeur de son container (utile pour la liste pleine). */
  fullWidth?: boolean;
  /** Masque les contrôles rapides (cœur + parcours) — ex. cartes non interactives. */
  hideQuickActions?: boolean;
  onPress?: () => void;
};

function ActivityCardComponent({ activity, distanceKm, active = false, fullWidth = false, hideQuickActions = false, onPress }: ActivityCardProps) {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const img = resolveImageUrl(activity.imageUrl);
  const scale = useSharedValue(1);

  React.useEffect(() => {
    scale.value = withTiming(active ? 1.06 : 1, { duration: 280 });
  }, [active, scale]);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const categoryLabel =
    typeof activity.category === 'string'
      ? activity.category
      : activity.category?.name ?? '';

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, active && styles.cardActive, fullWidth && styles.cardFull]}
      accessibilityRole="button"
      accessibilityLabel={`Activité ${activity.name}`}
    >
      <View style={styles.imageWrap}>
        <Animated.View style={[StyleSheet.absoluteFill, imageStyle]}>
          {img ? (
            <Image
              source={{ uri: img }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={250}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.imagePlaceholder]} />
          )}
        </Animated.View>


        {/* Contrôles rapides — haut gauche (cœur favori + ajout à un parcours) */}
        {!hideQuickActions ? (
          <ActivityCardQuickActions activity={{ id: activity.id, name: activity.name }} />
        ) : null}

        {/* Rating — haut droite, toujours blanc sur sombre */}
        {typeof activity.ratingAverage === 'number' && activity.ratingAverage > 0 ? (
          <View style={styles.ratingBadge}>
            <DaIcon name="etoile" variant="badge" accessibilityLabel="Note" />
            <Text style={styles.ratingText}>{activity.ratingAverage.toFixed(1)}</Text>
          </View>
        ) : null}

        {/* Texte en bas de l'image — toujours blanc sur gradient sombre */}
        <View style={styles.body}>
          <Text numberOfLines={1} style={styles.title}>
            {activity.name}
          </Text>
          <View style={styles.metaLine}>
            <MapPinIcon size={12} color="rgba(255,255,255,0.75)" />
            <Text numberOfLines={1} style={styles.metaText}>
              {activity.city ?? 'Lieu non précisé'}
              {typeof distanceKm === 'number' ? ` · ${distanceKm.toFixed(1)} km` : ''}
            </Text>
          </View>
          {categoryLabel ? (
            <View style={styles.categoryBadge}>
              <Text numberOfLines={1} style={styles.categoryText}>
                {categoryLabel}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export const ActivityCard = memo(ActivityCardComponent);
ActivityCard.displayName = 'ActivityCard';

export const ActivityCardSkeleton = memo(function ActivityCardSkeleton() {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.card, styles.skeletonCard]}>
      <View style={[styles.imageWrap, styles.imagePlaceholder]} />
      <View style={styles.body}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonLine} />
      </View>
    </View>
  );
});

export const ACTIVITY_CARD_WIDTH = 280;
export const ACTIVITY_CARD_GAP = 12;

function createStyles(colors: OdosColorPalette) {
  return StyleSheet.create({
    card: {
      width: ACTIVITY_CARD_WIDTH,
      marginRight: ACTIVITY_CARD_GAP,
      borderRadius: 16,
      backgroundColor: colors.elevated,
      overflow: 'hidden',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    cardActive: {
      borderWidth: 1.5,
      borderColor: colors.mapPrimaryCta,
    },
    cardFull: {
      width: '100%',
      marginRight: 0,
    },
    imageWrap: {
      width: '100%',
      aspectRatio: 4 / 3,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    imagePlaceholder: {
      backgroundColor: colors.surface,
    },
    ratingBadge: {
      position: 'absolute',
      top: 10,
      right: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(17,24,28,0.72)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
    },
    ratingText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },
    body: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 12,
      paddingTop: 28,
      backgroundColor: 'rgba(17,24,28,0.62)',
    },
    title: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
      marginBottom: 3,
      textShadowColor: 'rgba(0,0,0,0.4)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    metaLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 6,
    },
    metaText: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.82)',
      flex: 1,
    },
    categoryBadge: {
      alignSelf: 'flex-start',
      backgroundColor: OdosTokens.orangePrimary,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      maxWidth: '70%',
    },
    categoryText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.4,
    },
    skeletonCard: {
      opacity: 0.6,
    },
    skeletonTitle: {
      height: 14,
      borderRadius: 4,
      backgroundColor: colors.surface,
      marginBottom: 8,
    },
    skeletonLine: {
      height: 10,
      width: '60%',
      borderRadius: 4,
      backgroundColor: colors.surface,
    },
  });
}
