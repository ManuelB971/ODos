import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/constants/theme';

export type CTAButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type CTAButtonSize = 'sm' | 'md' | 'lg';

export type CTAButtonProps = {
  label: string;
  onPress: () => void;
  /** Passe le bouton en état chargement : spinner affiché, action bloquée, taille stable. */
  loading?: boolean;
  disabled?: boolean;
  variant?: CTAButtonVariant;
  size?: CTAButtonSize;
  /** Si `true`, le bouton prend toute la largeur disponible. */
  fullWidth?: boolean;
  /** Icône optionnelle à gauche du label (ex. `<ArrowRight size={16} />`). */
  leftIcon?: React.ReactNode;
  /** Icône optionnelle à droite du label. */
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

/**
 * CTA principal de l'app ODOS.
 *
 * Principes clés :
 * - **Taille stable** : le spinner remplace uniquement la couleur du label
 *   (via `opacity`), la hauteur et la largeur ne bougent pas pendant le loading.
 * - **Double protection anti-submit** : `disabled` ET `loading` désactivent le press.
 * - **Micro-interaction** : pressed → scale 0.97 (ressort doux Reanimated).
 * - **Variantes strictes** au design system :
 *    - `primary` : orange `#F4A261` (CTA principal UNIQUEMENT)
 *    - `secondary` : outline + texte `#11181C`
 *    - `ghost` : transparent + texte primaire
 *    - `danger` : fond rouge (logout, suppression)
 *
 * Utilisation typique :
 * ```tsx
 * <CTAButton label="Se connecter" onPress={onSubmit} loading={isSubmitting} fullWidth />
 * ```
 */
export function CTAButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  accessibilityLabel,
}: CTAButtonProps) {
  const pressProgress = useSharedValue(0);
  const isDisabled = disabled || loading;

  // Fade du label pendant le loading — la largeur reste inchangée.
  const labelOpacity = useSharedValue(1);
  useEffect(() => {
    labelOpacity.value = withTiming(loading ? 0 : 1, { duration: 160 });
  }, [loading, labelOpacity]);

  const animatedPressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressProgress.value * 0.03 }],
  }));
  const animatedLabelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
  }));

  const sizeStyles = SIZE_STYLES[size];
  const variantStyles = VARIANT_STYLES[variant];
  const textColor = variantStyles.text;

  return (
    <Animated.View
      style={[
        animatedPressStyle,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        onPressIn={() => {
          pressProgress.value = withTiming(1, { duration: 120, easing: Easing.out(Easing.ease) });
        }}
        onPressOut={() => {
          pressProgress.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.ease) });
        }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        style={[
          styles.base,
          { backgroundColor: variantStyles.bg, borderColor: variantStyles.border ?? 'transparent' },
          { borderWidth: variantStyles.border ? 1 : 0 },
          { paddingVertical: sizeStyles.paddingV, paddingHorizontal: sizeStyles.paddingH, minHeight: sizeStyles.minH },
          isDisabled && !loading && styles.disabled,
        ]}
      >
        {/* Contenu principal (label + icônes) — on fait fondre le label pendant le loading. */}
        <Animated.View style={[styles.contentRow, animatedLabelStyle]}>
          {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
          <Text
            style={[
              styles.label,
              { fontSize: sizeStyles.fontSize, color: textColor },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
          {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
        </Animated.View>

        {/* Overlay spinner visible uniquement pendant le loading (taille parent inchangée). */}
        {loading ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
            <View style={styles.spinnerWrap}>
              <ActivityIndicator color={textColor} size="small" />
            </View>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const VARIANT_STYLES: Record<
  CTAButtonVariant,
  { bg: string; text: string; border?: string }
> = {
  primary: {
    bg: Colors.light.accent, // #F4A261 — orange CTA
    text: '#ffffff',
  },
  secondary: {
    bg: '#ffffff',
    text: Colors.light.text,
    border: Colors.light.border,
  },
  ghost: {
    bg: 'transparent',
    text: Colors.light.primary,
  },
  danger: {
    bg: '#fef2f2',
    text: Colors.light.danger,
    border: '#fecaca',
  },
};

const SIZE_STYLES: Record<
  CTAButtonSize,
  { paddingV: number; paddingH: number; fontSize: number; minH: number }
> = {
  sm: { paddingV: 10, paddingH: 14, fontSize: 13, minH: 44 },
  md: { paddingV: 14, paddingH: 20, fontSize: 15, minH: 50 },
  lg: { paddingV: 16, paddingH: 24, fontSize: 16, minH: 56 },
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  spinnerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
});
