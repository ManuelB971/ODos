import React, { memo, useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Heart, MapPin as MapPinIcon, Star } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { ApiActivity } from '@/types';
import { resolveImageUrl } from '@/utils/imageUrl';

export type FavoriteCardProps = {
  item: ApiActivity;
  isFavorite: boolean;
  /** En vol (mutation en cours) : on grise légèrement le bouton cœur. */
  isPending?: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
};

/**
 * Card favoris compact (format 2 colonnes).
 *
 * - Grande image au-dessus (ratio 4/5), badges superposés (note, ville).
 * - Toggle cœur animé : scale "bounce" sur tap (+ rouge plein quand actif).
 * - Feedback immédiat : le parent gère l'optimistic update, on s'aligne dessus.
 *
 * Pourquoi un composant dédié plutôt que réutiliser `ActivityCard` de la map ?
 * Les proportions / densité info sont différentes : la card favoris est plus
 * verticale, avec une image 4:5 (Instagram-like) et moins de meta.
 */
function FavoriteCardComponent({
  item,
  isFavorite,
  isPending = false,
  onPress,
  onToggleFavorite,
}: FavoriteCardProps) {
  const scale = useSharedValue(1);
  const heartBounce = useSharedValue(1);

  // Micro-interaction : feedback tactile sur press-in
  const animPress = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const animHeart = useAnimatedStyle(() => ({
    transform: [{ scale: heartBounce.value }],
  }));

  // Bounce quand l'état de favori change (onglet de favoris → on aime / on retire).
  useEffect(() => {
    heartBounce.value = withSequence(
      withSpring(1.35, { damping: 6, stiffness: 280, mass: 0.4 }),
      withSpring(1, { damping: 12, stiffness: 200 })
    );
  }, [isFavorite, heartBounce]);

  const img = resolveImageUrl(item.imageUrl);
  const categoryLabel =
    typeof item.category === 'string' ? item.category : item.category?.name ?? '';

  return (
    <Animated.View style={[styles.card, animPress]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(0.97, { duration: 120 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 220 });
        }}
        accessibilityRole="button"
        accessibilityLabel={`Voir ${item.name}`}
      >
        <View style={styles.imageWrap}>
          {img ? (
            <Image source={{ uri: img }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.placeholder]} />
          )}

          {/* Bouton favori en haut à droite, isolé (stopPropagation par défaut sur Pressable) */}
          <Pressable
            onPress={onToggleFavorite}
            disabled={isPending}
            hitSlop={10}
            style={styles.heartBtn}
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Animated.View style={animHeart}>
              <Heart
                size={18}
                color={isFavorite ? Colors.light.danger : '#ffffff'}
                fill={isFavorite ? Colors.light.danger : 'transparent'}
              />
            </Animated.View>
          </Pressable>

          {/* Badge rating en bas à gauche */}
          {typeof item.ratingAverage === 'number' && item.ratingAverage > 0 ? (
            <View style={styles.ratingBadge}>
              <Star size={10} color="#fff" fill="#fff" />
              <Text style={styles.ratingText}>{item.ratingAverage.toFixed(1)}</Text>
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
            {item.name}
          </Text>
          {item.city ? (
            <View style={styles.cityRow}>
              <MapPinIcon size={11} color={Colors.light.muted} />
              <Text numberOfLines={1} style={styles.city}>
                {item.city}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export const FavoriteCard = memo(FavoriteCardComponent);
FavoriteCard.displayName = 'FavoriteCard';

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 4 / 5,
    backgroundColor: Colors.light.surface,
    position: 'relative',
  },
  placeholder: {
    backgroundColor: Colors.light.surface,
  },
  heartBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,24,28,0.4)',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(17,24,28,0.78)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  ratingText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  categoryBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    maxWidth: '60%',
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.light.text,
    letterSpacing: 0.6,
  },
  body: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  city: {
    fontSize: 11,
    color: Colors.light.muted,
    flex: 1,
  },
});
