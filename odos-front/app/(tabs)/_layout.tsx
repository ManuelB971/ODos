import { Tabs, useRouter } from 'expo-router';

import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { BlobFrame } from '@/components/ui/BlobFrame';
import React, { useEffect } from 'react';

type TabIconName = React.ComponentProps<typeof MaterialIcons>['name'];

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const colors = useOdosColors();
  useEffect(() => {

    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const renderTabIcon = (
    name: TabIconName,
    seed: number,
    label: string,
  ) => ({ focused }: { focused: boolean }) => (
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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          fontFamily: FontFamily.uiMedium,
          fontSize: 11,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
      }}

    >
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          tabBarIcon: renderTabIcon('explore', 0, 'Accueil'),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: '',
          tabBarIcon: renderTabIcon('search', 1, 'Recherche'),
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
          title: '',
          tabBarIcon: renderTabIcon('person', 2, 'Compte'),
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
    minHeight: 44,
  },
});
