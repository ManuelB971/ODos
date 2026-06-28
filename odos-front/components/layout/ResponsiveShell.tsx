import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * `ResponsiveShell` — conteneur **web-only** qui *centre* le contenu d'un écran et
 * borne sa largeur (« mobile-first qui s'épanouit, pas qui s'étire »).
 *
 * Cf. docs/AUDIT_RESPONSIVE_WEB.md (Niveau 0) : sur tablette/desktop la web app
 * doit devenir une **colonne lisible centrée** avec des marges chaudes autour
 * (le fond `bg.page` du parent reste plein-cadre derrière), au lieu d'étirer
 * l'UI mobile sur tout le viewport (longueur de ligne illisible, cartes géantes).
 *
 * - **Natif** (`Platform.OS !== 'web'`) : passthrough strict, **aucune** `View`
 *   ajoutée → zéro impact, non-régression par construction.
 * - **Web mobile** : `maxWidth` reste > viewport → neutre (pas de cap visible).
 * - **Web large** : la colonne est capée et centrée (`alignSelf: 'center'`).
 *
 * Le shell est `flex: 1` : il s'insère autour d'un `ScrollView` / `FlatList` /
 * navigateur sans casser le défilement plein-hauteur.
 *
 * ⚠️ Réserver `READING` aux colonnes de lecture (compte, réglages, listes
 * sociales, feed). Les **grilles de découverte** (favoris, recherche) veulent au
 * contraire s'élargir : leur passer un `maxWidth` large (`WIDE`) ou les laisser
 * gérer leurs colonnes via `useResponsive()` — ne jamais les caper à 760.
 */
export const SHELL_MAX_WIDTH = {
  /** Colonne de lecture centrée (~44-54 car. — DA §3). */
  reading: 760,
  /** Grilles / contenus larges qui veulent de la densité sur desktop. */
  wide: 1200,
} as const;

type Props = {
  children: React.ReactNode;
  /** Largeur maximale de la colonne (défaut : colonne de lecture). */
  maxWidth?: number;
  style?: StyleProp<ViewStyle>;
};

export function ResponsiveShell({ children, maxWidth = SHELL_MAX_WIDTH.reading, style }: Props) {
  if (Platform.OS !== 'web') return <>{children}</>;
  return <View style={[styles.shell, { maxWidth }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
});
