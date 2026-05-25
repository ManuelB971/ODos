/**
 * Encode geohash (base32) — aligné sur le backend (précision 6 par défaut).
 */

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export function encodeGeohash(latitude: number, longitude: number, precision = 6): string {
  let latInterval: [number, number] = [-90, 90];
  let lngInterval: [number, number] = [-180, 180];
  let hash = '';
  let bit = 0;
  let ch = 0;
  let even = true;

  while (hash.length < precision) {
    if (even) {
      const mid = (lngInterval[0] + lngInterval[1]) / 2;
      if (longitude > mid) {
        ch |= 1 << (4 - bit);
        lngInterval[0] = mid;
      } else {
        lngInterval[1] = mid;
      }
    } else {
      const mid = (latInterval[0] + latInterval[1]) / 2;
      if (latitude > mid) {
        ch |= 1 << (4 - bit);
        latInterval[0] = mid;
      } else {
        latInterval[1] = mid;
      }
    }
    even = !even;
    if (bit < 4) {
      bit += 1;
    } else {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return hash;
}

export function decodeGeohashBounds(hash: string): {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
} {
  let latInterval: [number, number] = [-90, 90];
  let lngInterval: [number, number] = [-180, 180];
  let even = true;

  for (const char of hash) {
    const pos = BASE32.indexOf(char);
    if (pos < 0) continue;
    for (let bit = 4; bit >= 0; bit -= 1) {
      const mask = 1 << bit;
      if (even) {
        if (pos & mask) {
          lngInterval[0] = (lngInterval[0] + lngInterval[1]) / 2;
        } else {
          lngInterval[1] = (lngInterval[0] + lngInterval[1]) / 2;
        }
      } else {
        if (pos & mask) {
          latInterval[0] = (latInterval[0] + latInterval[1]) / 2;
        } else {
          latInterval[1] = (latInterval[0] + latInterval[1]) / 2;
        }
      }
      even = !even;
    }
  }

  return {
    minLat: latInterval[0],
    minLng: lngInterval[0],
    maxLat: latInterval[1],
    maxLng: lngInterval[1],
  };
}
