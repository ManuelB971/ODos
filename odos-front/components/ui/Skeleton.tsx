import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useOdosColors, type OdosColorPalette } from '@/context/ThemeContext';
import { useMotionConfig } from '@/constants/motion';

export type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number | `${number}%`;
  /** Rayon du radius. 8 par défaut ; passe à `height/2` pour des pilules. */
  radius?: number;
  style?: ViewStyle;
};

/**
 * Bloc shimmer minimal — à composer pour dessiner n'importe quelle forme.
 */
export function Skeleton({ width = '100%', height = 16, radius = 8, style }: SkeletonProps) {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const motion = useMotionConfig();
  const shimmer = useSharedValue(0);

  useEffect(() => {
    if (motion.reduced) {
      shimmer.value = 1;
      return;
    }
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [shimmer, motion.reduced]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + shimmer.value * 0.35,
  }));

  return (
    <Animated.View
      style={[
        styles.block,
        { width: width as number | `${number}%`, height: height as number | `${number}%`, borderRadius: radius },
        animatedStyle,
        style,
      ]}
    />
  );
}

/**
 * Card squelette pour les listes d'activités (format vignette horizontale).
 */
export function SkeletonActivityRow() {
  const styles = useMemo(() => createLayoutStyles(), []);
  return (
    <View style={styles.row}>
      <Skeleton width={80} height={80} radius={16} />
      <View style={styles.rowBody}>
        <Skeleton width="70%" height={14} radius={4} />
        <Skeleton width="45%" height={10} radius={4} />
        <Skeleton width="30%" height={10} radius={4} />
      </View>
    </View>
  );
}

/**
 * Card squelette pour la grille favoris (format 2 colonnes).
 */
export function SkeletonFavoriteCard() {
  const styles = useMemo(() => createLayoutStyles(), []);
  return (
    <View style={styles.favCard}>
      <Skeleton width="100%" height={140} radius={16} />
      <View style={styles.favCardBody}>
        <Skeleton width="80%" height={13} radius={4} />
        <Skeleton width="50%" height={10} radius={4} />
      </View>
    </View>
  );
}

/**
 * Card squelette pour le carrousel "Recommandations" (format grande vignette).
 */
export function SkeletonRecommendationCard() {
  const styles = useMemo(() => createLayoutStyles(), []);
  return (
    <View style={styles.recoCard}>
      <Skeleton width="100%" height={160} radius={20} />
      <View style={styles.recoBody}>
        <Skeleton width="60%" height={10} radius={4} />
        <Skeleton width="90%" height={16} radius={4} />
        <Skeleton width="80%" height={12} radius={4} />
      </View>
    </View>
  );
}

function createStyles(colors: OdosColorPalette) {
  return StyleSheet.create({
    block: {
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
  });
}

function createLayoutStyles() {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 12,
    },
    rowBody: {
      flex: 1,
      gap: 8,
    },
    favCard: {
      width: '48%',
      gap: 8,
      marginBottom: 14,
    },
    favCardBody: {
      gap: 6,
      paddingHorizontal: 2,
    },
    recoCard: {
      width: 240,
      marginRight: 12,
      gap: 8,
    },
    recoBody: {
      gap: 6,
      paddingHorizontal: 4,
      paddingTop: 4,
    },
  });
}
