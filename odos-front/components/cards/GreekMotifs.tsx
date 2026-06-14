import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Pattern, Path, Rect } from 'react-native-svg';

/**
 * Motifs grecs ODOS pour la direction « Mosaïque pop ».
 * Construits en primitives géométriques → nets et recolorables selon le thème.
 *
 * IMPORTANT : on ne passe JAMAIS `width="100%"`/`height="100%"` à `<Svg>`. Sous
 * la New Architecture (Fabric), un SVG en dimensions `%` se mesure à une taille
 * intrinsèque démesurée et tente d'allouer un bitmap de centaines de Mo
 * (`Canvas: trying to draw too large bitmap` → crash). On mesure donc le parent
 * via `onLayout` et on rend le SVG en pixels bornés.
 */

function svgSafeId(prefix: string, raw: string): string {
  // useId() renvoie des « : » invalides dans un id SVG / une url(#id).
  return `${prefix}-${raw.replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

/**
 * Plafond de sécurité : sous Fabric, `onLayout` sur une vue `absoluteFill` peut
 * renvoyer une taille démesurée à la première passe → bitmap SVG géant → crash
 * (`Canvas: trying to draw too large bitmap`). Les vrais motifs font ≤ ~400 px,
 * donc on borne sans jamais rogner du contenu réel.
 */
const SVG_MAX = 1200;

function useMeasuredSize() {
  const [size, setSize] = React.useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const onLayout = React.useCallback((e: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const w = Math.min(e.nativeEvent.layout.width, SVG_MAX);
    const h = Math.min(e.nativeEvent.layout.height, SVG_MAX);
    setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
  }, []);
  return { size, onLayout };
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
  const { size, onLayout } = useMeasuredSize();
  return (
    <View style={{ width: '100%', height }} onLayout={onLayout}>
      {size.w > 0 ? (
        <Svg width={size.w} height={height}>
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
          <Rect width={size.w} height={height} fill={`url(#${id})`} />
        </Svg>
      ) : null}
    </View>
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
  const { size: box, onLayout } = useMeasuredSize();
  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="none">
      {box.w > 0 && box.h > 0 ? (
        <Svg width={box.w} height={box.h}>
          <Defs>
            <Pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse">
              <Path d={`M0 0 H${size} M0 0 V${size}`} stroke={color} strokeWidth={thickness} fill="none" />
            </Pattern>
          </Defs>
          <Rect width={box.w} height={box.h} fill={`url(#${id})`} />
        </Svg>
      ) : null}
    </View>
  );
}
