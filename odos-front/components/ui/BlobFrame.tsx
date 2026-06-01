import React from 'react';
import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

const BLOB_PRESETS: readonly [number, number, number, number][] = [
  [0.62, 0.38, 0.58, 0.42],
  [0.58, 0.42, 0.55, 0.45],
  [0.48, 0.52, 0.44, 0.56],
  [0.52, 0.48, 0.62, 0.38],
] as const;

const ROTATIONS = [-4, 3, -2, 5] as const;

export function blobBorderRadius(size: number, seed = 0): ViewStyle {
  const preset = BLOB_PRESETS[Math.abs(seed) % BLOB_PRESETS.length];
  return {
    borderTopLeftRadius: size * preset[0],
    borderTopRightRadius: size * preset[1],
    borderBottomRightRadius: size * preset[2],
    borderBottomLeftRadius: size * preset[3],
  };
}

export type BlobFrameProps = ViewProps & {
  size: number;
  seed?: number;
  backgroundColor?: string;
  children?: React.ReactNode;
};

export function BlobFrame({
  size,
  seed = 0,
  backgroundColor,
  style,
  children,
  ...rest
}: BlobFrameProps) {
  const rotation = ROTATIONS[Math.abs(seed) % ROTATIONS.length];

  return (
    <View
      style={[
        styles.base,
        { width: size, height: size, backgroundColor },
        blobBorderRadius(size, seed),
        { transform: [{ rotate: `${rotation}deg` }] },
        style,
      ]}
      {...rest}
    >
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  inner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
