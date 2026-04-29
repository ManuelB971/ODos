import React, { forwardRef, useState } from 'react';
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
import { Colors } from '@/constants/theme';

export type InputFieldProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  /** Message d'aide sous le champ. */
  hint?: string;
  /** Message d'erreur. S'il est renseigné, il prend la place du `hint`. */
  error?: string | null;
  /** Icône à gauche (ex. `<Mail size={18} />`). */
  leftIcon?: React.ReactNode;
  /** Icône à droite (ex. loupe, flèche). Ignorée si `secureTextEntry` (remplacée par l'œil). */
  rightIcon?: React.ReactNode;
  /** Si `true`, active le toggle show/hide password automatiquement. */
  secureTextEntry?: boolean;
  containerStyle?: ViewStyle;
};

/**
 * Input de saisie premium.
 *
 * - Label au-dessus (optionnel).
 * - Bordure qui s'anime vers orange au focus (tandis que la couleur d'erreur l'emporte si `error`).
 * - Password visibility toggle intégré (œil / œil barré).
 * - A11y natif (labels, states).
 *
 * Utilisé par Login, Signup, settings, etc. — **seul** composant de saisie UI à
 * utiliser dorénavant pour garder la cohérence visuelle.
 */
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
  ref
) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(!secureTextEntry);
  const focus = useSharedValue(0);

  const borderAnim = useAnimatedStyle(() => {
    const color = error
      ? Colors.light.danger
      : (interpolateColor(
          focus.value,
          [0, 1],
          [Colors.light.border, Colors.light.accent]
        ) as unknown as string);
    return {
      borderColor: color,
    };
  });

  const hasError = Boolean(error);
  const helperText = error ?? hint;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[styles.label, hasError && styles.labelError]}>{label}</Text>
      ) : null}

      <Animated.View
        style={[
          styles.inputWrap,
          borderAnim,
          !editable && styles.inputWrapDisabled,
        ]}
      >
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}

        <TextInput
          ref={ref}
          placeholderTextColor={Colors.light.muted}
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
            accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {showPassword ? (
              <EyeOff size={18} color={isFocused ? Colors.light.text : Colors.light.muted} />
            ) : (
              <Eye size={18} color={isFocused ? Colors.light.text : Colors.light.muted} />
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

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
    letterSpacing: 0.2,
  },
  labelError: {
    color: Colors.light.danger,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 50,
  },
  inputWrapDisabled: {
    backgroundColor: Colors.light.surface,
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
    color: Colors.light.text,
    fontSize: 15,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  inputDisabled: {
    color: Colors.light.muted,
  },
  helper: {
    fontSize: 12,
    color: Colors.light.muted,
    marginTop: 2,
  },
  helperError: {
    color: Colors.light.danger,
  },
});
