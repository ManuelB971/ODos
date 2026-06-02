import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Search, SlidersHorizontal, X } from 'lucide-react-native';
import { useOdosColors, type OdosColorPalette } from '@/context/ThemeContext';

export type SearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  /** Bouton filtre à droite. Si absent, on masque le bouton. */
  onPressFilter?: () => void;
};

/**
 * Barre de recherche flottante façon "glass light".
 */
export function SearchBar({
  value,
  onChangeText,
  onSubmit,
  placeholder = 'Rechercher un lieu, une activité…',
  onPressFilter,
}: SearchBarProps) {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const focus = useSharedValue(0);
  const [isFocused, setIsFocused] = useState(false);

  const containerStyle = useAnimatedStyle(() => ({
    borderColor: focus.value > 0.5 ? colors.mapPrimaryCta : 'rgba(255,255,255,0.6)',
    shadowOpacity: 0.1 + focus.value * 0.15,
    transform: [{ scale: 1 + focus.value * 0.015 }],
  }));

  return (
    <Animated.View style={[styles.wrap, containerStyle]}>
      <View style={styles.iconBox}>
        <Search size={18} color={isFocused ? colors.mapPrimaryCta : colors.muted} />
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={() => onSubmit?.(value)}
        onFocus={() => {
          setIsFocused(true);
          focus.value = withTiming(1, { duration: 220 });
        }}
        onBlur={() => {
          setIsFocused(false);
          focus.value = withTiming(0, { duration: 220 });
        }}
        returnKeyType="search"
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={10}
          style={styles.clearBtn}
          accessibilityRole="button"
          accessibilityLabel="Effacer la recherche"
        >
          <X size={16} color={colors.muted} />
        </Pressable>
      ) : null}
      {onPressFilter ? (
        <Pressable
          onPress={onPressFilter}
          style={styles.filterBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Filtres"
        >
          <SlidersHorizontal size={18} color={colors.text} />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

function createStyles(colors: OdosColorPalette) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.92)',
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.6)',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.1,
          shadowRadius: 14,
        },
        android: {
          elevation: 6,
        },
      }),
    },
    iconBox: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    },
    clearBtn: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      backgroundColor: '#f1f5f9',
      marginRight: 4,
    },
    filterBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 18,
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: colors.border,
    },
  });
}
