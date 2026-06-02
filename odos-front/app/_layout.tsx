import { useState } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  CormorantGaramond_600SemiBold,
  CormorantGaramond_600SemiBold_Italic,
} from '@expo-google-fonts/cormorant-garamond';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { Courgette_400Regular } from '@expo-google-fonts/courgette';
import { useFonts } from 'expo-font';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { InterestProvider } from '@/context/InterestContext';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ThemedStatusBar } from '@/components/ThemedStatusBar';
import { BadgeUnlockProvider, useBadgeUnlock } from '@/context/BadgeUnlockContext';
import { BadgeUnlockModal } from '@/components/badges/BadgeUnlockModal';
import SplashScreen from '@/components/SplashScreen';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function BadgeUnlockOverlay() {
  const { pendingUnlock, dismissUnlock } = useBadgeUnlock();
  return <BadgeUnlockModal badge={pendingUnlock} onClose={dismissUnlock} />;
}

export default function RootLayout() {
  useFrameworkReady();
  const [splashDone, setSplashDone] = useState(false);
  const [fontsLoaded] = useFonts({
    CormorantGaramond_600SemiBold,
    CormorantGaramond_600SemiBold_Italic,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    Courgette_400Regular,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
          <AuthProvider>
            <BadgeUnlockProvider>
              <InterestProvider>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="login" options={{ headerShown: false }} />
                  <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
                  <Stack.Screen name="reset-password" options={{ headerShown: false }} />
                  <Stack.Screen name="interests" options={{ headerShown: false }} />
                  <Stack.Screen name="settings" options={{ headerShown: false }} />
                  <Stack.Screen name="badges" options={{ headerShown: false }} />
                  <Stack.Screen name="legal" options={{ headerShown: false }} />
                  <Stack.Screen name="map" options={{ headerShown: false, animation: 'fade' }} />
                  <Stack.Screen name="+not-found" />
                </Stack>
                <BadgeUnlockOverlay />
                <ThemedStatusBar />
                {!splashDone && (
                  <SplashScreen onFinish={() => setSplashDone(true)} />
                )}
              </InterestProvider>
            </BadgeUnlockProvider>
          </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
