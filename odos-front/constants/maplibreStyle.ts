/**
 * Styles de carte MapLibre (vectoriel OSM ou dérivés — pas de Google Maps SDK).
 *
 * Personnaliser :
 * 1. Changer {@link ACTIVE_MAP_STYLE_PRESET} ou la constante utilisée ci-dessous.
 * 2. Héberger un JSON MapLibre (Maputnik, https://maplibre.org/maplibre-style-spec/) et mettre ton URL/CDN.
 * 3. `mapStyle={monStyleInline}` avec un objet importé depuis un fichier `.json`.
 *
 * Ces tuiles sont en usage courant MVP ; respecte toujours les conditions d'utilisation du fournisseur.
 */
import type { ColorScheme } from '@/constants/themes/types';

export type OdosMapStylePreset = 'liberty' | 'positron' | 'dark' | 'demotiles';

const PRESETS: Record<OdosMapStylePreset, string> = {
  /** OpenFreeMap Liberty — contraste naturel, bon défaut applicatif */
  liberty: 'https://tiles.openfreemap.org/styles/liberty',
  /** OpenFreeMap Positron — très clair, peu de bruit */
  positron: 'https://tiles.openfreemap.org/styles/positron',
  /**
   * OpenFreeMap Dark — thème sombre. Remplace CARTO Dark Matter, dont les basemaps
   * gratuites sont réservées à un usage non commercial (cf. docs/RGPD_AUDIT_2026.md) :
   * un seul fournisseur de tuiles pour les deux thèmes.
   */
  dark: 'https://tiles.openfreemap.org/styles/dark',
  /** Démo MapLibre (léger, utile pour debug) */
  demotiles: 'https://demotiles.maplibre.org/style.json',
};

/** Preset utilisé en mode clair (look global de l'app : home + /map). */
export const ACTIVE_MAP_STYLE_PRESET: OdosMapStylePreset = 'liberty';
/** Preset utilisé en mode sombre — bascule automatique selon le thème. */
export const ACTIVE_MAP_STYLE_PRESET_DARK: OdosMapStylePreset = 'dark';

/**
 * URL du style MapLibre à utiliser. Suit le mode d'affichage : fond clair en
 * `light`, fond sombre (`dark-matter`) en `dark`. Défaut `light` pour rester
 * compatible avec les appels sans argument.
 */
export function getOdosMaplibreStyleUrl(scheme: ColorScheme = 'light'): string {
  return PRESETS[scheme === 'dark' ? ACTIVE_MAP_STYLE_PRESET_DARK : ACTIVE_MAP_STYLE_PRESET];
}
