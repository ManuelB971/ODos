import { useEffect } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';

type NotificationData = Record<string, unknown>;

/**
 * Route vers l'écran ciblé quand l'utilisateur tape une notification push
 * (réponse). Complète {@link usePushNotifications} qui ne fait qu'enregistrer le
 * token. Gère aussi l'ouverture à froid (app lancée depuis une notif).
 */
function routeFromData(data: NotificationData | undefined): void {
  if (!data || typeof data.type !== 'string') return;

  switch (data.type) {
    case 'chat_message':
      if (typeof data.conversationId === 'number') router.push(`/chat/${data.conversationId}`);
      break;
    case 'group_message':
      if (typeof data.groupId === 'number') router.push(`/group-chat/${data.groupId}`);
      break;
    case 'group_invitation':
      router.push('/group-invitations');
      break;
    case 'activity_share':
      router.push('/(tabs)/community/friends');
      break;
    case 'friend_request':
      router.push('/(tabs)/community/friends');
      break;
    default:
      break;
  }
}

export function useNotificationResponse(): void {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let subscription: { remove: () => void } | undefined;
    let cancelled = false;

    (async () => {
      try {
        const Notifications = await import('expo-notifications');

        // Comportement en premier plan : bannière + son + maj du badge, sans
        // alerte modale bloquante (Jakob : ne pas interrompre la lecture).
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });

        // Canal Android « social » (cible de `channelId` côté backend). Sans lui,
        // Android 8+ rangerait les push dans le canal par défaut.
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('social', {
            name: 'Social',
            importance: Notifications.AndroidImportance.HIGH,
            sound: 'default',
          });
        }

        // App lancée depuis une notif (cold start).
        const last = await Notifications.getLastNotificationResponseAsync();
        if (!cancelled && last) {
          routeFromData(last.notification.request.content.data as NotificationData);
        }

        // App déjà ouverte / en arrière-plan.
        subscription = Notifications.addNotificationResponseReceivedListener((response) => {
          routeFromData(response.notification.request.content.data as NotificationData);
        });
      } catch {
        // expo-notifications indisponible (Expo Go, simulateur…)
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);
}
