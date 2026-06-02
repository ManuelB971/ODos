import React, { forwardRef, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Eye, EyeOff } from 'lucide-react-native';

import type { OdosColorPalette } from '@/constants/themes/types';
import { useOdosColors } from '@/context/ThemeContext';

export type InputFieldProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  hint?: string;
  error?: string | null;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  secureTextEntry?: boolean;
  containerStyle?: ViewStyle;
};

export const InputField = forwardRef<TextInput, InputFieldProps>(function InputField(
  {
    label,
    hint,
    error,
    leftIcon,
    rightIcon,
    secureTextEntry,
    containerStyle,
    onFocus,
    onBlur,
    editable = true,
    ...rest
  },
  ref,
) {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(!secureTextEntry);
  const focus = useSharedValue(0);

  const borderAnim = useAnimatedStyle(() => {
    const color = error
      ? colors.danger
      : (interpolateColor(
          focus.value,
          [0, 1],
          [colors.border, colors.accent],
        ) as unknown as string);
    return { borderColor: color };
  }, [colors.border, colors.accent, colors.danger, error]);

  const hasError = Boolean(error);
  const helperText = error ?? hint;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[styles.label, hasError && styles.labelError]}>{label}</Text>
      ) : null}

      <Animated.View
        style={[styles.inputWrap, borderAnim, !editable && styles.inputWrapDisabled]}
      >
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}

        <TextInput
          ref={ref}
          placeholderTextColor={colors.muted}
          secureTextEntry={secureTextEntry && !showPassword}
          editable={editable}
          onFocus={(e) => {
            setIsFocused(true);
            focus.value = withTiming(1, { duration: 180 });
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            focus.value = withTiming(0, { duration: 180 });
            onBlur?.(e);
          }}
          style={[styles.input, !editable && styles.inputDisabled]}
          {...rest}
        />

        {secureTextEntry ? (
          <Pressable
            onPress={() => setShowPassword((s) => !s)}
            hitSlop={10}
            style={styles.rightIcon}
            accessibilityRole="button"
            accessibilityLabel={
              showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
            }
          >
            {showPassword ? (
              <EyeOff size={18} color={isFocused ? colors.text : colors.muted} />
            ) : (
              <Eye size={18} color={isFocused ? colors.text : colors.muted} />
            )}
          </Pressable>
        ) : rightIcon ? (
          <View style={styles.rightIcon}>{rightIcon}</View>
        ) : null}
      </Animated.View>

      {helperText ? (
        <Text style={[styles.helper, hasError && styles.helperError]}>{helperText}</Text>
      ) : null}
    </View>
  );
});

function createStyles(colors: OdosColorPalette) {
  return StyleSheet.create({
    container: {
      width: '100%',
      gap: 6,
    },
    label: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: 0.2,
    },
    labelError: {
      color: colors.danger,
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.elevated,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 12,
      minHeight: 50,
    },
    inputWrapDisabled: {
      backgroundColor: colors.surface,
    },
    leftIcon: {
      marginRight: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rightIcon: {
      marginLeft: 8,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
      paddingVertical: 4,
    },
    input: {
      flex: 1,
      color: colors.text,
      fontSize: 15,
      paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    },
    inputDisabled: {
      color: colors.muted,
    },
    helper: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 2,
    },
    helperError: {
      color: colors.danger,
    },
  });
}
