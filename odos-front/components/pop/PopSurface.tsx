import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { POP, usePopTokens } from './usePop';

export type PopSurfaceProps = {
  children?: React.ReactNode;
  /** Décalage de l'ombre dure encre (px). `0` désactive l'ombre. Défaut: 6. */
  shadow?: number;
  /** Rayon des coins. Défaut: 10. */
  radius?: number;
  /** Épaisseur du contour encre. Défaut: 2.5. */
  outline?: number;
  /** Fond de la surface (couleur brute). Défaut: papier (`elevated`). */
  fill?: string;
  /** Couleur encre du contour + de l'ombre. Défaut: `text`. */
  ink?: string;
  /** Style appliqué au conteneur extérieur (marges, largeur…). */
  style?: StyleProp<ViewStyle>;
  /** Style appliqué à la surface intérieure (padding…). */
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * Conteneur « pop » : contour encre + ombre dure décalée (calque encre translaté,
 * net sur toutes les plateformes — même technique que `MosaicPopCard`). Généralise
 * l'ossature pour être réutilisé partout (cartes, lignes, en-têtes) quand le thème
 * Mosaïque pop est actif.
 *
 * L'ombre « déborde » en bas/à droite : le conteneur réserve `shadow` px de marge
 * de ce côté pour qu'elle ne soit pas rognée par le parent.
 */
export function PopSurface({
  children,
  shadow = POP.shadow,
  radius = POP.radius,
  outline = POP.outline,
  fill,
  ink,
  style,
  contentStyle,
}: PopSurfaceProps) {
  const t = usePopTokens();
  const inkColor = ink ?? t.ink;
  const bg = fill ?? t.paper;

  return (
    <View style={[shadow > 0 ? { marginRight: shadow, marginBottom: shadow } : null, style]}>
      {shadow > 0 ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: inkColor,
              borderRadius: radius,
              transform: [{ translateX: shadow }, { translateY: shadow }],
            },
          ]}
        />
      ) : null}
      <View
        style={[
          {
            backgroundColor: bg,
            borderColor: inkColor,
            borderWidth: outline,
            borderRadius: radius,
            overflow: 'hidden',
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}
