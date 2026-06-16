import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { FontFamily } from '@/constants/theme';
import { useOdosColors } from '@/context/ThemeContext';
import { PopSurface } from './PopSurface';
import { useIsMosaicPop, usePopTokens } from './usePop';

/**
 * État vide unifié (loi de Jakob §4.5 : *pourquoi c'est vide ?* + *que faire ?*).
 *
 * - Icône dans un carré encre, titre éditorial (serif), sous-titre explicatif,
 *   et CTA optionnel — le tout dans le langage « Mosaïque pop » quand il est
 *   actif, avec repli propre en mode classique.
 * - Entrée animée discrète (FadeInDown), désactivée si `prefers-reduced-motion`.
 *   Un empty-state est vu rarement : un peu de chaleur y est la bienvenue
 *   (cf. design-motion-principles, fréquence « rare »).
 */
export function PopEmptyState({
  icon,
  title,
  subtitle,
  ctaLabel,
  onPressCta,
  accent,
  style,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onPressCta?: () => void;
  /** Couleur de l'accent (carré d'icône + CTA). Défaut: orange. */
  accent?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useOdosColors();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();
  const reduceMotion = useReducedMotion();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const ink = isMosaicPop ? pop.ink : colors.text;
  const muted = isMosaicPop ? pop.muted : colors.muted;
  const accentColor = accent ?? (isMosaicPop ? pop.orange : colors.accent);

  const entering = reduceMotion ? undefined : FadeInDown.duration(380).springify().damping(18);

  return (
    <Animated.View entering={entering} style={[styles.wrap, style]}>
      <View style={styles.iconWrap}>
        {isMosaicPop ? (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.iconShadow, { backgroundColor: pop.ink }]}
          />
        ) : null}
        <View
          style={[
            styles.iconBox,
            { backgroundColor: accentColor },
            isMosaicPop && { borderWidth: 2.5, borderColor: pop.ink },
          ]}
        >
          {icon}
        </View>
      </View>

      <Text style={[styles.title, { color: ink }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: muted }]}>{subtitle}</Text> : null}

      {ctaLabel && onPressCta ? (
        isMosaicPop ? (
          <Pressable onPress={onPressCta} accessibilityRole="button">
            <PopSurface shadow={4} radius={100} fill={accentColor} contentStyle={styles.ctaPop}>
              <Text style={[styles.ctaPopText, { color: pop.ink }]}>{ctaLabel}</Text>
            </PopSurface>
          </Pressable>
        ) : (
          <Pressable
            onPress={onPressCta}
            accessibilityRole="button"
            style={[styles.cta, { backgroundColor: accentColor }]}
          >
            <Text style={[styles.ctaText, { color: colors.onAccent }]}>{ctaLabel}</Text>
          </Pressable>
        )
      ) : null}
    </Animated.View>
  );
}

function createStyles(colors: ReturnType<typeof useOdosColors>) {
  return StyleSheet.create({
    wrap: {
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingTop: 56,
      gap: 10,
    },
    iconWrap: {
      width: 64,
      height: 64,
      marginBottom: 6,
    },
    iconBox: {
      width: 64,
      height: 64,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconShadow: {
      borderRadius: 18,
      transform: [{ translateX: 3 }, { translateY: 3 }],
    },
    title: {
      fontFamily: FontFamily.display,
      fontSize: 22,
      textAlign: 'center',
    },
    subtitle: {
      fontFamily: FontFamily.ui,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      maxWidth: 300,
    },
    cta: {
      marginTop: 10,
      borderRadius: 100,
      paddingHorizontal: 20,
      paddingVertical: 11,
    },
    ctaText: {
      fontFamily: FontFamily.uiBold,
      fontSize: 14,
    },
    ctaPop: {
      paddingHorizontal: 20,
      paddingVertical: 11,
      alignItems: 'center',
    },
    ctaPopText: {
      fontFamily: FontFamily.uiBold,
      fontSize: 14,
    },
  });
}
