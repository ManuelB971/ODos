import React from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { router } from 'expo-router';

type UserLinkProps = {
  /** Identifiant de l'utilisateur cible. Si absent, le lien est inerte. */
  userId?: number | null;
  /** Nom affiché, utilisé pour le libellé d'accessibilité. */
  name?: string | null;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Style appliqué pendant l'appui (feedback). */
  pressedStyle?: StyleProp<ViewStyle>;
};

/**
 * Enveloppe cliquable redirigeant vers la fiche profil publique d'un
 * utilisateur (`/profile/{id}`). Utilisée partout où un nom/avatar d'utilisateur
 * est affiché (chat, groupes, membres, forum, partages…). Inerte si `userId`
 * est absent (auteur anonyme / supprimé).
 */
export function UserLink({ userId, name, children, style, pressedStyle }: UserLinkProps) {
  if (!userId) {
    return <>{children}</>;
  }

  return (
    <Pressable
      onPress={() => router.push(`/profile/${userId}`)}
      accessibilityRole="button"
      accessibilityLabel={`Voir le profil de ${name ?? 'cet utilisateur'}`}
      hitSlop={6}
      style={({ pressed }) => [style, pressed && (pressedStyle ?? { opacity: 0.6 })]}
    >
      {children}
    </Pressable>
  );
}
