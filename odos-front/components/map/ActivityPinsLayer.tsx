import React, { useMemo } from 'react';
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';

import { Colors } from '@/constants/theme';
import type { ApiActivity } from '@/types';

type ActivityPinsLayerProps = {
  activities: ApiActivity[];
  selectedId: number | null;
};

/**
 * Pins activités en couche GL native (reste alignée au pan/zoom de la carte).
 * Le pin sélectionné (label + animation) est rendu séparément via `<Marker>`.
 */
export function ActivityPinsLayer({ activities, selectedId }: ActivityPinsLayerProps) {
  const geojson = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: activities
        .filter((a) => a.id !== selectedId)
        .map((a) => ({
          type: 'Feature' as const,
          id: a.id,
          geometry: {
            type: 'Point' as const,
            coordinates: [a.longitude, a.latitude] as [number, number],
          },
          properties: { id: a.id },
        })),
    }),
    [activities, selectedId]
  );

  if (geojson.features.length === 0) return null;

  return (
    <GeoJSONSource id="odos-activity-pins" data={geojson}>
      <Layer
        id="odos-pins-circle"
        type="circle"
        source="odos-activity-pins"
        paint={{
          'circle-radius': 9,
          'circle-color': Colors.light.mapSecondary,
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#ffffff',
        }}
      />
    </GeoJSONSource>
  );
}
