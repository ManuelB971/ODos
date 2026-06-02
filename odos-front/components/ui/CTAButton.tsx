import React, { useEffect, useMemo } from 'react';
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

import type { OdosColorPalette } from '@/constants/themes/types';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

export type CTAButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type CTAButtonSize = 'sm' | 'md' | 'lg';

export type CTAButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: CTAButtonVariant;
  size?: CTAButtonSize;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

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
  const { colors } = useTheme();
  const variantStyles = useMemo(() => buildVariantStyles(colors), [colors]);
  const pressProgress = useSharedValue(0);
  const isDisabled = disabled || loading;

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
  const activeVariant = variantStyles[variant];
  const textColor = activeVariant.text;

  return (
    <Animated.View style={[animatedPressStyle, fullWidth && styles.fullWidth, style]}>
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
          {
            backgroundColor: activeVariant.bg,
            borderColor: activeVariant.border ?? 'transparent',
            borderWidth: activeVariant.border ? 1 : 0,
          },
          {
            paddingVertical: sizeStyles.paddingV,
            paddingHorizontal: sizeStyles.paddingH,
            minHeight: sizeStyles.minH,
          },
          isDisabled && !loading && styles.disabled,
        ]}
      >
        <Animated.View style={[styles.contentRow, animatedLabelStyle]}>
          {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
          <Text
            style={[styles.label, { fontSize: sizeStyles.fontSize, color: textColor }]}
            numberOfLines={1}
          >
            {label}
          </Text>
          {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
        </Animated.View>

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

function buildVariantStyles(
  colors: OdosColorPalette,
): Record<CTAButtonVariant, { bg: string; text: string; border?: string }> {
  return {
    primary: {
      bg: colors.accent,
      text: colors.onAccent,
    },
    secondary: {
      bg: colors.elevated,
      text: colors.text,
      border: colors.border,
    },
    ghost: {
      bg: 'transparent',
      text: colors.primary,
    },
    danger: {
      bg: colors.errorSurface,
      text: colors.danger,
      border: `${colors.danger}55`,
    },
  };
}

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
    borderRadius: Radius.pill,
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
    fontFamily: FontFamily.uiBold,
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
