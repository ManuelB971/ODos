import React, { useMemo } from 'react';
import { ImageBackground, StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useOdosColors } from '@/context/ThemeContext';

type SprayBackgroundProps = {
  children: React.ReactNode;
  /** Opacité du motif spray (0–1). Défaut : 0.35 */
  sprayOpacity?: number;
  style?: ViewStyle;
};

/**
 * Fond atténué avec texture aérospray (DA landing §5).
 * Le dégradé vers `background` préserve la lisibilité du contenu.
 */
export function SprayBackground({
  children,
  sprayOpacity = 0.35,
  style,
}: SprayBackgroundProps) {
  const colors = useOdosColors();
  const gradientColors = useMemo(
    () => [`${colors.background}E6`, colors.background, `${colors.background}F2`] as const,
    [colors.background],
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }, style]}>
      <ImageBackground
        source={require('@/assets/images/spray-background.png')}
        style={StyleSheet.absoluteFill}
        imageStyle={[styles.sprayImage, { opacity: sprayOpacity }]}
        resizeMode="cover"
      />
      <LinearGradient
        colors={gradientColors}
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
  },
  sprayImage: {
    transform: [{ scale: 1.08 }],
  },
});
