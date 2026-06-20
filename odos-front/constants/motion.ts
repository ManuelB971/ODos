import { useReducedMotion } from 'react-native-reanimated';

/**
 * Durées de mouvement standardisées (Pro Max §7 : micro-interactions 150–300 ms).
 * Source unique pour garder un rythme cohérent dans toute l'app.
 */
export const Motion = {
  fast: 150,
  normal: 250,
  slow: 400,
  scalePress: 0.97,
} as const;

export type MotionConfig = {
  /** Renvoie 0 si l'utilisateur a activé « réduire les animations », sinon `ms`. */
  duration: (ms: number) => number;
  /** `true` si les animations doivent être désactivées. */
  reduced: boolean;
};

/**
 * Reduced motion centralisé (a11y `#reduced-motion`). Les composants animés
 * passent leurs durées par `duration()` pour respecter le réglage système.
 */
export function useMotionConfig(): MotionConfig {
  const reduced = useReducedMotion();
  return {
    reduced,
    duration: (ms: number) => (reduced ? 0 : ms),
  };
}
