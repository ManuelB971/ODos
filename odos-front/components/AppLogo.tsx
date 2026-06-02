import React from 'react';
import { Image } from 'expo-image';

type AppLogoProps = {
  width?: number;
  height?: number;
};

export function AppLogo({ width = 80, height = 80 }: AppLogoProps) {
  return (
    <Image
      source={require('@/assets/images/image.svg')}
      style={{ width, height }}
      contentFit="contain"
    />
  );
}

