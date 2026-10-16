import { Platform } from 'react-native';
import * as Location from 'expo-location';

export type PositionCallback = (latitude: number, longitude: number) => void;

type Options = {
  /** Distance minimale entre deux positions (m). Natif uniquement. */
  distanceInterval: number;
  /** Intervalle minimal entre deux positions (ms). */
  timeInterval: number;
};

/**
 * Suit la position au premier plan et renvoie une fonction d'arrêt, ou `null` si
 * l'autorisation est refusée / la géolocalisation indisponible.
 *
 * Web : `navigator.geolocation` directement. `Location.watchPositionAsync` de
 * expo-location 19 plante à l'arrêt sur le web (`LocationEventEmitter.removeSubscription
 * is not a function` : l'EventEmitter web du SDK 54 n'a plus cette méthode), ce qui
 * faisait tomber tout l'écran carte. Le navigateur demande lui-même l'autorisation.
 *
 * Natif : expo-location, inchangé.
 */
export async function watchForegroundPosition(
  onPosition: PositionCallback,
  { distanceInterval, timeInterval }: Options,
): Promise<(() => void) | null> {
  if (Platform.OS === 'web') {
    const geo = typeof navigator !== 'undefined' ? navigator.geolocation : undefined;
    if (!geo) return null;
    const id = geo.watchPosition(
      (pos) => onPosition(pos.coords.latitude, pos.coords.longitude),
      () => {
        // Refus ou position indisponible : l'app continue sans exploration.
      },
      { enableHighAccuracy: false, maximumAge: timeInterval, timeout: timeInterval },
    );
    return () => geo.clearWatch(id);
  }

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const subscription = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.Balanced, distanceInterval, timeInterval },
    (loc) => onPosition(loc.coords.latitude, loc.coords.longitude),
  );
  return () => subscription.remove();
}
