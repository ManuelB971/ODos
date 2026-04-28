import React, { memo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { MapPin as MapPinIcon, Star } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Colors } from '@/constants/theme';
import { ApiActivity } from '@/types';
import { resolveImageUrl } from '@/utils/imageUrl';

export type ActivityCardProps = {
  activity: ApiActivity;
  /** Distance en km (si connue) — affichée à côté de la note. */
  distanceKm?: number | null;
  active?: boolean;
  /** Si `true`, la card prend la largeur de son container (utile pour la liste pleine). */
  fullWidth?: boolean;
  onPress?: () => void;
};

/**
 * Card d'activité "image-first" pour le carrousel horizontal au-dessus du bottom sheet.
 *
 * - Image 4:3 qui prend toute la largeur de la card (pattern Airbnb).
 * - Zoom image léger quand la card est active (micro-interaction).
 * - `expo-image` pour le lazy loading + placeholder automatique.
 */
function ActivityCardComponent({ activity, distanceKm, active = false, fullWidth = false, onPress }: ActivityCardProps) {
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

        {typeof activity.ratingAverage === 'number' && activity.ratingAverage > 0 ? (
          <View style={styles.ratingBadge}>
            <Star size={11} color="#fff" fill="#fff" />
            <Text style={styles.ratingText}>{activity.ratingAverage.toFixed(1)}</Text>
          </View>
        ) : null}

        {categoryLabel ? (
          <View style={styles.categoryBadge}>
            <Text numberOfLines={1} style={styles.categoryText}>
              {categoryLabel.toUpperCase()}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text numberOfLines={1} style={styles.title}>
          {activity.name}
        </Text>
        <View style={styles.metaLine}>
          <MapPinIcon size={12} color={Colors.light.muted} />
          <Text numberOfLines={1} style={styles.metaText}>
            {activity.city ?? 'Lieu non précisé'}
            {typeof distanceKm === 'number' ? ` · ${distanceKm.toFixed(1)} km` : ''}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export const ActivityCard = memo(ActivityCardComponent);
ActivityCard.displayName = 'ActivityCard';

/**
 * Squelette de card pour l'état loading (même dimensions que la vraie card).
 */
export const ActivityCardSkeleton = memo(function ActivityCardSkeleton() {
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

/**
 * Largeur "canonique" d'une card — utilisée par le carrousel pour le snap.
 */
export const ACTIVITY_CARD_WIDTH = 280;
export const ACTIVITY_CARD_GAP = 12;

const styles = StyleSheet.create({
  card: {
    width: ACTIVITY_CARD_WIDTH,
    marginRight: ACTIVITY_CARD_GAP,
    borderRadius: 16,
    backgroundColor: '#fff',
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
    borderColor: Colors.light.mapPrimaryCta,
  },
  cardFull: {
    width: '100%',
    marginRight: 0,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: Colors.light.surface,
    overflow: 'hidden',
  },
  imagePlaceholder: {
    backgroundColor: Colors.light.surface,
  },
  ratingBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(17,24,28,0.78)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  ratingText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  categoryBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    maxWidth: '70%',
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.light.text,
    letterSpacing: 0.6,
  },
  body: {
    padding: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.light.muted,
    flex: 1,
  },
  skeletonCard: {
    opacity: 0.6,
  },
  skeletonTitle: {
    height: 14,
    borderRadius: 4,
    backgroundColor: Colors.light.surface,
    marginBottom: 8,
  },
  skeletonLine: {
    height: 10,
    width: '60%',
    borderRadius: 4,
    backgroundColor: Colors.light.surface,
  },
});
