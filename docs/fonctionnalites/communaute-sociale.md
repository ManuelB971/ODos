# Communauté & social

Forum, amis, messages privés, groupes, chat de groupe, partage riche et blocage d’utilisateurs.

**Voir aussi :** [profil-parametres.md](profil-parametres.md) · [parcours.md](parcours.md) · [DESIGN_JAKOB_FLOWS.md](../DESIGN_JAKOB_FLOWS.md)

---

## Principe

1. L’onglet **Communauté** regroupe Forum, Amis, Messages et Groupes (Material Top Tabs).
2. Un **consentement social** (`POST /api/social/consent`) est requis avant d’utiliser ces fonctions ; horodaté `User.socialConsentedAt`.
3. La **découvrabilité** exige `profilePublic = true` + consentement ; recherche par alias via `UserSearchBar`.
4. Le **blocage** est directionnel : l’utilisateur bloqué ne voit plus le profil ; conversation supprimée ; collaborations parcours révoquées.

---

## Consentement & visibilité

| Réglage | Effet |
|---------|--------|
| Consentement Communauté | Débloque forum, amis, messages, groupes |
| Profil public (Paramètres) | Apparition dans la recherche d’amis |
| Profil privé | Masqué de la recherche ; amis existants conservés |

Modal consentement : `app/(tabs)/community/_layout.tsx` (`SocialConsentGate`).

---

## Blocage utilisateur

| Méthode | Chemin | Rôle |
|---------|--------|------|
| GET | `/api/users/blocked?page=` | Liste paginée |
| POST | `/api/users/{id}/block` | Bloquer |
| DELETE | `/api/users/{id}/block` | Débloquer |

Effets côté serveur (`FriendshipService::block`) :

- Statut `FriendshipStatus::Blocked` (bloqueur = `sender`)
- Suppression conversation 1-to-1 existante
- Suppression des entrées `ParcoursCollaborator` communes

Mobile : `app/blocked-users.tsx`, actions depuis `app/profile/[id].tsx`, lien Paramètres.

---

## Messages privés (1-to-1)

| Méthode | Chemin | Rôle |
|---------|--------|------|
| GET | `/api/chat/conversations` | Liste |
| GET | `/api/chat/conversations/{id}/messages` | Fil paginé |
| POST | `/api/chat/conversations/{id}/messages` | `{ content, activityId?, parcoursId? }` |
| PATCH | `/api/chat/conversations/{id}/read` | Marquer lu |

Mobile : `app/chat/[id].tsx`, `components/social/MessageAttachmentCards.tsx`, `UserAvatar`.

---

## Groupes & chat de groupe

| Domaine | Routes principales |
|---------|-------------------|
| Groupes | `GET/POST /api/groups`, `GET/PATCH/DELETE /api/groups/{id}`, join/leave, membres |
| Invitations | `/api/group-invitations` |
| Messages groupe | `GET/POST /api/groups/{id}/messages` (+ `activityId`, `parcoursId`) |

Mobile : `app/(tabs)/community/groups.tsx`, `app/group/[id].tsx`, `app/group-chat/[id].tsx`.

---

## Forum

| Méthode | Chemin | Rôle |
|---------|--------|------|
| GET | `/api/forum/threads` | Liste (filtres activité / catégorie / groupe) |
| POST | `/api/forum/threads` | Créer sujet |
| POST | `/api/forum/threads/{id}/replies` | Répondre |
| POST/DELETE | `/api/forum/replies/{id}/like` | Like |

Mobile : `app/(tabs)/community/forum.tsx`, `app/thread/create.tsx`, `app/thread/[id].tsx`.

---

## Amis

| Flux | API |
|------|-----|
| Recherche | `GET /api/users/search?q=` (≥ 2 car., profils publics + consentement) |
| Demande | `POST /api/friendships` |
| Accepter / refuser | `PATCH /api/friendships/{id}` |

Mobile : `app/(tabs)/community/friends.tsx`, `components/social/UserSearchBar.tsx`, `FriendRequest`.

---

## Fichiers clés (mobile)

| Fichier | Rôle |
|---------|------|
| `app/(tabs)/community/*` | Onglets Forum / Amis / Messages / Groupes |
| `app/profile/[id].tsx` | Profil public, ajouter ami, bloquer, message |
| `hooks/useChat.ts`, `useGroupChat.ts`, `useFriendships.ts`, `useBlocks.ts` | Cache React Query |
| `components/social/UserLink.tsx`, `UserAvatar.tsx` | Affichage unifié |

---

## RGPD

Traitement **T11 — Communauté & modération sociale** (voir [RGPD_registre.md](../RGPD_registre.md)) : alias, avatar, messages, statuts d’amitié, blocages.

---

*Dernière mise à jour : juin 2026.*
