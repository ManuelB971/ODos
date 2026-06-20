# Recherche & découverte

Onglet **Recherche** : exploration éditoriale du catalogue avec filtres par catégorie et recherche textuelle locale.

**Voir aussi :** [catalogue-activites.md](catalogue-activites.md) · [carte-interactive.md](carte-interactive.md)

---

## Principe

1. Le catalogue complet est chargé via `useActivities()` (même cache que l’accueil).
2. Seules les activités **publiées** sont affichées (`isPublished !== false`).
3. **Chips catégories** : filtre local par nom de catégorie (« Tout » + catégories distinctes du catalogue).
4. **Barre de recherche** : filtre textuel debouncé (250 ms) sur nom, catégorie, description, ville.
5. Mode « browse » (sans recherche) : mise en page éditoriale (featured, grille limitée à 4 cartes, bannière) ; mode « search » : liste virtualisée (`FlatList`).

La recherche est **100 % côté client** — pas d’appel API dédié au filtrage.

> **Stabilité (juin 2026) :** le mode mosaïque pop utilise une `FlatList` virtualisée et limite le browse à 4 cartes pour éviter les crashs mémoire sur longues listes.

---

## Mobile

| Fichier | Rôle |
|---------|------|
| `app/(tabs)/search.tsx` | Écran principal recherche |
| `hooks/useActivities.ts` | Source de données |
| `hooks/useDebounce.ts` | Debounce 250 ms sur la query |

**Navigation :** tap sur une activité → `/activity/{id}`.

**Accès carte plein écran :** CTA depuis l’accueil ou routes dédiées → [carte-interactive.md](carte-interactive.md).

---

## UX

- Palette dédiée (bleu pâle + terre cuite) alignée maquette « Search – ODOS ».
- Chips horizontaux scrollables ; état actif visuellement distinct.
- État vide explicite quand aucun résultat ne correspond à la recherche.

---

## Évolutions possibles

- Endpoint serveur `GET /api/activities?q=…&category=…` pour catalogues volumineux.
- Géolocalisation « près de moi » (non implémenté en V1).

---

*Dernière mise à jour : juin 2026.*
