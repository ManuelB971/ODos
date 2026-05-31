# Carte interactive

Expérience MapLibre plein écran : pins d’activités, bottom sheet, recherche et filtres catégories.

**Voir aussi :** [exploration-carte.md](exploration-carte.md) · [catalogue-activites.md](catalogue-activites.md)

---

## Principe

1. Route dédiée `/map` (hors tabs) — surface immersive, header masqué.
2. Carte MapLibre avec style ODOS (`getOdosMaplibreStyleUrl`).
3. **Pins inactifs** en GeoJSON + calque GL ; **pin sélectionné** seul en `Marker` React (label + animation).
4. **Bottom sheet** : liste horizontale d’activités filtrées, synchronisée avec la sélection sur la carte.
5. Recherche textuelle + chips catégories filtrent pins et liste simultanément.
6. Caméra : refit automatique quand la liste filtrée change (`filterKey`), pas à chaque frappe recherche.

L’exploration GPS (% zone visitée, overlay cellules) est documentée séparément : [exploration-carte.md](exploration-carte.md).

---

## Mobile

| Fichier | Rôle |
|---------|------|
| `app/map.tsx` | Route plein écran, charge `useActivities()` |
| `components/map/MapExperience.tsx` | Orchestrateur map + sheet + overlays |
| `components/map/ActivityPinsLayer.tsx` | Pins GeoJSON (cercles GL) |
| `components/map/MapPin.tsx` | Pin sélectionné (Marker) |
| `components/map/BottomSheet.tsx` | Sheet 3 états (peek / half / full) |
| `components/map/ActivityCard.tsx` | Cartes dans le carrousel |
| `components/map/CategoryChips.tsx` | Filtres catégories |
| `components/map/SearchBar.tsx` | Recherche sur la carte |

**Accès :** CTA « Explorer la carte » depuis l’accueil (`index.tsx`).

**Comportements clés :**

- FAB recentrage positionné via `onSheetTopY` du bottom sheet.
- `Camera` avec `initialViewState` + `padding` lié à l’état du sheet.
- Fallback région France si aucune activité géolocalisée.
- Conteneur map en `flex: 1` (dimensions stables pour MapLibre).

---

## Données

- Source : `GET /api/activities` (cache React Query partagé).
- Filtrage local identique à la carte : publiées + recherche + catégorie.

---

## Dépendances

- `@maplibre/maplibre-react-native`
- Style tuiles configuré dans `constants/maplibreStyle.ts`

---

*Dernière mise à jour : mai 2026.*
