import React, { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Colors } from '@/constants/theme';

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

/**
 * Chips catégories horizontales, scrollables, avec état actif.
 *
 * Design :
 * - Repos : fond blanc + bordure grise très légère.
 * - Actif : fond orange CTA (#F4A261), texte blanc (seule utilisation d'orange
 *   pour du texte est *sur* orange, pas en couleur texte sur fond clair).
 *
 * L'élément est stateless : c'est le parent (MapExperience) qui détient
 * `activeId`, ce qui permet de synchroniser les chips avec les filtres de la map.
 */
function CategoryChipsComponent({ chips, activeId, onPressChip }: CategoryChipsProps) {
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
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{chip.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export const CategoryChips = memo(CategoryChipsComponent);

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  chipActive: {
    backgroundColor: Colors.light.mapPrimaryCta,
    borderColor: Colors.light.mapPrimaryCta,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
  },
  chipTextActive: {
    color: '#fff',
  },
});
