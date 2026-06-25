import { useQuery } from '@tanstack/react-query';
import api from '@/scripts/api';
import { BUNDLED_THEMES } from '@/constants/themes/registry';
import type { ThemeDefinition } from '@/constants/themes/types';

type ApiTheme = {
  slug: string;
  label: string;
  description?: string | null;
  light?: unknown;
  dark?: unknown;
};

const PALETTE_KEYS = [
  'text',
  'background',
  'tint',
  'icon',
  'tabIconDefault',
  'tabIconSelected',
  'primary',
  'accent',
  'accentHover',
  'accentSoft',
  'turquoise',
  'surface',
  'elevated',
  'border',
  'muted',
  'danger',
  'mapPrimaryCta',
  'mapSecondary',
  'mapAccent',
  'overlay',
  'onAccent',
  'successSurface',
  'successText',
  'errorSurface',
] as const;

function isPalette(value: unknown): value is ThemeDefinition['light'] {
  if (!value || typeof value !== 'object') return false;
  const rec = value as Record<string, unknown>;
  return PALETTE_KEYS.every((key) => typeof rec[key] === 'string' && rec[key].trim().length > 0);
}

function toThemeDefinition(theme: ApiTheme): ThemeDefinition | null {
  if (isPalette(theme.light) && isPalette(theme.dark)) {
    return {
      id: theme.slug,
      label: theme.label,
      light: theme.light,
      dark: theme.dark,
    };
  }

  return BUNDLED_THEMES[theme.slug] ?? null;
}

async function fetchApiThemes(): Promise<ApiTheme[]> {
  const response = await api.get('/api/themes');
  const data = response.data as Record<string, unknown>;
  const member = data['hydra:member'] ?? data;
  return Array.isArray(member) ? (member as ApiTheme[]) : [];
}

/** Thème tel qu'affiché dans le picker : données API + palette bundlée si disponible. */
export type AvailableTheme = {
  slug: string;
  label: string;
  description?: string | null;
  definition: ThemeDefinition;
};

/**
 * Retourne les thèmes actifs côté backend (GET /api/themes).
 * - Si l'API fournit `light` + `dark`, la palette est 100% dynamique.
 * - Sinon fallback sur la palette bundlée locale du même slug.
 * - En cas d'erreur réseau, fallback intégral sur les palettes bundlées.
 */
export function useAvailableThemes() {
  return useQuery<AvailableTheme[]>({
    queryKey: ['available-themes'],
    queryFn: async () => {
      const apiThemes = await fetchApiThemes();
      return apiThemes
        .map((t) => {
          const definition = toThemeDefinition(t);
          if (!definition) return null;
          return {
            slug: t.slug,
            label: t.label,
            description: t.description,
            definition: {
              ...definition,
              // Le backend pilote le label affiché, même si la palette vient du bundle.
              label: t.label,
            },
          };
        })
        .filter((t): t is AvailableTheme => t !== null);
    },
    staleTime: 1000 * 60 * 60,
    retry: 1,
    placeholderData: Object.values(BUNDLED_THEMES).map((def) => ({
      slug: def.id,
      label: def.label,
      description: null,
      definition: def,
    })),
  });
}
