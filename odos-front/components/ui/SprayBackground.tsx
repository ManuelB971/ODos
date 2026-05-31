import React from 'react';
import { ImageBackground, StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors } from '@/constants/theme';

type SprayBackgroundProps = {
  children: React.ReactNode;
  /** Opacité du motif spray (0–1). Défaut : 0.35 */
  sprayOpacity?: number;
  style?: ViewStyle;
};

/**
 * Fond atténué avec texture aérospray (DA landing §5).
 * Le dégradé vers `bg.page` préserve la lisibilité du contenu.
 */
export function SprayBackground({
  children,
  sprayOpacity = 0.35,
  style,
}: SprayBackgroundProps) {
  return (
    <View style={[styles.root, style]}>
      <ImageBackground
        source={require('@/assets/images/spray-background.png')}
        style={StyleSheet.absoluteFill}
        imageStyle={[styles.sprayImage, { opacity: sprayOpacity }]}
        resizeMode="cover"
      />
      <LinearGradient
        colors={[
          `${Colors.light.background}E6`,
          Colors.light.background,
          `${Colors.light.background}F2`,
        ]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  sprayImage: {
    transform: [{ scale: 1.08 }],
  },
});
