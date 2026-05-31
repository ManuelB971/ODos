import { Tabs, useRouter } from 'expo-router';

import { Compass, Search, User } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { Colors, FontFamily } from '@/constants/theme';

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
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
          backgroundColor: Colors.light.background,
          borderTopColor: Colors.light.border,
          height: 50,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontFamily: FontFamily.uiMedium,
          fontSize: 11,
        },
        tabBarActiveTintColor: Colors.light.accent,
        tabBarInactiveTintColor: Colors.light.muted,
      }}

    >
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          tabBarIcon: ({ color, size }) => <Compass color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: '',
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
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
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
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
