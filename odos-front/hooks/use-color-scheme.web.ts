import { useEffect, useState } from 'react';

import { useTheme } from '@/context/ThemeContext';
import type { ColorScheme } from '@/constants/themes/types';

/**
 * Web : attend l’hydratation avant d’exposer le schéma (évite flash SSR).
 */
export function useColorScheme(): ColorScheme {
  const { colorScheme } = useTheme();
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  if (!hasHydrated) {
    return 'light';
  }

  return colorScheme;
}
