import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useSocialUnreadCount } from '@/hooks/useSocialUnreadCount';

/**
 * Synchronise le compteur sur l'icône de l'app (home screen / launcher) avec le
 * total de non-lus social. Miroir natif du badge d'onglet Communauté.
 *
 * À monter une fois sous un utilisateur connecté ayant consenti au social
 * (le compteur `useSocialUnreadCount` est déjà gardé par ce consentement).
 */
export function useAppIconBadge(): void {
  const { data } = useSocialUnreadCount();
  const total = data?.total ?? 0;

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let cancelled = false;
    (async () => {
      try {
        const Notifications = await import('expo-notifications');
        if (cancelled) return;
        await Notifications.setBadgeCountAsync(total);
      } catch {
        // expo-notifications indisponible (Expo Go, simulateur, web…)
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [total]);
}
