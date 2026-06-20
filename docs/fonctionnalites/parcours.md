# Parcours (itinéraires collaboratifs)

Constitution d’itinéraires d’activités, carte avec tracé, partage en chat / groupes / forum, co-édition.

**Voir aussi :** [catalogue-activites.md](catalogue-activites.md) · [communaute-sociale.md](communaute-sociale.md) · [carte-interactive.md](carte-interactive.md)

---

## Principe

1. Depuis une **fiche activité**, l’utilisateur ajoute le lieu à un parcours existant ou en crée un (`ParcoursPickerSheet`).
2. L’**onglet Parcours** (bouton central orange) liste les parcours dont l’utilisateur est propriétaire ou collaborateur.
3. L’écran **`/parcours/[id]`** affiche les étapes ordonnées, le tracé (`ParcoursRouteLayer`), la pochette, la visibilité et les actions d’édition.
4. Le **partage** envoie une carte riche (chat privé, fil de groupe, forum) ; l’**invitation collaborateur** reste une action explicite (`POST …/collaborators`).

---

## Modèle « playlist »

| Concept | Comportement |
|---------|--------------|
| Propriétaire | Crée, supprime le parcours, gère visibilité et pochette |
| Collaborateur | Édite étapes (ajout, retrait, réordonnancement) |
| Visibilité **private** | Lecture réservée propriétaire + collaborateurs |
| Visibilité **public** | Lecture par tout utilisateur connecté (lien partagé) |
| Partage chat | Carte cliquable ; **ne** ajoute **plus** automatiquement le destinataire en collaborateur |
| Blocage utilisateur | Révoque les liens `ParcoursCollaborator` mutuels (étapes conservées) |

---

## API (JWT)

| Méthode | Chemin | Rôle |
|---------|--------|------|
| GET | `/api/parcours` | Liste (propriétaire + collaborations) |
| POST | `/api/parcours` | Créer `{ title, description?, activityIds?, visibility? }` |
| GET | `/api/parcours/{id}` | Détail (accès `canView`) |
| PATCH | `/api/parcours/{id}` | `{ title?, description?, visibility? }` |
| DELETE | `/api/parcours/{id}` | Suppression (propriétaire) |
| POST | `/api/parcours/{id}/items` | Ajouter une activité |
| PATCH | `/api/parcours/{id}/items/reorder` | `{ order: [itemId, …] }` |
| DELETE | `/api/parcours/{id}/items/{itemId}` | Retirer une étape |
| POST | `/api/parcours/{id}/cover` | Upload pochette (multipart) |
| DELETE | `/api/parcours/{id}/cover` | Retirer pochette custom |
| POST | `/api/parcours/{id}/collaborators` | `{ userId }` — co-édition explicite |
| DELETE | `/api/parcours/{id}/collaborators/{userId}` | Retirer un collaborateur |

Messages privés et groupes acceptent `activityId` / `parcoursId` sur envoi de message (cartes riches).

---

## Migrations

| Version | Objet |
|---------|--------|
| `Version20260616130000` | Tables `parcours`, `parcours_item`, `parcours_collaborator` |
| `Version20260616120000` | `chat_message.activity_id` |
| `Version20260616140000` | `chat_message.parcours_id` |
| `Version20260619120000` | `group_message.activity_id`, `group_message.parcours_id` |
| `Version20260620120000` | `parcours.cover_image_url`, `parcours.visibility` |

---

## Mobile

| Fichier | Rôle |
|---------|------|
| `app/(tabs)/parcours.tsx` | Bibliothèque + création + parcours surprise |
| `app/(tabs)/_layout.tsx` | Onglet central proéminent |
| `app/parcours/[id].tsx` | Détail, carte, édition, partage |
| `app/activity/[id].tsx` | Bouton « Ajouter à un parcours » |
| `components/social/ParcoursPickerSheet.tsx` | Choix / création rapide |
| `components/social/ParcoursShareTargetSheet.tsx` | Partager vers ami / groupe / forum |
| `components/social/ParcoursCard.tsx` | Carte liste |
| `components/map/ParcoursRouteLayer.tsx` | Tracé MapLibre |
| `hooks/useParcours.ts` | Liste, détail, mutations |
| `scripts/api.ts` | Helpers `/api/parcours/*` |

---

## Limites connues

- Réordonnancement par boutons ↑/↓ (pas de drag-and-drop).
- Champ `note` par étape exposé API, pas encore éditable en UI.
- Tracé carte : natif MapLibre ; stub en Expo Go.

---

*Dernière mise à jour : juin 2026.*
