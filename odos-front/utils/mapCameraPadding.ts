/** Padding caméra MapLibre (px) — carte plein écran sans bottom sheet. */
export const MAP_CAMERA_PADDING = {
  top: 128,
  bottom: 96,
  left: 28,
  right: 28,
} as const;

/** Padding supplémentaire bas quand le callout activité est visible. */
export const MAP_CAMERA_PADDING_WITH_CALLOUT = {
  ...MAP_CAMERA_PADDING,
  bottom: 220,
} as const;
