# Favoris

Enregistrement et consultation des activités favorites de l’utilisateur connecté.

**Voir aussi :** [badges-gamification.md](badges-gamification.md) · [catalogue-activites.md](catalogue-activites.md)

---

## Principe

1. L’utilisateur ajoute ou retire une activité en favori depuis la fiche détail (cœur) ou l’écran favoris.
2. Le backend persiste la relation many-to-many `user_favorites` (`User` ↔ `Activity`).
3. Le mobile récupère les IDs favoris via `GET /api/me`, puis filtre le catalogue local.
4. À l’ajout, le moteur de gamification peut débloquer le badge `five_favorites` (5 favoris).

---

## API (JWT)

| Méthode | Chemin | Rôle |
|---------|--------|------|
| POST | `/api/activities/{id}/favorite` | Ajouter → `{ isFavorite: true, unlockedBadges? }` |
| DELETE | `/api/activities/{id}/favorite` | Retirer → `{ isFavorite: false }` |
| GET | `/api/me` | Liste des favoris (IRIs ou objets embarqués) |

Activité non publiée : 404 pour les utilisateurs standards.

---

## Mobile

| Fichier | Rôle |
|---------|------|
| `app/(tabs)/favorites.tsx` | Grille 2 colonnes, état vide, CTA connexion |
| `hooks/useFavorites.ts` | Jointure catalogue + `favoriteIds` |
| `components/FavoriteCard.tsx` | Carte activité favorie |
| `scripts/api.ts` | `fetchFavoriteIds`, `toggleFavoriteActivity` |

**Pattern actuel :**

1. `GET /api/activities?itemsPerPage=200` (cache `['activities']`)
2. `GET /api/me` → extraction IDs → cache `['favoriteIds']`
3. Filtre client dans `useFavorites`

**Optimistic update :** retrait visuel immédiat sur l’écran favoris ; rollback si erreur API.

---

## Gamification

- Règle `favorites_count`, seuil **5** → badge `five_favorites`.
- Réponse `POST /favorite` inclut `unlockedBadges` si nouveau badge.

---

## Limites connues

- Pas d’endpoint `/api/me/favorites` dédié : bande passante proportionnelle à la taille du catalogue.
- Voir recommandation d’évolution dans [ARCHITECTURE.md](../ARCHITECTURE.md) §11.

---

*Dernière mise à jour : mai 2026.*
