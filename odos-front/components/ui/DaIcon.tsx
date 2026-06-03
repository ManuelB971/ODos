import React from 'react';
import { Image, type ImageStyle } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

/** Icônes charte DA — sources `docs/design/da-icons` (SVG). */
export const DA_ICON_NAMES = [
  'boussole',
  'loupe',
  'carte',
  'user',
  'etoile',
  'check-mark',
  'bulle-chat',
  'step-1',
  'step-2',
] as const;

export type DaIconName = (typeof DA_ICON_NAMES)[number];

const sources: Record<DaIconName, number> = {
  boussole: require('@/assets/da-icons/boussole.svg'),
  loupe: require('@/assets/da-icons/loupe.svg'),
  carte: require('@/assets/da-icons/carte.svg'),
  user: require('@/assets/da-icons/user.svg'),
  etoile: require('@/assets/da-icons/etoile.svg'),
  'check-mark': require('@/assets/da-icons/check-mark.svg'),
  'bulle-chat': require('@/assets/da-icons/bulle-chat.svg'),
  'step-1': require('@/assets/da-icons/step-1.svg'),
  'step-2': require('@/assets/da-icons/step-2.svg'),
};

export type DaIconProps = {
  name: DaIconName;
  size?: number;
  /** Utile pour étoiles vides ou étapes inactives (0–1). */
  opacity?: number;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * Icône illustrée ODOS (DA). Préférer ce composant aux pictos Lucide
 * lorsqu’une variante existe dans `assets/da-icons`.
 */
export function DaIcon({
  name,
  size = 24,
  opacity = 1,
  style,
  containerStyle,
  accessibilityLabel,
}: DaIconProps) {
  return (
    <View
      style={[styles.wrap, { width: size, height: size, opacity }, containerStyle]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
    >
      <Image
        source={sources[name]}
        style={[{ width: size, height: size }, style]}
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
