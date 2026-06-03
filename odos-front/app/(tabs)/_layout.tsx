import { Tabs, useRouter } from 'expo-router';

import { View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { DaIcon } from '@/components/ui/DaIcon';
import { useEffect } from 'react';
export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const colors = useOdosColors();
  useEffect(() => {

    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: 56,
          paddingBottom: 10,
          paddingTop: 4,
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
          tabBarIcon: ({ focused }) => (
            <View style={{ opacity: focused ? 1 : 0.72, transform: [{ scale: focused ? 1.04 : 1 }] }}>
              <DaIcon name="boussole" size={26} accessibilityLabel="Accueil" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: '',
          tabBarIcon: ({ focused }) => (
            <View style={{ opacity: focused ? 1 : 0.72, transform: [{ scale: focused ? 1.04 : 1 }] }}>
              <DaIcon name="loupe" size={26} accessibilityLabel="Recherche" />
            </View>
          ),
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
          tabBarIcon: ({ focused }) => (
            <View style={{ opacity: focused ? 1 : 0.72, transform: [{ scale: focused ? 1.04 : 1 }] }}>
              <DaIcon name="user" size={26} accessibilityLabel="Compte" />
            </View>
          ),
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
