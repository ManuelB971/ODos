import React, { memo, useEffect, useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useOdosColors, type OdosColorPalette } from '@/context/ThemeContext';

export type MapPinProps = {
  /** Pin sélectionné : passe en orange + pulse + scale. */
  active?: boolean;
  /** Label court affiché sous le pin actif (ex. nom de l'activité ou prix). */
  label?: string;
  /** Variante visuelle : `dot` (compacte) ou `arch` (forme demi-cercle inspirée du logo). */
  variant?: 'arch' | 'dot';
};

function MapPinComponent({ active = false, label, variant = 'arch' }: MapPinProps) {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scale = useSharedValue(1);
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

  const bubbleColor = active ? colors.mapPrimaryCta : colors.mapSecondary;
  const size = variant === 'dot' ? 16 : 22;
  const tailHalfBase = Math.round(size * 0.7);
  const tailHeight = Math.round(size * 0.95);

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View
        style={[
          styles.pulse,
          { backgroundColor: bubbleColor, width: size * 2.4, height: size * 2.4, borderRadius: size * 1.2 },
          pulseStyle,
        ]}
      />

      <Animated.View style={[styles.bubbleRoot, bubbleStyle]}>
        {variant === 'arch' && (
          <>
            <View
              style={[
                styles.tail,
                {
                  borderLeftWidth: tailHalfBase + 2,
                  borderRightWidth: tailHalfBase + 2,
                  borderTopWidth: tailHeight + 2,
                  borderTopColor: colors.elevated,
                  bottom: -(tailHeight + 2) + 3,
                },
              ]}
            />
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

function createStyles(colors: OdosColorPalette) {
  return StyleSheet.create({
    wrap: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 80,
      height: 80,
    },
    pulse: {
      position: 'absolute',
    },
    bubbleRoot: {
      alignItems: 'center',
      justifyContent: 'center',
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
      borderColor: colors.elevated,
    },
    innerDot: {
      backgroundColor: colors.elevated,
    },
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
      backgroundColor: colors.elevated,
      borderWidth: 1,
      borderColor: colors.border,
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
      color: colors.text,
    },
  });
}
