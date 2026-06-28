import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MapPin, Sparkles, ArrowLeft } from 'lucide-react-native';
import { DaIcon } from '@/components/ui/DaIcon';

import { useAuth } from '@/context/AuthContext';
import { useCity } from '@/context/CityContext';
import { updateProfile } from '@/scripts/api';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useOdosColors, type OdosColorPalette } from '@/context/ThemeContext';
import { BrandBaseline } from '@/components/BrandBaseline';
import { CTAButton } from '@/components/ui/CTAButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { SprayBackground } from '@/components/ui/SprayBackground';
import { ResponsiveShell } from '@/components/layout/ResponsiveShell';
import { logError, toAppError } from '@/utils/errorHandling';

export default function OnboardingCityScreen() {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useTranslation();
  const router = useRouter();
  const { user, setUser } = useAuth();
  const { cities, citiesLoading, citiesError, setSelectedCity } = useCity();

  const [selectedName, setSelectedName] = useState<string | null>(user?.homeCity?.trim() || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.homeCity?.trim()) {
      setSelectedName(user.homeCity.trim());
    }
  }, [user?.homeCity]);

  // Catalogue vide après chargement : aucune ville à proposer, on laisse passer
  // l'utilisateur plutôt que de l'enfermer sur une étape impossible à valider.
  const catalogEmpty = !citiesLoading && cities.length === 0;
  const canContinue = (!!selectedName || catalogEmpty) && !saving;

  const handleContinue = async () => {
    if (!canContinue || saving) return;

    // Aucune ville disponible : on continue sans enregistrer de ville de référence.
    if (catalogEmpty && !selectedName) {
      router.replace('/');
      return;
    }

    if (!user?.id || !selectedName) return;

    setSaving(true);
    setError(null);
    try {
      await updateProfile(user.id, { homeCity: selectedName });
      setUser({ ...user, homeCity: selectedName });
      setSelectedCity(selectedName);
      router.replace('/');
    } catch (err) {
      logError('OnboardingCity.save', err, { userId: user.id });
      setError(toAppError(err, t('onboardingCity.errorSave')).userMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SprayBackground>
      <View style={styles.screen}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.topBarTitle}>{t('onboardingCity.topBarTitle')}</Text>
          <View style={styles.backBtn} />
        </View>

        <ResponsiveShell>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.onboardingSteps} accessibilityRole="text" accessibilityLabel={t('onboarding.step2of2')}>
            <View style={styles.onboardingStep}>
              <DaIcon
                name="step-1"
                variant="hero"
                opacity={0.5}
                blob={{ seed: 3, backgroundColor: colors.surface, padding: 6 }}
                accessibilityLabel={t('onboarding.step1')}
              />
              <Text style={[styles.onboardingStepLabel, styles.onboardingStepLabelMuted]}>{t('onboarding.tastes')}</Text>
            </View>
            <View style={styles.onboardingStepDivider} />
            <View style={styles.onboardingStep}>
              <DaIcon
                name="step-2"
                variant="hero"
                blob={{ seed: 4, backgroundColor: colors.accentSoft, padding: 6 }}
                accessibilityLabel={t('onboarding.step2')}
              />
              <Text style={styles.onboardingStepLabel}>{t('onboarding.discovery')}</Text>
            </View>
          </View>

          <View style={styles.header}>
            <BrandBaseline variant="short" style={styles.heroBaseline} />
            <View style={styles.eyebrowRow}>
              <MapPin size={12} color={colors.accent} />
              <Text style={styles.eyebrow}>{t('onboardingCity.eyebrow')}</Text>
            </View>
            <Text style={styles.title}>{t('onboardingCity.title')}</Text>
            <Text style={styles.subtitle}>{t('onboardingCity.subtitle')}</Text>
          </View>

          {(error || citiesError) ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error ?? citiesError}</Text>
            </View>
          ) : null}

          {citiesLoading ? (
            <View style={styles.skeletonGrid}>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} width={120 + (i % 2) * 24} height={44} radius={22} />
              ))}
            </View>
          ) : catalogEmpty ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{t('onboardingCity.emptyText')}</Text>
            </View>
          ) : (
            <View style={styles.chipsContainer}>
              {cities.map((city) => {
                const active = selectedName === city.name;
                return (
                  <Pressable
                    key={city.name}
                    onPress={() => setSelectedName(city.name)}
                    style={[styles.chip, active && styles.chipActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${city.name}, ${t('onboardingCity.activities', { count: city.activityCount })}${active ? `, ${t('common.selected')}` : ''}`}
                  >
                    {active ? (
                      <Sparkles size={14} color={colors.accent} />
                    ) : null}
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{city.name}</Text>
                    <Text style={[styles.chipMeta, active && styles.chipMetaActive]}>
                      {t('onboardingCity.activities', { count: city.activityCount })}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>

        <View style={styles.stickyBar}>
          <CTAButton
            label={selectedName || catalogEmpty ? t('common.continue') : t('onboardingCity.ctaPick')}
            onPress={handleContinue}
            disabled={!canContinue}
            loading={saving}
            size="lg"
            fullWidth
          />
        </View>
        </ResponsiveShell>
      </View>
    </SprayBackground>
  );
}

function createStyles(colors: OdosColorPalette) {
  return StyleSheet.create({
    screen: { flex: 1 },
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
    onboardingStep: { alignItems: 'center', gap: 8, minWidth: 96 },
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
    header: { marginTop: 8, marginBottom: 22 },
    heroBaseline: { fontSize: 16, marginBottom: 14, textAlign: 'left' },
    eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
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
      lineHeight: 34,
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 15,
      fontFamily: FontFamily.ui,
      color: colors.muted,
      lineHeight: 22,
    },
    errorBanner: {
      backgroundColor: colors.errorSurface,
      borderRadius: Radius.card,
      padding: 12,
      marginBottom: 16,
    },
    errorBannerText: {
      color: colors.danger,
      fontFamily: FontFamily.uiMedium,
      fontSize: 14,
    },
    skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    emptyText: {
      fontFamily: FontFamily.ui,
      fontSize: 14,
      lineHeight: 21,
      color: colors.muted,
    },
    chipsContainer: { gap: 10 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: Radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    chipText: {
      fontFamily: FontFamily.uiBold,
      fontSize: 16,
      color: colors.text,
      flex: 1,
    },
    chipTextActive: { color: colors.accent },
    chipMeta: {
      fontFamily: FontFamily.uiMedium,
      fontSize: 12,
      color: colors.muted,
    },
    chipMetaActive: { color: colors.accent },
    stickyBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: Spacing.lg,
      paddingTop: 12,
      paddingBottom: 28,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
  });
}
