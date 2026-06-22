import React, { memo, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useOdosColors, type OdosColorPalette } from '@/context/ThemeContext';
import { useCity } from '@/context/CityContext';
import { FontFamily } from '@/constants/theme';
import { useIsMosaicPop } from '@/components/pop/usePop';

type CityFilterProps = {
  /** Libellé accessibilité du groupe (ex. « Filtrer par ville »). */
  accessibilityLabel?: string;
};

function CityFilterComponent({
  accessibilityLabel = 'Filtrer par ville',
}: CityFilterProps) {
  const colors = useOdosColors();
  const isMosaicPop = useIsMosaicPop();
  const { cities, selectedCity, setSelectedCity } = useCity();
  const styles = useMemo(() => createStyles(colors, isMosaicPop), [colors, isMosaicPop]);

  if (cities.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {cities.map((city) => {
        const isActive = city.name === selectedCity;
        return (
          <Pressable
            key={city.name}
            onPress={() => setSelectedCity(city.name)}
            style={[styles.chip, isActive && styles.chipActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${city.name}, ${city.activityCount} activités${isActive ? ', sélectionné' : ''}`}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{city.name}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export const CityFilter = memo(CityFilterComponent);

function createStyles(colors: OdosColorPalette, isMosaicPop: boolean) {
  return StyleSheet.create({
    container: {
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 4,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: isMosaicPop ? 2 : 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    chipText: {
      fontFamily: FontFamily.uiMedium,
      fontSize: 13,
      color: colors.muted,
    },
    chipTextActive: {
      color: colors.accent,
      fontFamily: FontFamily.uiBold,
    },
  });
}
