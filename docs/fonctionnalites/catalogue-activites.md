# Catalogue & fiche activité

Consultation du catalogue d’activités publiées et affichage détaillé d’une fiche.

**Voir aussi :** [favoris.md](favoris.md) · [notes-activites.md](notes-activites.md) · [commentaires.md](commentaires.md) · [recommandations.md](recommandations.md)

---

## Principe

1. Les activités sont créées et publiées via le **back-office admin** (import CSV ou CRUD).
2. L’API expose une collection publique `GET /api/activities` (activités publiées uniquement pour les clients non-admin).
3. Le mobile charge le catalogue une fois (cache React Query 5 min) et le réutilise sur accueil, recherche, carte, favoris.
4. La fiche détail (`/activity/[id]`) agrège note, favori, commentaires et déclenche la gamification (vue fiche).

Chaque activité inclut : nom, description, catégorie, ville, coordonnées GPS, prix, image, agrégats `ratingAverage` / `ratingCount`.

---

## API

| Méthode | Chemin | Auth | Rôle |
|---------|--------|------|------|
| GET | `/api/activities` | Public* | Liste paginée Hydra (`hydra:member`) |
| GET | `/api/activities/{id}` | Public* | Détail d’une activité |
| GET | `/api/categories` | Public | Taxonomie (catégories / centres d’intérêt) |

\* Les brouillons (`isPublished = false`) sont masqués sauf pour `ROLE_ADMIN`.

---

## Mobile

| Fichier | Rôle |
|---------|------|
| `hooks/useActivities.ts` | Cache global `['activities']`, `staleTime` 5 min |
| `app/(tabs)/index.tsx` | Accueil : recommandations + liste « Toutes les activités » + mini-carte |
| `app/activity/[id].tsx` | Fiche complète (image, infos, note, favori, commentaires, navigation GPS) |
| `scripts/api.ts` | `fetchActivities`, helpers REST |

**Fiche détail — requêtes parallèles :**

1. `GET /api/activities/{id}`
2. `GET /api/activities/{id}/rating`
3. `GET /api/activities/{id}/comments?page=1`
4. `GET /api/me` (si connecté — état favori)
5. `POST /api/me/gamification/events` avec `{ type: "activity_viewed", context: { activityId } }` (badge « première découverte »)

**Actions utilisateur sur la fiche :** ouvrir dans Plans / Google Maps, ajouter aux favoris, noter, commenter.

---

## Backend

| Composant | Rôle |
|-----------|------|
| Entité `Activity` | Modèle Doctrine + `#[ApiResource]` |
| `ActivityImportService` | Import CSV admin |
| `public/uploads/activities/` | Photos liées à `imageUrl` |

---

## Points d’attention

- Pas d’endpoint agrégé « détail complet » : 3–4 requêtes REST par ouverture de fiche.
- Le catalogue mobile charge jusqu’à 200 items (`itemsPerPage=200`) — voir [ARCHITECTURE.md](../ARCHITECTURE.md) §11.

---

*Dernière mise à jour : mai 2026.*
