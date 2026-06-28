import { Platform, type ViewStyle } from 'react-native';

import { useResponsive } from '@/hooks/useResponsive';

/**
 * Adapte les **bottom sheets** au desktop web : une feuille qui glisse du bas est
 * l'idiome **mobile** ; sur grand écran elle doit devenir une **modale centrée**
 * et bornée (≤ 480 px). Cf. docs/AUDIT_RESPONSIVE_WEB.md (Niveau 1).
 *
 * Source unique : ne pas redéfinir ces overrides écran par écran.
 *
 * Usage (sur un sheet existant `backdrop` flex-end + `sheet` coins hauts arrondis) :
 * ```tsx
 * const sheet = useResponsiveSheet();
 * <View style={[styles.backdrop, sheet.backdrop]}>
 *   <View style={[styles.sheet, sheet.sheet]}>…</View>
 * </View>
 * ```
 *
 * - **Natif / web mobile / tablette** : objets vides → comportement bottom-sheet inchangé.
 * - **Desktop web** : backdrop centré + feuille `maxWidth 480`, tous coins arrondis.
 */
export type ResponsiveSheet = {
  backdrop: ViewStyle;
  sheet: ViewStyle;
};

/** Largeur max d'une feuille recentrée sur desktop — source unique. */
export const SHEET_MAX_WIDTH = 480;

const EMPTY: ResponsiveSheet = { backdrop: {}, sheet: {} };

export function useResponsiveSheet(): ResponsiveSheet {
  const { isDesktop } = useResponsive();
  if (Platform.OS !== 'web' || !isDesktop) return EMPTY;
  return {
    backdrop: { justifyContent: 'center', alignItems: 'center', padding: 24 },
    sheet: {
      width: '100%',
      maxWidth: SHEET_MAX_WIDTH,
      alignSelf: 'center',
      borderRadius: 20,
      maxHeight: '85%',
    },
  };
}
