import React, { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Sparkles } from 'lucide-react-native';
import { DaIcon } from '@/components/ui/DaIcon';

import { useInterests } from '@/context/InterestContext';
import { useAuth } from '@/context/AuthContext';
import { fetchCategories, updateUserInterests } from '@/scripts/api';
import { Category } from '@/types';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useOdosColors, type OdosColorPalette } from '@/context/ThemeContext';
import { BrandBaseline } from '@/components/BrandBaseline';
import { CTAButton } from '@/components/ui/CTAButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { SprayBackground } from '@/components/ui/SprayBackground';
import { logError, toAppError } from '@/utils/errorHandling';

/**
 * Écran de sélection des centres d'intérêt.
 *
 * Refonte premium :
 *  - Eyebrow serif + titre éditorial + aide contextualisée (2–7 choix).
 *  - Chips tactiles à bord arrondi avec icône check à l'active.
 *  - Compteur de sélection live + sticky CTA bottom.
 *  - Skeleton pendant le chargement des catégories.
 *  - Gestion d'erreur visible (et retry) sans `Alert.alert`.
 */
const MIN_SELECTION = 1;
const MAX_SELECTION = 7;

const InterestsScreen = () => {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { interests: storedNames, setInterests } = useInterests();
  const { user } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCategories()
      .then((data) => {
        if (cancelled) return;
        setCategories(data);
        // Pré-sélectionner depuis le contexte si l'utilisateur a déjà des intérêts
        const preselected = data
          .filter((c) => storedNames.includes(c.name))
          .map((c) => c.id);
        setSelectedIds(preselected);
      })
      .catch((err) => {
        logError('Interests.fetchCategories', err);
        setError(toAppError(err, 'Impossible de charger les catégories.').userMessage);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [storedNames]);

  const toggleInterest = (cat: Category) => {
    setSelectedIds((prev) => {
      if (prev.includes(cat.id)) return prev.filter((id) => id !== cat.id);
      if (prev.length >= MAX_SELECTION) return prev;
      return [...prev, cat.id];
    });
  };

  const canContinue = useMemo(
    () => selectedIds.length >= MIN_SELECTION && !saving,
    [selectedIds.length, saving]
  );

  const handleContinue = async () => {
    if (!canContinue) return;

    const selectedNames = categories
      .filter((c) => selectedIds.includes(c.id))
      .map((c) => c.name);
    setInterests(selectedNames);

    if (user?.id) {
      setSaving(true);
      try {
        const iris = selectedIds.map((id) => `/api/categories/${id}`);
        await updateUserInterests(user.id, iris);
      } catch (err) {
        logError('Interests.updateUserInterests', err, { userId: user.id });
        setError(toAppError(err, "Impossible d'enregistrer vos intérêts.").userMessage);
        setSaving(false);
        return;
      } finally {
        setSaving(false);
      }
    }

    router.replace('/');
  };

  return (
    <SprayBackground>
      <View style={styles.screen}>
      {/* Header de navigation (back seulement si on a déjà un user ; sinon onboarding direct). */}
      <View style={styles.topBar}>
        {user ? (
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.backBtn} />
        )}
        <Text style={styles.topBarTitle}>Vos intérêts</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!user ? (
          <View style={styles.onboardingSteps} accessibilityRole="text" accessibilityLabel="Étape 1 sur 2">
            <View style={styles.onboardingStep}>
              <DaIcon name="step-1" size={36} accessibilityLabel="Étape 1" />
              <Text style={styles.onboardingStepLabel}>Vos goûts</Text>
            </View>
            <View style={styles.onboardingStepDivider} />
            <View style={styles.onboardingStep}>
              <DaIcon name="step-2" size={36} opacity={0.45} accessibilityLabel="Étape 2" />
              <Text style={[styles.onboardingStepLabel, styles.onboardingStepLabelMuted]}>
                Découverte
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.header}>
          <BrandBaseline variant="short" style={styles.heroBaseline} />
          <View style={styles.eyebrowRow}>
            <Sparkles size={12} color={colors.accent} />
            <Text style={styles.eyebrow}>PERSONNALISATION</Text>
          </View>
          <Text style={styles.title}>Qu&apos;est-ce qui vous inspire ?</Text>
          <Text style={styles.subtitle}>
            Sélectionnez {MIN_SELECTION} à {MAX_SELECTION} centres d&apos;intérêt pour
            que nous adaptions vos découvertes.
          </Text>
        </View>

        <View style={styles.counterRow}>
          <Text style={styles.counterText}>
            <Text style={styles.counterValue}>{selectedIds.length}</Text>
            <Text style={styles.counterMuted}> / {MAX_SELECTION} choisis</Text>
          </Text>
          {selectedIds.length > 0 ? (
            <Pressable
              onPress={() => setSelectedIds([])}
              hitSlop={6}
              accessibilityRole="button"
            >
              <Text style={styles.resetText}>Tout effacer</Text>
            </Pressable>
          ) : null}
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.skeletonGrid}>
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} width={96 + (i % 3) * 20} height={38} radius={19} />
            ))}
          </View>
        ) : (
          <View style={styles.chipsContainer}>
            {categories.map((cat) => {
              const active = selectedIds.includes(cat.id);
              const disabled = !active && selectedIds.length >= MAX_SELECTION;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => toggleInterest(cat)}
                  disabled={disabled}
                  style={[
                    styles.chip,
                    active && styles.chipActive,
                    disabled && styles.chipDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active, disabled }}
                  accessibilityLabel={`${cat.name}${active ? ', sélectionné' : ''}`}
                >
                  {active ? <DaIcon name="check-mark" size={14} accessibilityLabel="Sélectionné" /> : null}
                  <Text
                    style={[
                      styles.chipText,
                      active && styles.chipTextActive,
                      disabled && styles.chipTextDisabled,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Sticky CTA en bas — toujours visible */}
      <View style={styles.stickyBar}>
        <CTAButton
          label={selectedIds.length === 0 ? 'Choisissez au moins 1 intérêt' : 'Continuer'}
          onPress={handleContinue}
          disabled={!canContinue}
          loading={saving}
          size="lg"
          fullWidth
        />
      </View>
      </View>
    </SprayBackground>
  );
};

export default InterestsScreen;

function createStyles(colors: OdosColorPalette) {
  return StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 44,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.elevated,
  },
  topBarTitle: {
    fontSize: 14,
    fontFamily: FontFamily.uiBold,
    color: colors.text,
    letterSpacing: 0.2,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 140,
  },
  onboardingSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 4,
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Radius.card,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  onboardingStep: {
    alignItems: 'center',
    gap: 6,
    minWidth: 88,
  },
  onboardingStepDivider: {
    width: 28,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.border,
  },
  onboardingStepLabel: {
    fontSize: 11,
    fontFamily: FontFamily.uiBold,
    color: colors.text,
    letterSpacing: 0.3,
  },
  onboardingStepLabelMuted: {
    color: colors.muted,
    fontFamily: FontFamily.uiMedium,
  },
  header: {
    marginTop: 8,
    marginBottom: 22,
  },
  heroBaseline: {
    fontSize: 16,
    marginBottom: 14,
    textAlign: 'left',
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 2,
    color: colors.accent,
    fontFamily: FontFamily.uiBold,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontFamily: FontFamily.display,
    color: colors.text,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: FontFamily.ui,
    lineHeight: 22,
    color: colors.muted,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  counterText: {
    fontSize: 14,
    fontFamily: FontFamily.ui,
    color: colors.text,
  },
  counterValue: {
    fontFamily: FontFamily.uiBold,
    color: colors.accent,
  },
  counterMuted: {
    color: colors.muted,
    fontFamily: FontFamily.uiMedium,
  },
  resetText: {
    fontSize: 13,
    fontFamily: FontFamily.uiBold,
    color: colors.primary,
  },
  errorBanner: {
    padding: 12,
    backgroundColor: colors.errorSurface,
    borderColor: `${colors.danger}55`,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 14,
  },
  errorBannerText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: colors.elevated,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipText: {
    fontSize: 14,
    fontFamily: FontFamily.uiMedium,
    color: colors.text,
  },
  chipTextActive: {
    color: '#ffffff',
    fontFamily: FontFamily.uiBold,
  },
  chipTextDisabled: {
    color: colors.muted,
  },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 18,
    backgroundColor: `${colors.background}F5`,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
}
