import { Tabs, useRouter } from 'expo-router';

import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useCity } from '@/context/CityContext';
import { getOnboardingRoute, hasCompletedOnboarding, ONBOARDING_CITY_HREF } from '@/utils/onboardingRoute';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { BlobFrame } from '@/components/ui/BlobFrame';
import { HapticTab } from '@/components/HapticTab';
import { useSocialUnreadCount } from '@/hooks/useSocialUnreadCount';
import { useAppIconBadge } from '@/hooks/useAppIconBadge';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';
import React, { useEffect } from 'react';

type TabIconName = React.ComponentProps<typeof MaterialIcons>['name'];

export default function TabLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { cities, citiesLoading } = useCity();
  const router = useRouter();
  const colors = useOdosColors();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();
  const { data: unread } = useSocialUnreadCount();
  // Synchronise le badge sur l'icône de l'app avec les non-lus social.
  useAppIconBadge();
  const badgeCount = unread?.total ?? 0;
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (!user || hasCompletedOnboarding(user)) return;

    const next = getOnboardingRoute(user);
    // Catalogue de villes vide (aucune activité publiée localisée) : on ne bloque
    // pas l'utilisateur sur l'étape ville, sinon il reste enfermé hors de l'app.
    if (next === ONBOARDING_CITY_HREF && !citiesLoading && cities.length === 0) return;
    router.replace(next);
  }, [isAuthenticated, isLoading, user, cities.length, citiesLoading, router]);

  const renderTabIcon = (
    name: TabIconName,
    seed: number,
    label: string,
  ) => function TabIcon({ focused }: { focused: boolean }) {
    // ── Mosaïque pop : pastille orange + contour encre + ombre dure (shell.css) ──
    if (isMosaicPop) {
      return (
        <View
          style={styles.tabIconSlot}
          accessibilityLabel={label}
          accessibilityRole="image"
        >
          {focused ? (
            <View style={styles.popPillWrap}>
              <View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, styles.popPillShadow, { backgroundColor: pop.ink }]}
              />
              <View style={[styles.popPill, { backgroundColor: pop.orange, borderColor: pop.ink }]}>
                <MaterialIcons name={name} size={22} color={pop.ink} />
              </View>
            </View>
          ) : (
            <MaterialIcons name={name} size={24} color={pop.muted} />
          )}
        </View>
      );
    }

    // ── Classique : BlobFrame (inchangé) ──
    return (
      <View
        style={styles.tabIconSlot}
        accessibilityLabel={label}
        accessibilityRole="image"
      >
        {focused ? (
          <BlobFrame size={44} seed={seed} backgroundColor={colors.accentSoft}>
            <MaterialIcons name={name} size={24} color={colors.accent} />
          </BlobFrame>
        ) : (
          <MaterialIcons name={name} size={24} color={colors.muted} />
        )}
      </View>
    );
  };

  // Onglet central « Parcours » : bouton orange proéminent (playlist façon
  // Spotify). Pastille pleine + léger soulèvement, distinct des icônes-traits.
  const renderParcoursIcon = () => function ParcoursTabIcon() {
    if (isMosaicPop) {
      return (
        <View style={styles.centerSlot}>
          <View style={styles.centerWrap}>
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, styles.centerShadow, { backgroundColor: pop.ink }]}
            />
            <View style={[styles.centerBtn, { backgroundColor: pop.orange, borderColor: pop.ink, borderWidth: 2.5 }]}>
              <MaterialIcons name="route" size={26} color={pop.ink} />
            </View>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.centerSlot}>
        <View style={styles.centerWrap}>
          <View style={[styles.centerBtn, { backgroundColor: colors.accent, borderColor: colors.background, borderWidth: 4 }]}>
            <MaterialIcons name="route" size={26} color={colors.onAccent} />
          </View>
        </View>
      </View>
    );
  };

  // Libellés sous chaque icône (classic + mosaïque pop).
  const tabLabelStyle = isMosaicPop
    ? {
        fontFamily: FontFamily.uiBold,
        fontSize: 9.5,
        letterSpacing: 0.6,
        textTransform: 'uppercase' as const,
        marginTop: 6,
      }
    : {
        fontFamily: FontFamily.uiMedium,
        fontSize: 11,
        marginTop: 6,
      };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: isMosaicPop
          ? {
              backgroundColor: pop.paper,
              borderTopColor: pop.ink,
              borderTopWidth: 2.5,
              height: 68,
              paddingBottom: 8,
              paddingTop: 4,
            }
          : {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              height: 68,
              paddingBottom: 8,
              paddingTop: 4,
            },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarLabelStyle: tabLabelStyle,
        tabBarActiveTintColor: isMosaicPop ? pop.ink : colors.accent,
        tabBarInactiveTintColor: isMosaicPop ? pop.muted : colors.muted,
      }}

    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: renderTabIcon('explore', 0, 'Accueil'),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Recherche',
          tabBarIcon: renderTabIcon('search', 1, 'Recherche'),
        }}
      />
      <Tabs.Screen
        name="parcours"
        options={{
          title: 'Parcours',
          tabBarIcon: renderParcoursIcon(),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Communauté',
          tabBarIcon: renderTabIcon('groups', 2, 'Communauté'),
          tabBarBadge: badgeCount > 0 ? badgeCount : undefined,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Compte',
          tabBarIcon: renderTabIcon('person', 3, 'Compte'),
        }}
      />
    </Tabs>

  );
}

const styles = StyleSheet.create({
  tabIconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
    minHeight: 44,
  },
  // ── pop pill (onglet actif) ──
  popPillWrap: {
    width: 46,
    height: 30,
  },
  popPillShadow: {
    borderRadius: 100,
    transform: [{ translateX: 2 }, { translateY: 2 }],
  },
  popPill: {
    flex: 1,
    borderRadius: 100,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Onglet central Parcours (bouton proéminent) ──
  centerSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 56,
  },
  centerWrap: {
    width: 52,
    height: 52,
    transform: [{ translateY: -8 }],
  },
  centerShadow: {
    borderRadius: 100,
    transform: [{ translateX: 2 }, { translateY: 2 }],
  },
  centerBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
