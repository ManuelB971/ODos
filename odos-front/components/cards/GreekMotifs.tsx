import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, Pattern, Path, Rect } from 'react-native-svg';

/**
 * Motifs grecs ODOS pour la direction « Mosaïque pop ».
 * Construits en primitives géométriques → nets et recolorables selon le thème.
 */

function svgSafeId(prefix: string, raw: string): string {
  // useId() renvoie des « : » invalides dans un id SVG / une url(#id).
  return `${prefix}-${raw.replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

type MeanderProps = {
  /** Couleur du tracé (encre du thème). */
  color: string;
  /** Hauteur du bandeau (px). */
  height?: number;
  /** Épaisseur du trait. */
  thickness?: number;
};

/**
 * Bandeau « clé grecque » (méandre) tuilé sur toute la largeur du parent.
 * Le parent doit avoir une largeur définie (ex. un bandeau pleine largeur).
 */
export function Meander({ color, height = 13, thickness = 2.1 }: MeanderProps) {
  const s = height;
  const u = s / 16;
  const x = (n: number) => +(n * u).toFixed(2);
  // Une clé continue par tuile : entre à gauche et ressort à droite au même y → tuile.
  const d =
    `M0 ${x(13)} H${x(3)} V${x(3)} H${x(11)} V${x(10)} H${x(7)} V${x(7)} ` +
    `M${x(13)} ${x(3)} V${x(13)} H${x(16)}`;
  const id = svgSafeId('mdr', React.useId());
  return (
    <Svg width="100%" height={height}>
      <Defs>
        <Pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse">
          <Path
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </Pattern>
      </Defs>
      <Rect width="100%" height={height} fill={`url(#${id})`} />
    </Svg>
  );
}

type TesseraGridProps = {
  /** Couleur des joints (papier du thème). */
  color: string;
  /** Pas de la grille (px par tesselle). */
  size?: number;
  thickness?: number;
};

/**
 * Grille de joints de mosaïque, en `position: absolute` derrière la photo.
 * Posée sur un fond terracotta, elle évoque les tesselles serties autour de l'image.
 */
export function TesseraGrid({ color, size = 11, thickness = 1.4 }: TesseraGridProps) {
  const id = svgSafeId('tess', React.useId());
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse">
          <Path d={`M0 0 H${size} M0 0 V${size}`} stroke={color} strokeWidth={thickness} fill="none" />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
