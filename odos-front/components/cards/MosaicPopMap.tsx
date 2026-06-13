import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Defs, Line, Path, Pattern, Rect } from 'react-native-svg';

import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';

/**
 * Aperçu carte « Mosaïque pop » — pendant statique de la carte MapLibre live.
 *
 * Sur l'écran d'accueil, le rendu MapLibre natif est remplacé par ce visuel
 * lorsqu'on active la direction « Mosaïque pop » : la carte vectorielle générique
 * jurait avec la DA (et faisait planter la home en se superposant aux nombreux
 * calques SVG / ombres dures des cartes). On reproduit ici la « carte stylisée »
 * du design : parchemin, quartiers hachurés (terre terracotta, eau teal, parc
 * olive), routes en encre, pins pop, badge « N lieux » et CTA « Explorer ».
 *
 * Couleurs issues du thème actif : encre = `text`, papier = `elevated`,
 * terracotta = `accent`, teal = `turquoise`, bleu = `mapSecondary` ; l'olive est
 * un token DA fixe (#6E7B4F), comme dans le design.
 */

const OUTLINE = 2.5;
const RADIUS = 10;
const CARD_SHADOW = 7;
const BADGE_SHADOW = 2;
const OLIVE = '#6E7B4F';
const MAP_HEIGHT = 210;

function usePatternId(prefix: string): string {
  // useId() renvoie des « : » invalides dans un id SVG / une url(#id) → on les retire.
  return `${prefix}-${React.useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

/**
 * Mesure la taille réelle du conteneur via onLayout. On NE passe JAMAIS `100%`
 * comme width/height à `<Svg>` : sous la New Architecture (Fabric), un SVG en
 * dimensions `%` peut se mesurer à une taille démesurée et tenter d'allouer un
 * bitmap de plusieurs centaines de Mo → `Canvas: trying to draw too large bitmap`
 * → crash. En pixels mesurés, le bitmap reste borné à la taille affichée.
 */
function useMeasuredSize() {
  const [size, setSize] = React.useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const onLayout = React.useCallback((e: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev.w === width && prev.h === height ? prev : { w: width, h: height }));
  }, []);
  return { size, onLayout };
}

/** Hachures diagonales (45°) d'une couleur sur fond transparent — évoque la mosaïque. */
function Hatch({ color }: { color: string }) {
  const id = usePatternId('htch');
  const { size, onLayout } = useMeasuredSize();
  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="none">
      {size.w > 0 && size.h > 0 ? (
        <Svg width={size.w} height={size.h}>
          <Defs>
            <Pattern id={id} width={8} height={8} patternUnits="userSpaceOnUse">
              {/* Trait diagonal couvrant les coins de la tuile → hachure continue. */}
              <Line x1={-2} y1={10} x2={10} y2={-2} stroke={color} strokeWidth={3} />
            </Pattern>
          </Defs>
          <Rect width={size.w} height={size.h} fill={`url(#${id})`} />
        </Svg>
      ) : null}
    </View>
  );
}

/** Grille parchemin discrète (33% du fond), comme `.home-map::before`. */
function FaintGrid({ ink }: { ink: string }) {
  const id = usePatternId('grid');
  const { size, onLayout } = useMeasuredSize();
  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="none">
      {size.w > 0 && size.h > 0 ? (
        <Svg width={size.w} height={size.h}>
          <Defs>
            <Pattern id={id} width={34} height={34} patternUnits="userSpaceOnUse">
              <Path d="M0 0 H34 M0 0 V34" stroke={ink} strokeWidth={1.5} strokeOpacity={0.07} fill="none" />
            </Pattern>
          </Defs>
          <Rect width={size.w} height={size.h} fill={`url(#${id})`} />
        </Svg>
      ) : null}
    </View>
  );
}

/** Quartier hachuré cerclé d'encre (terre / eau / parc). */
function District({
  color,
  ink,
  borderRadius,
  style,
}: {
  color: string;
  ink: string;
  borderRadius: ViewStyle['borderRadius'];
  style: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.zone, { borderColor: ink, borderRadius }, style]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: color, opacity: 0.18 }]} />
      <Hatch color={color} />
    </View>
  );
}

/** Route en encre franche + ligne médiane pointillée (papier). */
function Road({
  ink,
  paper,
  vertical,
  style,
}: {
  ink: string;
  paper: string;
  vertical?: boolean;
  style: StyleProp<ViewStyle>;
}) {
  const { size, onLayout } = useMeasuredSize();
  return (
    <View style={[styles.road, { backgroundColor: ink }, style]} onLayout={onLayout}>
      {size.w > 0 && size.h > 0 ? (
        <Svg style={StyleSheet.absoluteFill} width={size.w} height={size.h}>
          <Line
            x1={vertical ? size.w / 2 : 0}
            y1={vertical ? 0 : size.h / 2}
            x2={vertical ? size.w / 2 : size.w}
            y2={vertical ? size.h : size.h / 2}
            stroke={paper}
            strokeWidth={1.6}
            strokeDasharray="5 6"
            strokeOpacity={0.55}
          />
        </Svg>
      ) : null}
    </View>
  );
}

/** Pin pop : goutte cerclée d'encre + point papier au centre. */
function Pin({
  color,
  ink,
  paper,
  style,
}: {
  color: string;
  ink: string;
  paper: string;
  style: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.pin, { backgroundColor: color, borderColor: ink }, style]}>
      <View style={[styles.pinDot, { backgroundColor: paper, borderColor: ink }]} />
    </View>
  );
}

/** Glyphe « carte pliée » (CTA). */
function MapGlyph({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z M9 4v14 M15 6v14"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function MosaicPopMap({
  count,
  onPress,
}: {
  /** Nombre de lieux géolocalisés affiché dans le badge. */
  count: number;
  onPress: () => void;
}) {
  const colors = useOdosColors();
  const ink = colors.text;
  const paper = colors.elevated;
  const orange = colors.accent;
  const teal = colors.turquoise;
  const blue = colors.mapSecondary;

  return (
    <Pressable
      onPress={onPress}
      style={styles.wrap}
      accessibilityRole="button"
      accessibilityLabel="Ouvrir la carte immersive"
    >
      {/* Ombre dure décalée (rendu net cross-platform). */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: ink, borderRadius: RADIUS, transform: [{ translateX: CARD_SHADOW }, { translateY: CARD_SHADOW }] },
        ]}
      />

      <View style={[styles.map, { backgroundColor: paper, borderColor: ink }]}>
        <FaintGrid ink={ink} />

        {/* Quartiers hachurés */}
        <District color={teal} ink={ink} borderRadius={0} style={styles.zoneWater} />
        <District color={orange} ink={ink} borderRadius={0} style={styles.zoneLand} />
        <District color={OLIVE} ink={ink} borderRadius={0} style={styles.zoneOlive} />

        {/* Routes en encre */}
        <Road ink={ink} paper={paper} style={styles.roadA} />
        <Road ink={ink} paper={paper} vertical style={styles.roadB} />

        {/* Pins pop */}
        <Pin color={orange} ink={ink} paper={paper} style={styles.pinA} />
        <Pin color={teal} ink={ink} paper={paper} style={styles.pinB} />
        <Pin color={blue} ink={ink} paper={paper} style={styles.pinC} />

        {/* Badge « N lieux » */}
        <View style={styles.badgeWrap} pointerEvents="none">
          <View style={[StyleSheet.absoluteFill, styles.hardShadow, { backgroundColor: ink }]} />
          <View style={[styles.badge, { backgroundColor: paper, borderColor: ink }]}>
            <Text style={[styles.badgeText, { color: ink }]}>
              {count} lieu{count > 1 ? 'x' : ''}
            </Text>
          </View>
        </View>

        {/* CTA « Explorer la carte » */}
        <View style={styles.ctaWrap} pointerEvents="none">
          <View style={[StyleSheet.absoluteFill, styles.hardShadow, { backgroundColor: ink }]} />
          <View style={[styles.cta, { backgroundColor: orange, borderColor: ink }]}>
            <MapGlyph color={ink} />
            <Text style={[styles.ctaText, { color: ink }]}>Explorer la carte</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: CARD_SHADOW + 2,
  },
  map: {
    height: MAP_HEIGHT,
    borderWidth: OUTLINE,
    borderRadius: RADIUS,
    overflow: 'hidden',
    position: 'relative',
  },

  // ---- districts ----
  zone: {
    position: 'absolute',
    borderWidth: 2,
    overflow: 'hidden',
  },
  zoneWater: {
    right: -14,
    top: -14,
    width: 150,
    height: 120,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 30,
    borderBottomLeftRadius: 14,
  },
  zoneLand: {
    left: 18,
    top: 30,
    width: 130,
    height: 96,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 30,
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 26,
  },
  zoneOlive: {
    left: 70,
    bottom: -16,
    width: 130,
    height: 90,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 24,
    borderBottomLeftRadius: 16,
  },

  // ---- roads ----
  road: {
    position: 'absolute',
    borderRadius: 100,
    overflow: 'hidden',
  },
  roadA: {
    left: '8%',
    top: '24%',
    width: '74%',
    height: 6,
    transform: [{ rotate: '7deg' }],
  },
  roadB: {
    left: '46%',
    top: '6%',
    width: 6,
    height: '82%',
    transform: [{ rotate: '5deg' }],
  },

  // ---- pins ----
  pin: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderWidth: 2.5,
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
    borderBottomLeftRadius: 11,
    borderBottomRightRadius: 0,
    transform: [{ rotate: '-45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDot: {
    width: 8,
    height: 8,
    borderWidth: 1.5,
    borderRadius: 4,
  },
  pinA: { left: '26%', top: '34%' },
  pinB: { left: '64%', top: '30%' },
  pinC: { left: '44%', top: '62%' },

  // ---- badge / cta shared hard shadow ----
  hardShadow: {
    borderRadius: 100,
    transform: [{ translateX: BADGE_SHADOW }, { translateY: BADGE_SHADOW }],
  },

  badgeWrap: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  badge: {
    borderWidth: 2.5,
    borderRadius: 100,
    paddingHorizontal: 13,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: FontFamily.uiBold,
    letterSpacing: 0.2,
  },

  ctaWrap: {
    position: 'absolute',
    right: 12,
    bottom: 12,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2.5,
    borderRadius: 100,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  ctaText: {
    fontSize: 13,
    fontFamily: FontFamily.uiBold,
    letterSpacing: 0.1,
  },
});
