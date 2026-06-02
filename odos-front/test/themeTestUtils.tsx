import React from 'react';

import { legacyColors } from '@/constants/themes/palettes/default';
import type { ColorScheme, ThemePreference, ThemeVariantId } from '@/constants/themes/types';

const light = legacyColors.light;

export const themeTestMock = {
  variantId: 'default' as ThemeVariantId,
  setVariantId: jest.fn(),
  preference: 'light' as ThemePreference,
  setPreference: jest.fn(),
  colorScheme: 'light' as ColorScheme,
  colors: light,
  isDark: false,
};
