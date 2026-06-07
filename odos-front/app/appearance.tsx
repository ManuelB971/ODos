import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Check, Moon, Sun, Smartphone } from 'lucide-react-native';
import { useTheme, useOdosColors, type OdosColorPalette, type ThemePreference } from '@/context/ThemeContext';
import { useAvailableThemes } from '@/hooks/useThemes';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PREFERENCE_OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: 'system', label: 'Système', Icon: Smartphone },
  { value: 'light', label: 'Clair', Icon: Sun },
  { value: 'dark', label: 'Sombre', Icon: Moon },
];

export default function AppearanceScreen() {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { preference, setPreference, variantId, setVariantId } = useTheme();
  const { data: themes = [] } = useAvailableThemes();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Apparence</Text>
      </View>

      {/* Mode */}
      <Text style={styles.sectionLabel}>{"Mode d'affichage"}</Text>
      <View style={styles.card}>
        {PREFERENCE_OPTIONS.map((opt, i) => {
          const isSelected = preference === opt.value;
          return (
            <View key={opt.value}>
              {i > 0 && <View style={styles.divider} />}
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => setPreference(opt.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={opt.label}
              >
                <opt.Icon size={20} color={isSelected ? colors.primary : colors.muted} />
                <Text style={[styles.rowLabel, isSelected && styles.rowLabelActive]}>
                  {opt.label}
                </Text>
                {isSelected && <Check size={18} color={colors.primary} />}
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* Thème */}
      <Text style={styles.sectionLabel}>Thème</Text>
      <View style={styles.themesGrid}>
        {themes.map((theme) => {
          const isSelected = variantId === theme.slug;
          const { accent, primary, background, surface } = theme.definition.light;
          return (
            <Pressable
              key={theme.slug}
              style={({ pressed }) => [
                styles.themeCard,
                isSelected && styles.themeCardSelected,
                pressed && styles.themeCardPressed,
              ]}
              onPress={() => setVariantId(theme.slug)}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={theme.label}
            >
              {/* Swatch preview */}
              <View style={[styles.swatch, { backgroundColor: background }]}>
                <View style={[styles.swatchAccent, { backgroundColor: accent }]} />
                <View style={[styles.swatchPrimary, { backgroundColor: primary }]} />
                <View style={[styles.swatchSurface, { backgroundColor: surface }]} />
              </View>

              <Text style={[styles.themeLabel, isSelected && styles.themeLabelActive]}>
                {theme.label}
              </Text>
              {theme.description ? (
                <Text style={styles.themeDesc} numberOfLines={1}>
                  {theme.description}
                </Text>
              ) : null}

              {isSelected && (
                <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                  <Check size={12} color={colors.onAccent} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function createStyles(colors: OdosColorPalette) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: Spacing.lg,
      paddingBottom: 60,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 16,
      marginBottom: 8,
    },
    backBtn: {
      padding: 4,
    },
    title: {
      fontSize: 22,
      fontFamily: FontFamily.display,
      color: colors.text,
    },
    sectionLabel: {
      fontSize: 13,
      fontFamily: FontFamily.uiMedium,
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 10,
      marginTop: 24,
    },
    card: {
      backgroundColor: colors.elevated,
      borderRadius: Radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: 52,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingHorizontal: Spacing.md,
      paddingVertical: 14,
    },
    rowPressed: {
      backgroundColor: colors.surface,
    },
    rowLabel: {
      flex: 1,
      fontSize: 16,
      fontFamily: FontFamily.ui,
      color: colors.text,
    },
    rowLabelActive: {
      fontFamily: FontFamily.uiMedium,
      color: colors.primary,
    },
    themesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    themeCard: {
      width: '47%',
      backgroundColor: colors.elevated,
      borderRadius: Radius.card,
      borderWidth: 1.5,
      borderColor: colors.border,
      padding: 12,
      position: 'relative',
    },
    themeCardSelected: {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    themeCardPressed: {
      opacity: 0.8,
    },
    swatch: {
      height: 56,
      borderRadius: 8,
      marginBottom: 10,
      overflow: 'hidden',
      flexDirection: 'row',
    },
    swatchAccent: {
      flex: 2,
    },
    swatchPrimary: {
      flex: 1,
    },
    swatchSurface: {
      flex: 1,
    },
    themeLabel: {
      fontSize: 14,
      fontFamily: FontFamily.uiMedium,
      color: colors.text,
    },
    themeLabelActive: {
      color: colors.primary,
    },
    themeDesc: {
      fontSize: 12,
      fontFamily: FontFamily.ui,
      color: colors.muted,
      marginTop: 2,
    },
    selectedBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
