import { Tabs, useRouter } from 'expo-router';

import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { BlobFrame } from '@/components/ui/BlobFrame';
import { useSocialUnreadCount } from '@/hooks/useSocialUnreadCount';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';
import React, { useEffect } from 'react';

type TabIconName = React.ComponentProps<typeof MaterialIcons>['name'];

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const colors = useOdosColors();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();
  const { data: unread } = useSocialUnreadCount();
  const badgeCount = unread?.total ?? 0;
  useEffect(() => {

    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

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

  // En mosaïque pop, on affiche des libellés majuscules sous chaque icône (le
  // classique reste sans libellé — `title: ''`).
  const tabTitle = (mosaic: string) => (isMosaicPop ? mosaic : '');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: isMosaicPop
          ? {
              backgroundColor: pop.paper,
              borderTopColor: pop.ink,
              borderTopWidth: 2.5,
              height: 66,
              paddingBottom: 8,
              paddingTop: 6,
            }
          : {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              height: 62,
              paddingBottom: 8,
              paddingTop: 6,
            },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarLabelStyle: isMosaicPop
          ? {
              fontFamily: FontFamily.uiBold,
              fontSize: 9.5,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
            }
          : {
              fontFamily: FontFamily.uiMedium,
              fontSize: 11,
            },
        tabBarActiveTintColor: isMosaicPop ? pop.ink : colors.accent,
        tabBarInactiveTintColor: isMosaicPop ? pop.muted : colors.muted,
      }}

    >
      <Tabs.Screen
        name="index"
        options={{
          title: tabTitle('Accueil'),
          tabBarIcon: renderTabIcon('explore', 0, 'Accueil'),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: tabTitle('Recherche'),
          tabBarIcon: renderTabIcon('search', 1, 'Recherche'),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: tabTitle('Communauté'),
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
          title: tabTitle('Compte'),
          tabBarIcon: renderTabIcon('person', 3, 'Compte'),
        }}
      />
      <Tabs.Screen
        name="styles"
        options={{
          href: null,
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
    minHeight: 32,
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
});
