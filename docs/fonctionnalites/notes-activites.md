# Notes sur les activités

Notation 1–5 étoiles par utilisateur connecté, avec agrégats affichés sur la fiche activité.

**Voir aussi :** [catalogue-activites.md](catalogue-activites.md) · [badges-gamification.md](badges-gamification.md)

---

## Principe

1. Chaque utilisateur peut attribuer **une note** par activité (contrainte unique `user_id + activity_id`).
2. `PUT` crée ou met à jour ; `DELETE` supprime la note personnelle.
3. Les agrégats `ratingAverage` et `ratingCount` sur `Activity` sont recalculés à chaque écriture.
4. La première note déclenche le badge `first_rating` (règle `ratings_count`).

---

## API

| Méthode | Chemin | Auth | Rôle |
|---------|--------|------|------|
| GET | `/api/activities/{id}/rating` | Public (lecture) | `{ average, count, userScore? }` |
| PUT | `/api/activities/{id}/rating` | User | `{ score: 1..5 }` → `{ userScore, average, count, unlockedBadges? }` |
| DELETE | `/api/activities/{id}/rating` | User | Supprime la note utilisateur |

`userScore` est `null` si non connecté ou pas encore noté.

---

## Mobile

| Fichier | Rôle |
|---------|------|
| `app/activity/[id].tsx` | UI étoiles, mutations React Query |
| `scripts/api.ts` | `fetchActivityRating`, `putActivityRating`, `deleteActivityRating` |

**Cache React Query :** clé `['activityRating', activityId]`.

**Rate limit :** minimum **3 s** entre deux actions note (création / modification / suppression) — réponse HTTP 429 avec `retryAfterSeconds`.

---

## Backend

| Composant | Rôle |
|-----------|------|
| `ActivityRatingController` | Routes REST |
| Entité `ActivityRating` | Score 1–5, lien user + activity |
| `UserActionThrottleService` | Anti-spam (`rating_ok_{userId}`) |

---

## Gamification

- Événement `RATING_CREATED` → évaluation règle `ratings_count`, seuil **1**.
- Badge seed : `first_rating`.

---

*Dernière mise à jour : mai 2026.*
