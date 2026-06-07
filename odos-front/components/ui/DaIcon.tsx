import React from 'react';
import { Image, type ImageStyle } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { BlobFrame } from '@/components/ui/BlobFrame';
import {
  DA_ICON_SIZES,
  DA_ICON_VISUAL_SCALE,
  type DaIconVariant,
} from '@/constants/daIcons';

/** Icônes charte DA — sources `docs/design/da-icons` (SVG illustrés). */
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

export type DaIconBlobOptions = {
  seed?: number;
  backgroundColor?: string;
  /** Taille du blob autour de l’icône (défaut : size + 10). */
  padding?: number;
};

export type DaIconProps = {
  name: DaIconName;
  /** Preset taille UX (prioritaire si `size` absent). */
  variant?: DaIconVariant;
  size?: number;
  /** Agrandit le dessin dans le cadre (SVG illustrés avec marges). */
  visualScale?: number;
  opacity?: number;
  /** Fond organique charte DA (onglets actifs, étapes onboarding…). */
  blob?: boolean | DaIconBlobOptions;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * Icône illustrée ODOS (DA). Préférer ce composant aux pictos Lucide
 * lorsqu’une variante existe dans `assets/da-icons`.
 *
 * Limitation actuelle : les fichiers SVG contiennent une image raster ;
 * `color` / `tintColor` ne s’appliquent pas. Voir `constants/daIcons.ts`.
 */
export function DaIcon({
  name,
  variant,
  size: sizeProp,
  visualScale = DA_ICON_VISUAL_SCALE,
  opacity = 1,
  blob,
  style,
  containerStyle,
  accessibilityLabel,
}: DaIconProps) {
  const size = sizeProp ?? (variant ? DA_ICON_SIZES[variant] : 28);
  const drawSize = Math.round(size * visualScale);

  const image = (
    <Image
      source={sources[name]}
      style={[{ width: drawSize, height: drawSize }, style]}
      contentFit="contain"
    />
  );

  const wrapStyle: StyleProp<ViewStyle> = [
    styles.wrap,
    { width: size, height: size, opacity },
    containerStyle,
  ];

  if (blob) {
    const opts = typeof blob === 'object' ? blob : {};
    const padding = opts.padding ?? 10;
    const blobSize = size + padding;

    return (
      <View
        style={wrapStyle}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityLabel ? 'image' : undefined}
      >
        <BlobFrame
          size={blobSize}
          seed={opts.seed ?? iconSeed(name)}
          backgroundColor={opts.backgroundColor}
        >
          {image}
        </BlobFrame>
      </View>
    );
  }

  return (
    <View
      style={wrapStyle}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
    >
      {image}
    </View>
  );
}

function iconSeed(name: DaIconName): number {
  return DA_ICON_NAMES.indexOf(name);
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
