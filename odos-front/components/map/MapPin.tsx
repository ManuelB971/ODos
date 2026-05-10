import React, { memo, useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/constants/theme';

export type MapPinProps = {
  /** Pin sélectionné : passe en orange + pulse + scale. */
  active?: boolean;
  /** Label court affiché sous le pin actif (ex. nom de l'activité ou prix). */
  label?: string;
  /** Variante visuelle : `dot` (compacte) ou `arch` (forme demi-cercle inspirée du logo). */
  variant?: 'arch' | 'dot';
};

/**
 * Pin custom ODOS, rendu à l'intérieur d'un `<Marker>` MapLibre (`@maplibre/maplibre-react-native`).
 *
 * Design :
 * - Forme inspirée du logo : bulle arrondie surmontant une petite "queue"
 *   triangulaire (le tout sur un cercle blanc plus grand qui fait halo).
 * - État `default` = bleu secondaire (#3B82F6), état `active` = orange CTA (#F4A261).
 * - L'état actif s'accompagne d'une **pulsation** (halo translucide) et d'un
 *   **scale 1.12** avec un ressort doux.
 *
 * Pourquoi pas SVG ? Pour garder la perf sur Android où chaque Marker est recréé
 * à chaque re-render ; on s'appuie sur Reanimated (thread UI) et sur des `View`
 * natives pour éviter le coût d'un SVG par marker.
 */
function MapPinComponent({ active = false, label, variant = 'arch' }: MapPinProps) {
  // Ressort sur l'échelle quand on passe en actif (micro-interaction "bounce")
  const scale = useSharedValue(1);
  // Halo pulsant (anneau qui grossit en fondu) — uniquement sur le pin actif
  const pulse = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(active ? 1.12 : 1, {
      damping: 14,
      stiffness: 180,
      mass: 0.6,
    });
  }, [active, scale]);

  useEffect(() => {
    if (active) {
      pulse.value = 0;
      pulse.value = withRepeat(
        withTiming(1, { duration: 1400, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
    } else {
      pulse.value = withTiming(0, { duration: 200 });
    }
  }, [active, pulse]);

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: active ? 0.45 * (1 - pulse.value) : 0,
    transform: [{ scale: 0.8 + pulse.value * 0.9 }],
  }));

  const bubbleColor = active ? Colors.light.mapPrimaryCta : Colors.light.mapSecondary;
  const size = variant === 'dot' ? 16 : 22;
  // Flèche proportionnelle à la bulle : demi-base = 40 % du rayon, hauteur = 65 %.
  const tailHalfBase = Math.round(size * 0.7);
  const tailHeight = Math.round(size * 0.95);

  return (
    <View style={styles.wrap} pointerEvents="none">
      {/* Halo pulsant — sous la bulle */}
      <Animated.View
        style={[
          styles.pulse,
          { backgroundColor: bubbleColor, width: size * 2.4, height: size * 2.4, borderRadius: size * 1.2 },
          pulseStyle,
        ]}
      />

      {/* Bulle principale (forme "arch" = cercle + queue triangulaire) */}
      <Animated.View style={[styles.bubbleRoot, bubbleStyle]}>
        {variant === 'arch' && (
          <>
            {/* Flèche blanche de fond (un poil plus grande) pour créer un liseré */}
            <View
              style={[
                styles.tail,
                {
                  borderLeftWidth: tailHalfBase + 2,
                  borderRightWidth: tailHalfBase + 2,
                  borderTopWidth: tailHeight + 2,
                  borderTopColor: '#ffffff',
                  bottom: -(tailHeight + 2) + 3,
                },
              ]}
            />
            {/* Flèche colorée au premier plan */}
            <View
              style={[
                styles.tail,
                {
                  borderLeftWidth: tailHalfBase,
                  borderRightWidth: tailHalfBase,
                  borderTopWidth: tailHeight,
                  borderTopColor: bubbleColor,
                  bottom: -tailHeight + 3,
                },
              ]}
            />
          </>
        )}
        <View
          style={[
            styles.bubble,
            {
              width: size * 1.6,
              height: size * 1.6,
              borderRadius: (size * 1.6) / 2,
              backgroundColor: bubbleColor,
            },
          ]}
        >
          <View
            style={[
              styles.innerDot,
              {
                width: size * 0.55,
                height: size * 0.55,
                borderRadius: size * 0.275,
              },
            ]}
          />
        </View>
      </Animated.View>

      {/* Label flottant sous le pin actif (prix, nom, etc.) */}
      {active && label ? (
        <View style={styles.labelWrap}>
          <Text numberOfLines={1} style={styles.labelText}>
            {label}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export const MapPin = memo(MapPinComponent);

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    // On prévoit assez de place pour le halo (le Marker calcule ses bounds dessus)
    width: 80,
    height: 80,
  },
  pulse: {
    position: 'absolute',
  },
  bubbleRoot: {
    alignItems: 'center',
    justifyContent: 'center',
    // Ombre douce (adaptée iOS/Android)
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 5,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
  },
  innerDot: {
    backgroundColor: '#fff',
  },
  /**
   * Flèche pointant vers la coordonnée géo exacte.
   * Astuce RN classique : bordure top-colorée + bordures L/R transparentes = triangle down.
   * Les dimensions (borderLeft/Right/TopWidth) sont fournies inline pour scaler avec `size`.
   */
  tail: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  labelWrap: {
    position: 'absolute',
    top: '70%',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#fff',
    borderRadius: 10,
    maxWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.text,
  },
});
