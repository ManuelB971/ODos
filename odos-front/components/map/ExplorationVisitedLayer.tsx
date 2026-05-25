import React from 'react';
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';

import { Colors } from '@/constants/theme';

type ExplorationVisitedLayerProps = {
  geoJson?: GeoJSON.FeatureCollection | null;
};

/** Cellules déjà visitées — calque semi-transparent sous les pins. */
export function ExplorationVisitedLayer({ geoJson }: ExplorationVisitedLayerProps) {
  if (!geoJson?.features?.length) return null;

  return (
    <GeoJSONSource id="odos-exploration-visited" data={geoJson}>
      <Layer
        id="odos-exploration-fill"
        type="fill"
        source="odos-exploration-visited"
        paint={{
          'fill-color': Colors.light.mapPrimaryCta,
          'fill-opacity': 0.22,
        }}
      />
      <Layer
        id="odos-exploration-outline"
        type="line"
        source="odos-exploration-visited"
        paint={{
          'line-color': Colors.light.mapPrimaryCta,
          'line-width': 1.5,
          'line-opacity': 0.45,
        }}
      />
    </GeoJSONSource>
  );
}
