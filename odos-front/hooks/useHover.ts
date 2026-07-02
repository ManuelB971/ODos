import { useState } from 'react';
import { Platform } from 'react-native';

/**
 * États **pointer/clavier** pour le desktop web (DA §7 hover, §8 focus visible).
 *
 * - **Web** : expose `hovered` (survol souris) et `focused` (focus clavier) +
 *   `bind` à étaler sur un `Pressable` (`onHoverIn/Out`, `onFocus/Blur`).
 * - **Natif** (iOS/Android) : `bind` est **vide** et les booléens restent `false`
 *   → zéro handler ajouté, aucun impact tactile (non-régression par construction).
 *
 * Les transitions douces s'obtiennent en ajoutant, côté style **web only**,
 * `transitionDuration`/`transitionProperty` (supportés par react-native-web).
 */
const IS_WEB = Platform.OS === 'web';

export type HoverBind = {
  onHoverIn?: () => void;
  onHoverOut?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
};

export function useHover(): { hovered: boolean; focused: boolean; bind: HoverBind } {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  if (!IS_WEB) return { hovered: false, focused: false, bind: {} };

  return {
    hovered,
    focused,
    bind: {
      onHoverIn: () => setHovered(true),
      onHoverOut: () => setHovered(false),
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
    },
  };
}
