import * as Haptics from 'expo-haptics';

/**
 * Retour haptique léger pour confirmer une action (favori, envoi de message,
 * acceptation d'ami). Limité à iOS (cf. `HapticTab`) ; no-op ailleurs.
 */
export function tapHaptic(): void {
  if (process.env.EXPO_OS === 'ios') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}
