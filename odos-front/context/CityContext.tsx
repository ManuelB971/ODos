import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { useCitiesQuery } from '@/hooks/useCities';
import type { CityContextType, CityProviderProps } from '@/types';

export const CityContext = createContext<CityContextType>({
  cities: [],
  citiesLoading: false,
  citiesError: null,
  selectedCity: null,
  setSelectedCity: () => {},
  cityCentroid: () => null,
});

export function CityProvider({ children }: CityProviderProps) {
  const { user } = useAuth();
  const { data, isLoading, error } = useCitiesQuery(!!user);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const lastHydratedUserId = useRef<number | null>(null);

  const cities = data ?? [];

  useEffect(() => {
    if (!user) {
      setSelectedCity(null);
      lastHydratedUserId.current = null;
      return;
    }

    if (lastHydratedUserId.current !== user.id) {
      const home = user.homeCity?.trim();
      setSelectedCity(home || null);
      lastHydratedUserId.current = user.id;
    }
  }, [user]);

  const cityCentroid = useCallback(
    (name: string) => {
      const entry = cities.find((c) => c.name === name);
      if (!entry) return null;
      return { latitude: entry.latitude, longitude: entry.longitude };
    },
    [cities],
  );

  const value = useMemo<CityContextType>(
    () => ({
      cities,
      citiesLoading: isLoading,
      citiesError: error
        ? (error instanceof Error ? error.message : 'Impossible de charger les villes.')
        : null,
      selectedCity,
      setSelectedCity,
      cityCentroid,
    }),
    [cities, isLoading, error, selectedCity, cityCentroid],
  );

  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
}

export function useCity() {
  return useContext(CityContext);
}
