/**
 * Conversions lat/lng + deltas (héritage react-native-maps) → caméra MapLibre.
 * Coordonnées MapLibre : [longitude, latitude].
 */

export type LatLngRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

/** Bounds GeoJSON : [west, south, east, north] */
export type LngLatBoundsTuple = [west: number, south: number, east: number, north: number];

export function lngDeltaToZoom(longitudeDelta: number): number {
  const d = Math.max(longitudeDelta, 0.0001);
  const z = Math.log2(360 / d);

  return Math.min(18, Math.max(2, z));
}

export function regionToBounds(region: LatLngRegion): LngLatBoundsTuple {
  const halfLon = region.longitudeDelta / 2;
  const halfLat = region.latitudeDelta / 2;

  return [
    region.longitude - halfLon,
    region.latitude - halfLat,
    region.longitude + halfLon,
    region.latitude + halfLat,
  ];
}

export function regionToInitialCamera(region: LatLngRegion): {
  center: [number, number];
  zoom: number;
} {
  return {
    center: [region.longitude, region.latitude],
    zoom: lngDeltaToZoom(region.longitudeDelta),
  };
}
