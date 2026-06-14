import { useMemo } from 'react';

import { useOdosColors, useTheme } from '@/context/ThemeContext';

/**
 * Fondations « Mosaïque pop » partagées par toute l'app.
 *
 * Le langage visuel (contour encre + ombre dure décalée + accents) vient du
 * handoff design (`greek.css`). Les couleurs sont dérivées du thème actif pour
 * rester cohérentes en clair comme en sombre ; seul l'olive est un token DA fixe
 * (greek.css `--olive`) absent de la palette de base.
 */

/** Olive/sauge DA — greek.css `--olive`. */
export const POP_OLIVE = '#6E7B4F';

/** Ossature pop — greek.css `--pop-outline` / `--pop-radius` / `--pop-shadow`. */
export const POP = {
  outline: 2.5,
  radius: 10,
  shadow: 6,
} as const;

export type PopTokens = {
  ink: string;
  paper: string;
  surface: string;
  muted: string;
  border: string;
  orange: string;
  terra: string;
  teal: string;
  olive: string;
  blue: string;
  onAccent: string;
  danger: string;
  background: string;
};

/** Jeton couleurs « mosaïque pop » dérivés du thème actif. */
export function usePopTokens(): PopTokens {
  const colors = useOdosColors();
  return useMemo(
    () => ({
      ink: colors.text,
      paper: colors.elevated,
      surface: colors.surface,
      muted: colors.muted,
      border: colors.border,
      orange: colors.accent,
      terra: colors.accentHover,
      teal: colors.turquoise,
      olive: POP_OLIVE,
      blue: colors.mapSecondary,
      onAccent: colors.onAccent,
      danger: colors.danger,
      background: colors.background,
    }),
    [colors],
  );
}

/**
 * `true` quand l'utilisateur a choisi la direction « Mosaïque pop » dans
 * Apparence. Sert de garde unique pour tout le re-skin global : chaque écran
 * fait `isMosaicPop ? <rendu pop> : <rendu classique>`.
 */
export function useIsMosaicPop(): boolean {
  return useTheme().cardStyle === 'mosaicPop';
}
