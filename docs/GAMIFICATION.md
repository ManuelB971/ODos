# Gamification ODOS — badges & exploration

Documentation de l’implémentation (mai 2026). Plan source : [TODO_GAMIFICATION_BADGES.md](TODO_GAMIFICATION_BADGES.md).

---

## Vue d’ensemble

| Lot | Statut | Description |
|-----|--------|-------------|
| A — Admin badges | ✅ | CRUD EasyAdmin, upload image, attribution manuelle |
| B — API & règles auto | ✅ | 4 règles V1, événements, rate limit |
| C — Mobile profil | ✅ | Écran `/badges`, vitrine compte, toggle affichage |
| D — Exploration carte GPS | ✅ | Cellules geohash, API `/api/me/exploration`, overlay carte |
| E — UX commentaires | ✅ | Composant `ActivityCommentsSection` |

---

## Modèle de données (backend)

```
badge_definition     — catalogue (code, nom, description, imageUrl, ruleType, ruleConfig)
user_badge           — attribution (user, badge, unlockedAt, seenAt)
user_badge_display   — préférences profil (isDisplayedOnProfile, displayOrder)
user_activity_view   — compteur vues fiches (pour règle activity_views)
user_map_cell        — cellules geohash visitées (exploration carte)
user.hide_badges_on_profile — interrupteur global
user.map_exploration_consent_at — consentement GPS carte
```

### Règles automatiques V1

| code (seed) | ruleType | Seuil |
|-------------|----------|-------|
| `first_discovery` | `activity_views` | 1 |
| `five_favorites` | `favorites_count` | 5 |
| `first_comment` | `comments_count` | 1 |
| `first_rating` | `ratings_count` | 1 |
| `map_explorer_25` | `map_cells` | 25 (% zone) |

Commande de seed :

```bash
docker compose exec php php bin/console app:badges:seed-defaults
```

---

## API mobile (JWT)

| Méthode | Chemin | Rôle |
|---------|--------|------|
| GET | `/api/me/badges` | earned, available, profileDisplayed, unseenCount |
| GET | `/api/me/badges/available` | Catalogue actif non obtenu |
| PATCH | `/api/me/badges/{id}/display` | `{ "displayOnProfile": true, "displayOrder": 0 }` |
| POST | `/api/me/badges/{id}/seen` | Marquer notification lue |
| POST | `/api/me/badges/seen-all` | Tout marquer vu |
| POST | `/api/me/gamification/events` | `{ "type": "activity_viewed", "context": { "activityId": 12 } }` |
| GET | `/api/me/exploration` | Progression carte, GeoJSON cellules visitées |
| POST | `/api/me/exploration/consent` | Consentement GPS exploration |
| POST | `/api/me/exploration/sync` | `{ "cells": ["u09tvw"] }` |

Réponses d’actions métier peuvent inclure `unlockedBadges` : favori, commentaire, note, sync carte.

---

## Admin

- Menu **Badges** → CRUD (nom, description, photo, règle JSON, actif, masqué par défaut).
- Action **Attribuer** → `/admin/badges/{id}/award` (sélection utilisateur).

Upload : `public/uploads/badges/` (max 2 Mo, JPG/PNG/WEBP/GIF).

---

## Frontend

| Fichier | Rôle |
|---------|------|
| `app/badges.tsx` | Annexe « Mes badges » |
| `app/(tabs)/account.tsx` | Vitrine + entrée menu |
| `context/BadgeUnlockContext.tsx` | Modale déblocage |
| `components/badges/BadgeUnlockModal.tsx` | UI nouveau badge |
| `components/comments/ActivityCommentsSection.tsx` | Fil commentaires moderne |
| `hooks/useBadges.ts` | React Query |
| `hooks/useMapExploration.ts` | GPS + sync cellules |
| `components/map/Exploration*.tsx` | Overlay, consentement, jauge |

**Fiche détaillée phase D :** [fonctionnalites/exploration-carte.md](fonctionnalites/exploration-carte.md)

---

## RGPD

- Traitements **T9 — Gamification** et **T10 — Exploration carte** dans [RGPD_registre.md](RGPD_registre.md).
- Export `odos-gdpr-export-v2` : badges, préférences affichage, `mapExploration`.
- Suppression compte : cascade ORM sur `user_badge`, `user_badge_display`, `user_activity_view`, `user_map_cell`.

---

## Tests

```bash
cd odos-back && php bin/phpunit tests/GamificationServiceTest.php
```

---

## Phase D — exploration carte

Implémentée (mai 2026) : geohash précision 6, zone = activités publiées, badge `map_explorer_25`, calques MapLibre + `expo-location`. Voir [fonctionnalites/exploration-carte.md](fonctionnalites/exploration-carte.md).
