import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { fetchCities } from '@/scripts/api';
import type { CityCatalogEntry } from '@/types';

export function useCitiesQuery(enabled = true) {
  return useQuery<CityCatalogEntry[]>({
    queryKey: ['cities'],
    queryFn: fetchCities,
    enabled,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    retry: 2,
  });
}
