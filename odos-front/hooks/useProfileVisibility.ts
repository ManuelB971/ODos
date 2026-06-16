import { useMutation } from '@tanstack/react-query';

import { useAuth } from '@/context/AuthContext';
import { updateProfile } from '@/scripts/api';
import { logError } from '@/utils/errorHandling';

/**
 * Pilote la visibilité publique du profil (`profilePublic`).
 *
 * Source unique de vérité pour le toggle « profil public/privé », partagée entre
 * l'écran Paramètres (section Confidentialité) et la bannière de découvrabilité
 * de l'onglet Amis. Met à jour le `user` du contexte de façon optimiste pour que
 * toute l'UI (recherche, bannière) reflète l'état immédiatement.
 *
 * Rappel produit : un profil privé n'apparaît plus dans la recherche par alias
 * et ne peut donc plus recevoir de demandes d'ami.
 */
export function useProfileVisibility() {
  const { user, setUser } = useAuth();
  const isPublic = user?.profilePublic ?? true;

  const mutation = useMutation({
    mutationFn: (next: boolean) => {
      if (!user?.id) {
        return Promise.reject(new Error('Utilisateur non authentifié.'));
      }
      return updateProfile(user.id, { profilePublic: next });
    },
    onSuccess: (_void, next) => {
      if (user) setUser({ ...user, profilePublic: next });
    },
    onError: (err) => logError('useProfileVisibility.setPublic', err),
  });

  return {
    isPublic,
    isPending: mutation.isPending,
    setPublic: (next: boolean) => mutation.mutate(next),
  };
}
