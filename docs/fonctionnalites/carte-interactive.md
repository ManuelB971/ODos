# Carte interactive

Expérience MapLibre plein écran : **pins ODOS** (`MapPin`), **callout** au tap, recherche et filtres catégories.

**Voir aussi :** [exploration-carte.md](exploration-carte.md) · [catalogue-activites.md](catalogue-activites.md)

---

## Principe

1. Route dédiée `/map` (hors tabs) — surface immersive, header masqué.
2. Carte MapLibre avec style ODOS (`getOdosMaplibreStyleUrl`).
3. **Tous les pins** sont des `<Marker>` React avec composant `<MapPin variant="arch">` (bleu inactif, orange actif + pulse).
4. **Tap sur un pin** → sélection, label sous le pin, recentrage caméra, **callout** (`ActivityCard` pleine largeur en bas).
5. **Re-tap sur le même pin** → désélection et fermeture du callout.
6. **Tap sur le callout** → navigation vers `/activity/[id]`.
7. Recherche textuelle + chips catégories filtrent les pins (pas de liste séparée en bas).
8. Caméra : refit automatique quand la liste filtrée change (`filterKey`), pas à chaque frappe recherche.

L’exploration GPS (% zone visitée, overlay cellules) est documentée séparément : [exploration-carte.md](exploration-carte.md).

---

## Contrat UX (anti-régression)

Ces règles sont **volontairement verrouillées** par les tests `MapExperience.test.tsx`. Ne pas les contourner sans mettre à jour la fiche et les tests.

| Règle | Attendu | Interdit |
|-------|---------|----------|
| Marqueurs | `<Marker>` + `<MapPin>` pour chaque activité filtrée | Calque GeoJSON / cercles GL (`ActivityPinsLayer`) |
| Sélection | Tap pin → callout unique en bas | Bottom sheet, carrousel `FlatList`, liste horizontale |
| Désélection | Re-tap même pin | — |
| Filtres | Recherche + chips → pins visibles uniquement | Liste dupliquée sous la carte |
| États | Bannières flottantes (loading / erreur / vide) | Sheet vide ou scroll imbriqué |
| Recentrage | FAB boussole, padding caméra avec/sans callout | Position liée à un bottom sheet |

---

## Mobile

| Fichier | Rôle |
|---------|------|
| `app/map.tsx` | Route plein écran, charge `useActivities()` |
| `components/map/MapExperience.tsx` | Orchestrateur map + overlays + callout |
| `components/map/MapPin.tsx` | Pin arch (Marker MapLibre) |
| `components/map/ActivityCard.tsx` | Callout activité sélectionnée |
| `components/map/CategoryChips.tsx` | Filtres catégories |
| `components/map/SearchBar.tsx` | Recherche sur la carte |
| `utils/mapCameraPadding.ts` | Padding caméra (avec/sans callout) |

**Fichiers legacy (ne plus brancher dans MapExperience) :** `ActivityPinsLayer.tsx`, `BottomSheet.tsx`.

**Accès :** CTA « Explorer la carte » depuis l’accueil (`index.tsx`).

**Comportements clés :**

- FAB recentrage : offset bas augmenté quand le callout est visible.
- `Camera` avec `initialViewState` + `padding` (`MAP_CAMERA_PADDING` / `MAP_CAMERA_PADDING_WITH_CALLOUT`).
- Fallback région France si aucune activité géolocalisée.
- Conteneur map en `flex: 1` (dimensions stables pour MapLibre).

---

## Tests

```bash
cd odos-front
pnpm test:ci -- MapExperience
```

Couverture anti-régression :

- Absence de `BottomSheet`, `ActivityPinsLayer`, `FlatList` dans `MapExperience.tsx`
- Un marker par activité publiée géolocalisée
- Tap / re-tap pin → callout
- Navigation callout → fiche activité
- Filtres recherche et catégorie
- Bannières loading, erreur, vide

---

## Données

- Source : `GET /api/activities` (cache React Query partagé).
- Filtrage local : publiées + coordonnées + recherche + catégorie.

---

## Dépendances

- `@maplibre/maplibre-react-native`
- Style tuiles configuré dans `constants/maplibreStyle.ts`

---

*Dernière mise à jour : mai 2026.*
