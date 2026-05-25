# Exploration carte (phase D)

Suivi de la progression géographique sur la carte MapLibre : cellules visitées, pourcentage de couverture, badge **Explorateur**.

**Voir aussi :** [GAMIFICATION.md](../GAMIFICATION.md) · [TODO_GAMIFICATION_BADGES.md](../TODO_GAMIFICATION_BADGES.md)

---

## Principe

1. **Zone catalogue** (`catalog-v1`) : ensemble des cellules **geohash** (précision 6) couvrant chaque activité publiée géolocalisée.
2. L’app envoie périodiquement la cellule de la position GPS (foreground, carte ouverte, consentement donné).
3. Le backend enregistre `user_map_cell` et recalcule le **% visité** = `visitedCount / totalCells × 100`.
4. La règle badge `map_cells` débloque quand le seuil (ex. 25 %) est atteint.

Les coordonnées GPS brutes ne sont **pas** stockées côté serveur — uniquement l’identifiant de cellule (~1,2 km).

---

## API (JWT)

| Méthode | Chemin | Rôle |
|---------|--------|------|
| GET | `/api/me/exploration` | Progression, bbox, `visitedCellIds`, GeoJSON overlay |
| POST | `/api/me/exploration/consent` | Consentement RGPD (horodaté sur `user`) |
| PATCH | `/api/me/exploration/settings` | `{ "enabled": true \| false }` — interrupteur paramètres |
| POST | `/api/me/exploration/sync` | `{ "cells": ["u09tvw", …] }` — max 40 cellules / requête |

**Actif** côté API = `mapExplorationEnabled` **et** `mapExplorationConsentAt` renseigné (`active: true`). Si désactivé dans Paramètres : pas de sync, % à 0 pour les nouveaux badges carte, pas d’overlay ni GPS (les badges déjà gagnés restent).

Réponse sync : `{ overview, unlockedBadges }`.

---

## Mobile

| Fichier | Rôle |
|---------|------|
| `hooks/useMapExploration.ts` | React Query + `expo-location` (watch foreground) |
| `components/map/ExplorationVisitedLayer.tsx` | Calque fill/line MapLibre |
| `components/map/ExplorationProgressChip.tsx` | Jauge % en overlay |
| `components/map/ExplorationConsentModal.tsx` | Premier consentement |
| `components/map/MapExperience.tsx` | Orchestration + synchro caméra / sheet |

Permissions : `NSLocationWhenInUseUsageDescription` (iOS), `ACCESS_FINE_LOCATION` (Android) dans `app.json`.

**Paramètres** (`app/settings.tsx`) : interrupteur « Exploration de la carte » → `PATCH /api/me/exploration/settings` ou champ `mapExplorationEnabled` sur `PATCH /api/users/{id}`.

---

## Badge seed

```bash
docker compose exec php php bin/console app:badges:seed-defaults
```

Code `map_explorer_25` — règle `map_cells`, seuil **25** (%).

---

## RGPD

- Consentement explicite avant tout sync (`map_exploration_consent_at`).
- Export `odos-gdpr-export-v2` : section `mapExploration` (cellules visitées).
- Suppression compte : cascade `user_map_cell`.
- Registre : traitement **T10** dans [RGPD_registre.md](../RGPD_registre.md).

---

## Carte — synchro layers (mai 2026)

- **Map** dans un conteneur `flex:1` (dimensions stables).
- **Camera** `initialViewState` + `padding` lié à l’état du bottom sheet.
- Pins inactifs en **GeoJSON + Layer** (GL) ; pin actif seul en **Marker** (label + animation).
- FAB recentrage positionné via `onSheetTopY` du sheet.
- Refit caméra uniquement quand la liste filtrée change (`filterKey`), pas à chaque frappe recherche.

---

*Dernière mise à jour : mai 2026.*
