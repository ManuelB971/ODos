import { useTheme } from '@/context/ThemeContext';
import type { ColorScheme } from '@/constants/themes/types';

/** Schéma effectif (préférence utilisateur + système), pas uniquement le réglage OS. */
export function useColorScheme(): ColorScheme {
  return useTheme().colorScheme;
}
