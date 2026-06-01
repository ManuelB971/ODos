import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme, type ThemePreference, type OdosColorPalette } from '@/context/ThemeContext';
import { FontFamily, Radius } from '@/constants/theme';

const OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'Système' },
  { id: 'light', label: 'Clair' },
  { id: 'dark', label: 'Sombre' },
];

export function ThemePreferencePicker() {
  const { preference, setPreference, colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      {OPTIONS.map((opt) => {
        const active = preference === opt.id;
        return (
          <Pressable
            key={opt.id}
            onPress={() => setPreference(opt.id)}
            style={[styles.chip, active && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Thème ${opt.label}`}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(colors: OdosColorPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 8,
    },
    chip: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: Radius.pill,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.elevated,
      alignItems: 'center',
    },
    chipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    chipText: {
      fontSize: 13,
      fontFamily: FontFamily.uiMedium,
      color: colors.text,
    },
    chipTextActive: {
      color: '#ffffff',
      fontFamily: FontFamily.uiBold,
    },
  });
}
