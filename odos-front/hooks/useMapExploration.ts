import { useCallback, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';

import { useAuth } from '@/context/AuthContext';
import { useBadgeUnlock } from '@/context/BadgeUnlockContext';
import {
  fetchMapExploration,
  postMapExplorationConsent,
  syncMapExplorationCells,
} from '@/scripts/api';
import { encodeGeohash } from '@/utils/geohash';
import type { MapExplorationOverview } from '@/types';

export const MAP_EXPLORATION_QUERY_KEY = ['mapExploration'] as const;

/**
 * Conserve le `visitedGeoJson` précédent quand une réponse ne le renvoie pas.
 * Le calque "zones visitées" lit `overview.visitedGeoJson` ; or seules les
 * réponses GET (et désormais sync/consent) sérialisent la géométrie. Sans ce
 * garde-fou, écraser le cache avec un overview sans géométrie (ancien backend,
 * réponse partielle) fait disparaître le calque orange aussitôt après son
 * affichage — le symptôme « l'overlay clignote puis disparaît ».
 */
function withVisitedGeoJson(
  next: MapExplorationOverview,
  prev?: MapExplorationOverview
): MapExplorationOverview {
  if (!next.visitedGeoJson && prev?.visitedGeoJson) {
    return { ...next, visitedGeoJson: prev.visitedGeoJson };
  }
  return next;
}

const SYNC_MIN_INTERVAL_MS = 25_000;
const LOCATION_DISTANCE_M = 80;

export function useMapExploration(screenActive: boolean) {
  const { isAuthenticated, user } = useAuth();
  const { mergeUnlocked } = useBadgeUnlock();
  const queryClient = useQueryClient();
  const lastSyncAt = useRef(0);
  const pendingCells = useRef<Set<string>>(new Set());

  const query = useQuery<MapExplorationOverview>({
    queryKey: MAP_EXPLORATION_QUERY_KEY,
    queryFn: fetchMapExploration,
    enabled: isAuthenticated && screenActive && (user?.mapExplorationEnabled ?? false),
    staleTime: 60_000,
  });

  const consentMutation = useMutation({
    mutationFn: postMapExplorationConsent,
    onSuccess: (data) =>
      queryClient.setQueryData<MapExplorationOverview>(MAP_EXPLORATION_QUERY_KEY, (prev) =>
        withVisitedGeoJson(data, prev)
      ),
  });

  const syncMutation = useMutation({
    mutationFn: (cells: string[]) => syncMapExplorationCells(cells),
    onSuccess: (data) => {
      queryClient.setQueryData<MapExplorationOverview>(MAP_EXPLORATION_QUERY_KEY, (prev) =>
        withVisitedGeoJson(data.overview, prev)
      );
      if (data.unlockedBadges?.length) {
        mergeUnlocked(data.unlockedBadges);
      }
    },
  });

  const flushCells = useCallback(async () => {
    if (!query.data?.active || pendingCells.current.size === 0) return;
    const now = Date.now();
    if (now - lastSyncAt.current < SYNC_MIN_INTERVAL_MS) return;
    const batch = Array.from(pendingCells.current);
    pendingCells.current.clear();
    lastSyncAt.current = now;
    await syncMutation.mutateAsync(batch);
  }, [query.data?.consented, syncMutation]);

  const queueCell = useCallback(
    (latitude: number, longitude: number) => {
      if (!query.data?.active) return;
      pendingCells.current.add(encodeGeohash(latitude, longitude, query.data.precision ?? 6));
      void flushCells();
    },
    [flushCells, query.data?.active, query.data?.precision]
  );

  useEffect(() => {
    if (!screenActive || !isAuthenticated || !query.data?.active) return;

    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: LOCATION_DISTANCE_M,
          timeInterval: 30_000,
        },
        (loc) => {
          queueCell(loc.coords.latitude, loc.coords.longitude);
        }
      );
    })();

    return () => {
      subscription?.remove();
    };
  }, [screenActive, isAuthenticated, query.data?.active, queueCell]);

  return {
    overview: query.data,
    isLoading: query.isLoading,
    enabled: query.data?.enabled ?? user?.mapExplorationEnabled ?? false,
    active: query.data?.active ?? false,
    consented: query.data?.consented ?? false,
    percent: query.data?.active ? (query.data?.percent ?? 0) : 0,
    visitedGeoJson: query.data?.visitedGeoJson,
    giveConsent: consentMutation.mutateAsync,
    isConsentPending: consentMutation.isPending,
    isSyncing: syncMutation.isPending,
    refetch: query.refetch,
  };
}
