import { useWindowDimensions } from 'react-native';

/**
 * Breakpoints responsives ODOS — **source unique** pour adapter les layouts à la
 * largeur d'écran (surtout web : tablette / desktop).
 *
 * ⚠️ Problème récurrent : des grilles à `numColumns` **figé** + cartes `flex:1`
 * (largeur = viewport ÷ N, jamais capée) → cartes énormes sur grand écran.
 * Règle : **ne jamais coder en dur le nombre de colonnes** d'une grille de cartes.
 * Utiliser `gridColumns` ici, ou caper la largeur des cartes.
 * Voir docs/AUDIT_RESPONSIVE_WEB.md.
 *
 * SSR-safe (web en mode `single` : pas de prerender) — `useWindowDimensions`
 * recalcule au redimensionnement, donc le layout suit le resize en direct.
 */
export type Breakpoint = 'phone' | 'tablet' | 'desktop';

const TABLET_MIN = 600;
const DESKTOP_MIN = 1024;
const DESKTOP_WIDE_MIN = 1440;

export type Responsive = {
  width: number;
  breakpoint: Breakpoint;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  /** Nb de colonnes recommandé pour une grille de cartes : 2 / 3 / 4 / 5. */
  gridColumns: number;
};

export function useResponsive(): Responsive {
  const { width } = useWindowDimensions();

  const isDesktop = width >= DESKTOP_MIN;
  const isTablet = width >= TABLET_MIN && width < DESKTOP_MIN;
  const isPhone = width < TABLET_MIN;
  const breakpoint: Breakpoint = isDesktop ? 'desktop' : isTablet ? 'tablet' : 'phone';

  const gridColumns = width >= DESKTOP_WIDE_MIN ? 5 : isDesktop ? 4 : isTablet ? 3 : 2;

  return { width, breakpoint, isPhone, isTablet, isDesktop, gridColumns };
}
