/**
 * Contrat de palette ODOS — extensible pour thèmes régionaux (ville / pays).
 */

export type OdosColorPalette = {
  text: string;
  background: string;
  tint: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
  primary: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
  turquoise: string;
  surface: string;
  elevated: string;
  border: string;
  muted: string;
  danger: string;
  mapPrimaryCta: string;
  mapSecondary: string;
  mapAccent: string;
  /** Fond glass / overlay carte (callouts, barres flottantes). */
  overlay: string;
  /** Texte sur fond accent (boutons orange). */
  onAccent: string;
  /** Bannières succès (formulaires, confirmations). */
  successSurface: string;
  successText: string;
  /** Bannières erreur légères (champs, alertes inline). */
  errorSurface: string;
};

export type ColorScheme = 'light' | 'dark';

/** Identifiant de variante visuelle (pays, ville, saison…). Extensible dynamiquement. */
export type ThemeVariantId = string;

export type ThemePreference = 'system' | ColorScheme;

export type ThemeDefinition = {
  id: ThemeVariantId;
  label: string;
  light: OdosColorPalette;
  dark: OdosColorPalette;
};
