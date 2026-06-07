import React, { memo, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useOdosColors, type OdosColorPalette } from '@/context/ThemeContext';

export type Chip = {
  id: string;
  label: string;
};

export type CategoryChipsProps = {
  chips: Chip[];
  /** Id actif (ex. "all" ou l'id d'une catégorie). */
  activeId: string;
  onPressChip: (chip: Chip) => void;
};

function CategoryChipsComponent({ chips, activeId, onPressChip }: CategoryChipsProps) {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {chips.map((chip) => {
        const isActive = chip.id === activeId;
        return (
          <Pressable
            key={chip.id}
            onPress={() => onPressChip(chip)}
            style={[styles.chip, isActive && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${chip.label}${isActive ? ', sélectionné' : ''}`}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{chip.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export const CategoryChips = memo(CategoryChipsComponent);

function createStyles(colors: OdosColorPalette) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: 4,
      paddingVertical: 4,
      gap: 8,
      flexDirection: 'row',
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 18,
      backgroundColor: colors.overlay,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: colors.mapPrimaryCta,
      borderColor: colors.mapPrimaryCta,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    chipTextActive: {
      color: colors.onAccent,
    },
  });
}
