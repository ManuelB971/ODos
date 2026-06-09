import React from 'react';
import Svg, { Ellipse, G, Path } from 'react-native-svg';

import { useOdosColors } from '@/context/ThemeContext';

type AppLogoProps = {
  width?: number;
  height?: number;
  /** Couleur de la silhouette « O » (ellipse). Défaut : accent du thème. */
  tint?: string;
  /** Couleur du tracé intérieur + contour. Défaut : `onAccent` (blanc). */
  mark?: string;
};

/**
 * Logo ODOS en vecteur (react-native-svg) — recolorable selon le thème.
 *
 * Les deux teintes sont pilotables :
 * - `tint` peint l’ellipse (la « voie » stylisée), par défaut l’orange de marque ;
 * - `mark` peint le tracé/contour qui se superpose à l’ellipse, par défaut blanc.
 *
 * Le `mark` reposant toujours sur le `tint`, le logo garde son contraste quel
 * que soit le fond de l’écran (clair, sombre, accentué).
 */
export function AppLogo({ width = 80, height = 80, tint, mark }: AppLogoProps) {
  const colors = useOdosColors();
  const fillTint = tint ?? colors.accent;
  const fillMark = mark ?? colors.onAccent;

  return (
    <Svg width={width} height={height} viewBox="0 0 43.541882 42.715054">
      <G transform="translate(-96.824137,-110.80639)">
        <G transform="translate(-27.810323,-20.679471)">
          <G transform="matrix(0.30416282,0,0,0.35968708,-68.809075,117.47738)">
            <Ellipse
              fill={fillTint}
              stroke={fillMark}
              strokeWidth={1.00072}
              strokeLinecap="round"
              strokeLinejoin="round"
              cx={707.56342}
              cy={98.324364}
              rx={71.076241}
              ry={58.877708}
            />
            <Path
              fill={fillMark}
              d="m 690.55891,83.537428 c -1.80113,27.925882 -39.79587,20.889682 -37.44565,51.505552 0.0395,0.52676 0.50026,1.03951 1.02806,1.1433 -6.91055,0.32578 95.42157,13.76468 97.43809,7.99714 l 7.65797,-85.111147 c -0.0418,-0.526791 -8.65878,-0.994364 -9.18659,-1.098343 z m 61.47305,60.921042 -82.08179,-95.675807 25.41494,3.302732 61.41924,9.647079 -6.94053,81.585746 -94.89795,-8.84552 -0.94493,-53.583046 -0.23517,-22.628892 z"
            />
          </G>
        </G>
      </G>
    </Svg>
  );
}
