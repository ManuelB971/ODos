/**
 * Tailles recommandées pour les icônes illustrées DA.
 * Les SVG actuels (`docs/design/da-icons`) embarquent une image raster (base64) :
 * les couleurs ne sont pas modifiables en runtime. Pour des pictos tintables,
 * réexporter en tracés vectoriels purs (`<path>` sans `<image>`) puis importer
 * via `react-native-svg-transformer`.
 */
export const DA_ICON_SIZES = {
  badge: 16,
  chip: 18,
  inline: 20,
  input: 24,
  cta: 28,
  tab: 34,
  mapControl: 28,
  hero: 48,
  rating: 22,
  ratingPicker: 32,
} as const;

export type DaIconVariant = keyof typeof DA_ICON_SIZES;

/** Compense la marge transparente dans le viewBox 768×768 des SVG illustrés. */
export const DA_ICON_VISUAL_SCALE = 1.22;
