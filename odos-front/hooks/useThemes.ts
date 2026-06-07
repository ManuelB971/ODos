import { useQuery } from '@tanstack/react-query';
import api from '@/scripts/api';
import { BUNDLED_THEMES } from '@/constants/themes/registry';
import type { ThemeDefinition } from '@/constants/themes/types';

type ApiTheme = {
  slug: string;
  label: string;
  description?: string | null;
};

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
 * Retourne la liste des thèmes activés par l'admin (GET /api/themes),
 * enrichie des palettes bundlées dans l'app.
 * Si le slug n'a pas de palette bundlée, le thème est ignoré.
 * En cas d'erreur réseau, utilise la liste complète des palettes bundlées.
 */
export function useAvailableThemes() {
  return useQuery<AvailableTheme[]>({
    queryKey: ['available-themes'],
    queryFn: async () => {
      const apiThemes = await fetchApiThemes();
      return apiThemes
        .filter((t) => !!BUNDLED_THEMES[t.slug])
        .map((t) => ({
          slug: t.slug,
          label: t.label,
          description: t.description,
          definition: BUNDLED_THEMES[t.slug],
        }));
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
