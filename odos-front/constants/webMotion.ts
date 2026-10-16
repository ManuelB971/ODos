import { Platform, StyleSheet, type ViewStyle } from 'react-native';

import { Motion } from '@/constants/motion';

/**
 * Mouvement **web** (react-native-web) : animations CSS déclarées en style RN
 * (`animationKeyframes`, `animationDuration`…), que react-native-web compile en
 * `@keyframes`. Pas de JS par frame, interruptible, et coupé par la media query
 * `prefers-reduced-motion` de `WebGlobalStyles`.
 *
 * ⚠️ react-native-web ne compile les keyframes que dans `StyleSheet.create` (pas en
 * style inline) : tous les styles d'animation sont donc précompilés ci-dessous.
 *
 * DA §7 : `cubic-bezier(0.22, 1, 0.36, 1)`, entrée en `fadeUp` léger, stagger court.
 * Natif : tous les helpers renvoient `undefined` → rendu iOS/Android inchangé.
 */
const IS_WEB = Platform.OS === 'web';

/** Courbe de la landing (DA §7) : décélération douce, sans rebond. */
export const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';

/** Décalage entre deux éléments d'une liste / grille (Pro Max : 30–50 ms). */
const STAGGER_MS = 40;
/** Au-delà, les éléments apparaissent ensemble : une longue cascade fait attendre. */
const STAGGER_MAX = 8;

// Deux jeux identiques nommés différemment : alterner de l'un à l'autre change
// `animation-name` et rejoue l'animation sans démonter le contenu.
const fadeUp = (distance: number) => [
  {
    from: { opacity: 0, transform: `translateY(${distance}px)` },
    to: { opacity: 1, transform: 'translateY(0px)' },
  },
];

function animation(keyframes: unknown, duration: number, delay = 0): ViewStyle {
  return {
    animationKeyframes: keyframes,
    animationDuration: `${duration}ms`,
    animationDelay: `${delay}ms`,
    animationTimingFunction: EASE_OUT,
    // `backwards` : 1re image pendant le délai, puis plus aucun transform résiduel
    // (un transform persistant créerait un nouveau contexte d'empilement).
    animationFillMode: 'backwards',
  } as unknown as ViewStyle;
}

const FADE_UP_SM = fadeUp(8);
const POP_IN = [
  {
    from: { opacity: 0, transform: 'translateY(10px) scale(0.98)' },
    to: { opacity: 1, transform: 'translateY(0px) scale(1)' },
  },
];

const styles = IS_WEB
  ? StyleSheet.create({
      screenEnter: animation(fadeUp(14), Motion.normal + 60),
      tabFocusA: animation(FADE_UP_SM, Motion.normal),
      // Keyframes différentes (7 px) : react-native-web nomme une animation d'après
      // son contenu, deux jeux identiques auraient le même nom et ne se rejoueraient pas.
      tabFocusB: animation(fadeUp(7), Motion.normal),
      popIn: animation(POP_IN, Motion.normal),
      fadeIn: animation([{ from: { opacity: 0 }, to: { opacity: 1 } }], Motion.normal),
      ...Object.fromEntries(
        Array.from({ length: STAGGER_MAX + 1 }, (_, i) => [
          `stagger${i}`,
          animation(FADE_UP_SM, Motion.normal, i * STAGGER_MS),
        ]),
      ),
    })
  : null;

type WebStyles = Record<string, ViewStyle>;
const s = styles as WebStyles | null;

/** Entrée d'une page (navigation Stack) : glissé vers le haut + fondu. */
export function webScreenEnter(): ViewStyle | undefined {
  return s?.screenEnter;
}

/**
 * Retour sur un onglet déjà monté : fondu court. `epoch` alterne le nom de
 * l'animation pour la rejouer à chaque focus.
 */
export function webTabFocus(epoch: number): ViewStyle | undefined {
  return epoch % 2 === 0 ? s?.tabFocusA : s?.tabFocusB;
}

/** Élément n° `index` d'une liste ou grille : cascade de 40 ms, plafonnée. */
export function webStagger(index: number): ViewStyle | undefined {
  return s?.[`stagger${Math.min(Math.max(index, 0), STAGGER_MAX)}`];
}

/** Carte flottante / panneau qui apparaît (fiche de lieu sur la carte…). */
export function webPopIn(): ViewStyle | undefined {
  return s?.popIn;
}

/** Apparition simple (bannières, états vides). */
export function webFadeIn(): ViewStyle | undefined {
  return s?.fadeIn;
}

/**
 * Marque un élément cliquable pour les états de survol/appui de `WebGlobalStyles`
 * (`data-odos="lift"` : la carte se soulève ; `"chip"` : fond éclairci ; `"row"` :
 * ligne de liste). À étaler sur un `Pressable` ; vide en natif.
 */
export function webInteraction(kind: 'lift' | 'chip' | 'row'): object {
  return IS_WEB ? { dataSet: { odos: kind } } : {};
}
