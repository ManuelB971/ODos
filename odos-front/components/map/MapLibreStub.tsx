/**
 * Implémentation factice de MapLibre pour Metro quand {@code MAPLIBRE_STUB=1}
 * (typiquement scan avec **Expo Go**, qui n’embarque pas les TurboModules natifs).
 * Pour la carte réelle : `pnpm android` / `expo run:android` ou un build EAS.
 */
import React, { forwardRef, useImperativeHandle } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewProps,
} from 'react-native';

export type CameraRef = {
  easeTo: (opts: unknown) => void;
  fitBounds: (bounds: unknown, opts?: unknown) => void;
  setCamera: (opts: unknown) => void;
};

const noop = () => {};

type MapProps = ViewProps & {
  children?: React.ReactNode;
  mapStyle?: string;
  pointerEvents?: ViewProps['pointerEvents'];
  attribution?: boolean;
  logo?: boolean;
  compass?: boolean;
  scaleBar?: boolean;
  dragPan?: boolean;
  touchZoom?: boolean;
  doubleTapZoom?: boolean;
  doubleTapHoldZoom?: boolean;
  touchRotate?: boolean;
  touchPitch?: boolean;
};

export const Map = forwardRef<View, MapProps>(function Map(
  { children, mapStyle: _m, attribution: _a, logo: _l, compass: _c, scaleBar: _s, ...rest },
  ref,
) {
  return (
    <View ref={ref} {...rest}>
      <View style={styles.stubBanner} pointerEvents="none">
        <Text style={styles.stubText}>
          Aperçu carte (Expo Go) — lancez « pnpm android » ou un build EAS pour MapLibre natif.
        </Text>
      </View>
      {children}
    </View>
  );
});

export const Camera = forwardRef<CameraRef, React.PropsWithChildren<Record<string, unknown>>>(
  function Camera(_props, ref) {
    useImperativeHandle(ref, () => ({
      easeTo: noop,
      fitBounds: noop,
      setCamera: noop,
    }));
    return null;
  },
);

type MarkerProps = ViewProps & {
  id?: string;
  lngLat: [number, number];
  anchor?: string;
  children?: React.ReactNode;
  onPress?: () => void;
};

export const Marker = forwardRef<View, MarkerProps>(function Marker(
  { children, onPress, id: _id, lngLat: _lngLat, anchor: _anchor, ...rest },
  ref,
) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} {...rest}>
        {children}
      </Pressable>
    );
  }
  return (
    <View ref={ref} {...rest}>
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  stubBanner: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e8eef5',
    paddingHorizontal: 12,
  },
  stubText: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
});
