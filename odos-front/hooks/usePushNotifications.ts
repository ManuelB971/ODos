import { useEffect } from 'react';
import { Platform } from 'react-native';
import { registerPushToken } from '@/scripts/api';
import { useAuth } from '@/context/AuthContext';

export function usePushNotifications() {
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user?.socialConsentedAt || Platform.OS === 'web') {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const Notifications = await import('expo-notifications');
        const Device = await import('expo-device');

        if (!Device.isDevice) {
          return;
        }

        const { status: existing } = await Notifications.getPermissionsAsync();
        const status = existing === 'granted'
          ? existing
          : (await Notifications.requestPermissionsAsync()).status;

        if (status !== 'granted' || cancelled) {
          return;
        }

        const token = (await Notifications.getExpoPushTokenAsync()).data;
        if (!cancelled && token) {
          await registerPushToken(token, Platform.OS);
        }
      } catch {
        // Push non disponible (Expo Go, simulateur, etc.)
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.socialConsentedAt]);
}
