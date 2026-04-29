export { InterestContext, InterestProvider, useInterests } from './interestcontext';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

import { InterestContextType, InterestProviderProps } from '@/types';
import { useAuth } from '@/context/AuthContext';

/**
 * Contexte des centres d'intérêt de l'utilisateur courant.
 *
 * Principes :
 *  - La liste est **strictement liée à l'utilisateur connecté** (pas de
 *    persistance globale type AsyncStorage). Elle est hydratée à partir de
 *    `user.interests` (renvoyé par `/api/me`) et remise à zéro dès que
 *    l'utilisateur change (logout → login d'un autre compte).
 *  - `setInterests` reste disponible côté UI pour refléter immédiatement
 *    la sélection (avant l'aller-retour serveur dans `app/interests.tsx`).
 *
 * Ce design évite que les intérêts de l'utilisateur A "fuitent" sur la
 * session de l'utilisateur B, et évite aussi toute contamination du cache
 * React Query (voir `useRecommendations` qui intègre `user.id` dans sa clé).
 */
export const InterestContext = createContext<InterestContextType>({
  interests: [],
  setInterests: () => {},
});

export function InterestProvider({ children }: InterestProviderProps) {
  const { user } = useAuth();
  const [interests, setInterests] = useState<string[]>([]);
  const lastHydratedUserId = useRef<number | null>(null);

  useEffect(() => {
    // Cas 1 : déconnexion → on efface la liste pour éviter tout leak entre comptes.
    if (!user) {
      if (interests.length > 0) setInterests([]);
      lastHydratedUserId.current = null;
      return;
    }

    // Cas 2 : premier chargement OU changement d'utilisateur → on hydrate
    // à partir de la liste canonique renvoyée par le serveur.
    if (lastHydratedUserId.current !== user.id) {
      const names = (user.interests ?? [])
        .map((c) => c?.name)
        .filter((n): n is string => typeof n === 'string' && n.length > 0);
      setInterests(names);
      lastHydratedUserId.current = user.id;
    }
    // NB : on ne resynchronise PAS à chaque mutation de `user.interests` sinon
    // on écraserait la sélection locale en cours (avant l'enregistrement serveur).
    // La resynchro se fait au prochain logout/login.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <InterestContext.Provider value={{ interests, setInterests }}>
      {children}
    </InterestContext.Provider>
  );
}

export const useInterests = () => useContext(InterestContext);
