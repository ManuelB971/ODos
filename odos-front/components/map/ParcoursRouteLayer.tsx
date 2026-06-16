import React, { useMemo } from 'react';
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';

import { useOdosColors } from '@/context/ThemeContext';

type ParcoursRouteLayerProps = {
  /** Points ordonnés du parcours, format `[longitude, latitude]`. */
  points: [number, number][];
};

/**
 * Trace l'itinéraire d'un parcours : une polyligne reliant les étapes dans
 * l'ordre (modèle « directions » Google Maps). Couche GL native, alignée au
 * pan/zoom, sur le modèle de {@link ActivityPinsLayer}. Les marqueurs numérotés
 * sont rendus à part via `<Marker>` dans l'écran.
 */
export function ParcoursRouteLayer({ points }: ParcoursRouteLayerProps) {
  const colors = useOdosColors();

  const geojson = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          geometry: { type: 'LineString' as const, coordinates: points },
          properties: {},
        },
      ],
    }),
    [points],
  );

  if (points.length < 2) return null;

  return (
    <GeoJSONSource id="odos-parcours-route" data={geojson}>
      <Layer
        id="odos-parcours-line"
        type="line"
        source="odos-parcours-route"
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        paint={{
          'line-color': colors.accent,
          'line-width': 4,
          'line-opacity': 0.85,
          'line-dasharray': [1.5, 1.2],
        }}
      />
    </GeoJSONSource>
  );
}
