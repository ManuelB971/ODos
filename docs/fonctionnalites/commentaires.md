# Commentaires

Fil d’avis utilisateurs sur chaque fiche activité : lecture publique, écriture authentifiée, édition / suppression par l’auteur.

**Voir aussi :** [catalogue-activites.md](catalogue-activites.md) · [badges-gamification.md](badges-gamification.md)

---

## Principe

1. Les commentaires sont liés à une activité publiée et à un auteur (`User`).
2. Lecture paginée (20 / page) ; commentaires masqués (`isHidden`) exclus sauf pour admin.
3. Création : contenu sanitizé (anti-XSS), 2–1000 caractères.
4. L’auteur peut **modifier** (`PATCH`) ou **supprimer** (`DELETE`) son commentaire.
5. Le premier commentaire déclenche le badge `first_comment`.

---

## API

| Méthode | Chemin | Auth | Rôle |
|---------|--------|------|------|
| GET | `/api/activities/{id}/comments?page=1` | Public | `{ member[], totalItems, page, itemsPerPage }` |
| POST | `/api/activities/{id}/comments` | User | `{ content }` → commentaire + `unlockedBadges?` |
| PATCH | `/api/comments/{id}` | User (auteur) | `{ content }` → commentaire mis à jour (`isEdited`) |
| DELETE | `/api/comments/{id}` | User (auteur) | Suppression |

Format commentaire : auteur (alias, avatar), contenu, dates, flag `isEdited`.

---

## Mobile

| Fichier | Rôle |
|---------|------|
| `components/comments/ActivityCommentsSection.tsx` | UI fil + saisie + édition inline |
| `app/activity/[id].tsx` | Orchestration mutations, toasts 429 |
| `scripts/api.ts` | Helpers REST commentaires |

**UX (lot E gamification) :**

- Avatars auteurs, temps relatif (« Il y a 2 h »).
- Édition inline avec annulation ; confirmation avant suppression.
- `InlineToast` avec compte à rebours sur rate-limit.
- Haptic feedback à la publication.

**Rate limit :** minimum **5 s** entre deux commentaires publiés avec succès.

---

## Backend

| Composant | Rôle |
|-----------|------|
| `ActivityCommentsController` | Liste + création |
| `CommentItemController` | Patch / delete |
| `CommentContentSanitizer` | Nettoyage contenu |
| `CommentSerializer` | Format JSON stable |

---

## Modération

- Admin EasyAdmin : masquer un commentaire (`isHidden`).
- Suppression compte : anonymisation des commentaires laissés (voir [rgpd-compte.md](rgpd-compte.md)).

---

## Gamification

- Événement `COMMENT_CREATED` → règle `comments_count`, seuil **1**.
- Badge seed : `first_comment`.

---

*Dernière mise à jour : mai 2026.*
