import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addParcoursItem,
  createParcours,
  deleteParcours,
  fetchParcours,
  fetchParcoursDetail,
  removeParcoursItem,
  reorderParcoursItems,
  updateParcours,
} from '@/scripts/api';
import { useAuth } from '@/context/AuthContext';
import { logError } from '@/utils/errorHandling';
import type { ParcoursDetail } from '@/types';

export const PARCOURS_LIST_KEY = ['parcours'] as const;

function detailKey(id: number) {
  return ['parcours', id] as const;
}

/**
 * Liste des parcours de l'utilisateur (les siens + ceux où il collabore).
 * Fonctionnalité personnelle : ne requiert pas le consentement social (seul le
 * partage dans une conversation l'exige, côté chat).
 */
export function useParcoursList() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: PARCOURS_LIST_KEY,
    queryFn: fetchParcours,
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

/** Détail d'un parcours (étapes ordonnées + collaborateurs). */
export function useParcoursDetail(id: number) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: detailKey(id),
    queryFn: () => fetchParcoursDetail(id),
    enabled: isAuthenticated && id > 0,
    staleTime: 5_000,
  });
}

/**
 * Mutations d'écriture des parcours. Le détail renvoyé par l'API après chaque
 * écriture est réinjecté dans le cache (source de vérité), ce qui évite des
 * re-fetch et garde l'édition collaborative cohérente.
 */
export function useParcoursMutations(id?: number) {
  const queryClient = useQueryClient();

  const writeDetail = (detail: ParcoursDetail) => {
    queryClient.setQueryData(detailKey(detail.id), { parcours: detail });
    queryClient.invalidateQueries({ queryKey: PARCOURS_LIST_KEY });
  };

  const create = useMutation({
    mutationFn: createParcours,
    onSuccess: ({ parcours }) => writeDetail(parcours),
    onError: (err) => logError('useParcours.create', err),
  });

  const rename = useMutation({
    mutationFn: ({ parcoursId, title, description }: { parcoursId: number; title?: string; description?: string }) =>
      updateParcours(parcoursId, { title, description }),
    onSuccess: ({ parcours }) => writeDetail(parcours),
    onError: (err) => logError('useParcours.rename', err),
  });

  const addItem = useMutation({
    mutationFn: ({ parcoursId, activityId, note }: { parcoursId: number; activityId: number; note?: string }) =>
      addParcoursItem(parcoursId, activityId, note),
    onSuccess: ({ parcours }) => writeDetail(parcours),
    onError: (err) => logError('useParcours.addItem', err),
  });

  const removeItem = useMutation({
    mutationFn: ({ parcoursId, itemId }: { parcoursId: number; itemId: number }) =>
      removeParcoursItem(parcoursId, itemId),
    onSuccess: ({ parcours }) => writeDetail(parcours),
    onError: (err) => logError('useParcours.removeItem', err),
  });

  const reorder = useMutation({
    mutationFn: ({ parcoursId, order }: { parcoursId: number; order: number[] }) =>
      reorderParcoursItems(parcoursId, order),
    // Optimiste : on réordonne le cache immédiatement (drag réactif, lens Emil).
    onMutate: async ({ parcoursId, order }) => {
      const key = detailKey(parcoursId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<{ parcours: ParcoursDetail }>(key);
      if (previous) {
        const byId = new Map(previous.parcours.items.map((it) => [it.id, it]));
        const reordered = order
          .map((itemId) => byId.get(itemId))
          .filter((it): it is NonNullable<typeof it> => Boolean(it))
          .map((it, idx) => ({ ...it, position: idx }));
        queryClient.setQueryData(key, {
          parcours: { ...previous.parcours, items: reordered },
        });
      }
      return { previous, key };
    },
    onError: (err, _vars, ctx) => {
      logError('useParcours.reorder', err);
      if (ctx?.previous) queryClient.setQueryData(ctx.key, ctx.previous);
    },
    onSuccess: ({ parcours }) => writeDetail(parcours),
  });

  const remove = useMutation({
    mutationFn: (parcoursId: number) => deleteParcours(parcoursId),
    onSuccess: (_void, parcoursId) => {
      queryClient.removeQueries({ queryKey: detailKey(parcoursId) });
      queryClient.invalidateQueries({ queryKey: PARCOURS_LIST_KEY });
    },
    onError: (err) => logError('useParcours.remove', err),
  });

  return { create, rename, addItem, removeItem, reorder, remove, parcoursId: id };
}
