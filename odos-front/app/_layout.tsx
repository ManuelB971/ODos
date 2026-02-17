import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { InterestProvider } from '@/context/interestcontext';
import { AuthProvider } from '@/context/AuthContext';

export default function RootLayout() {
  useFrameworkReady();
  // #region agent log
  if (typeof fetch === 'function') fetch('http://127.0.0.1:7242/ingest/ab9914e8-3931-443d-a90f-83ea77909bac', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/_layout.tsx:RootLayout', message: 'App root layout mounted', data: { runId: 'post-fix' }, hypothesisId: 'H1', timestamp: Date.now() }) }).catch(() => { });
  // #endregion

  return (
    <AuthProvider>
      <InterestProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="interests" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </InterestProvider>
    </AuthProvider>
  );
}
