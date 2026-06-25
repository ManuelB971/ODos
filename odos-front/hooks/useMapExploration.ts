import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';

import { useAuth } from '@/context/AuthContext';
import { useBadgeUnlock } from '@/context/BadgeUnlockContext';
import {
  fetchMapExploration,
  postMapExplorationConsent,
  safeStorage,
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
/** Taille de lot alignée sur le cap serveur (MapExplorationService::MAX_SYNC_CELLS). */
const SYNC_CHUNK_SIZE = 40;
/** Préfixe de la file de cellules non synchronisées (scopée par utilisateur). */
const PENDING_STORAGE_PREFIX = 'map_exploration_pending:';

export function useMapExploration(screenActive: boolean) {
  const { isAuthenticated, user } = useAuth();
  const { mergeUnlocked } = useBadgeUnlock();
  const queryClient = useQueryClient();
  const lastSyncAt = useRef(0);
  const pendingCells = useRef<Set<string>>(new Set());
  /** Empêche deux flush concurrents (timer, seuil de taille, teardown, AppState). */
  const syncInFlight = useRef(false);

  const pendingKey = useMemo(
    () => `${PENDING_STORAGE_PREFIX}${user?.id ?? 'anon'}`,
    [user?.id]
  );

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

  /** Persiste la file (vide → suppression) pour survivre à un kill de l'app. */
  const persistPending = useCallback(async () => {
    const arr = Array.from(pendingCells.current);
    try {
      if (arr.length === 0) {
        await safeStorage.deleteItem(pendingKey);
      } else {
        await safeStorage.setItem(pendingKey, JSON.stringify(arr));
      }
    } catch {
      // stockage indisponible : on garde au moins la file en mémoire.
    }
  }, [pendingKey]);

  /**
   * Vide la file vers le serveur, par lots de SYNC_CHUNK_SIZE.
   *
   * Invariants anti-perte :
   *  - on ne retire une cellule de la file qu'APRÈS l'ACK serveur du lot ;
   *  - en cas d'échec (réseau), les cellules non confirmées restent en file et
   *    seront rejouées (l'écriture serveur est idempotente) ;
   *  - `force` ignore le throttle (seuil de taille, teardown, arrière-plan).
   */
  const flushCells = useCallback(
    async (force = false) => {
      if (!query.data?.active || pendingCells.current.size === 0) return;
      if (syncInFlight.current) return;
      if (!force && Date.now() - lastSyncAt.current < SYNC_MIN_INTERVAL_MS) return;

      syncInFlight.current = true;
      lastSyncAt.current = Date.now();
      try {
        const snapshot = Array.from(pendingCells.current);
        for (let i = 0; i < snapshot.length; i += SYNC_CHUNK_SIZE) {
          const chunk = snapshot.slice(i, i + SYNC_CHUNK_SIZE);
          await syncMutation.mutateAsync(chunk);
          for (const cell of chunk) pendingCells.current.delete(cell);
          await persistPending();
        }
      } catch {
        // Lot non confirmé conservé en file → rejoué au prochain flush.
        await persistPending();
      } finally {
        syncInFlight.current = false;
      }
    },
    [query.data?.active, syncMutation, persistPending]
  );

  /** Réf vers le dernier flush, pour les déclencheurs hors cycle de rendu. */
  const flushRef = useRef(flushCells);
  flushRef.current = flushCells;

  const queueCell = useCallback(
    (latitude: number, longitude: number) => {
      if (!query.data?.active) return;
      pendingCells.current.add(encodeGeohash(latitude, longitude, query.data.precision ?? 6));
      void persistPending();
      // Seuil de taille atteint : on flush sans attendre le throttle pour ne pas
      // accumuler (et ne pas heurter le cap serveur en localisation fine).
      void flushCells(pendingCells.current.size >= SYNC_CHUNK_SIZE);
    },
    [flushCells, persistPending, query.data?.active, query.data?.precision]
  );

  // Réhydrate la file persistée (scopée utilisateur) et tente un flush.
  useEffect(() => {
    let cancelled = false;
    pendingCells.current = new Set();
    (async () => {
      if (user?.id == null) return;
      try {
        const raw = await safeStorage.getItem(pendingKey);
        if (cancelled || !raw) return;
        const arr: unknown = JSON.parse(raw);
        if (Array.isArray(arr)) {
          for (const cell of arr) {
            if (typeof cell === 'string') pendingCells.current.add(cell);
          }
        }
      } catch {
        // file corrompue/illisible : on repart à vide.
      }
      if (!cancelled) void flushRef.current(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, pendingKey]);

  // Dès que l'exploration devient active, on rejoue ce qui attend.
  useEffect(() => {
    if (query.data?.active) void flushRef.current(true);
  }, [query.data?.active]);

  // Flush forcé quand l'app passe en arrière-plan (sortie probable de l'app).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        void flushRef.current(true);
      }
    });
    return () => sub.remove();
  }, []);

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
      // Quitter l'écran carte ne doit pas jeter la file accumulée depuis le
      // dernier sync : on force un dernier flush.
      void flushRef.current(true);
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
