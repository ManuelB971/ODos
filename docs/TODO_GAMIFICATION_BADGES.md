# TODO — Badges, exploration & UX commentaires

> **Statut :** **implémenté (V1)** — mai 2026.  
> **Doc technique :** [GAMIFICATION.md](GAMIFICATION.md)  
> **Forum :** hors scope — [IDEES_POTENTIELLES.md](IDEES_POTENTIELLES.md)  
> **Phase D :** [fonctionnalites/exploration-carte.md](fonctionnalites/exploration-carte.md)

**Légende :** `[x]` fait · `[ ]` à faire / V2

---

## Synthèse des livrables

| Lot | Objectif | Statut |
|-----|----------|--------|
| **A — Modèle & admin badges** | CRUD admin : nom, description, photo, règles | [x] |
| **B — Attribution & API** | Débloquer badges, exposer au mobile | [x] |
| **C — Profil & vitrine** | Annexe profil, affichage choisi par l’utilisateur | [x] |
| **D — Exploration carte** | % zone visité (GPS) | [x] |
| **E — UX commentaires** | Fil moderne sur fiche activité | [x] |

---

## Phase A — Backend : entités & admin EasyAdmin

### A.1 Schéma données

- [x] Entité `BadgeDefinition`
- [x] Entité `UserBadge`
- [x] Entité `UserBadgeDisplay`
- [x] Entité `UserActivityView`
- [x] Migration `Version20260524120000`
- [x] `User.hideBadgesOnProfile`

### A.2 EasyAdmin

- [x] `BadgeDefinitionCrudController`
- [x] Menu « Badges »
- [x] Action attribuer manuelle (`BadgeManualAwardController`)

### A.3 Stockage images

- [x] `BadgePhotoUploader` + `public/uploads/badges/`

---

## Phase B — Règles & API

- [x] `GamificationService`, `BadgeRuleEvaluator`, `GamificationStatsProvider`
- [x] Hooks favoris, commentaire, note, événement `activity_viewed`
- [x] `MeBadgesController` (liste, display, seen, events)
- [x] Rate limit événements gamification
- [x] `app:badges:seed-defaults`
- [x] Tests `GamificationServiceTest`
- [x] RGPD export v2 + registre T9

---

## Phase C — Mobile

- [x] `app/badges.tsx`
- [x] Vitrine + menu compte
- [x] Toggle affichage profil + masquer tous
- [x] `BadgeUnlockModal` + contexte

---

## Phase D — Exploration carte

- [x] Entité `user_map_cell` + consentement `map_exploration_consent_at`
- [x] `MapExplorationZoneRegistry` (zone = activités publiées, geohash 6)
- [x] API `GET/POST /api/me/exploration` (+ consent, sync)
- [x] Règle `map_cells` + badge seed `map_explorer_25`
- [x] Mobile : `expo-location`, overlay, jauge, modale consentement
- [x] Synchro carte : pins GL, padding caméra / bottom sheet, FAB calé
- [x] Doc [fonctionnalites/exploration-carte.md](fonctionnalites/exploration-carte.md)

---

## Phase E — UX commentaires

- [x] `ActivityCommentsSection`
- [x] Intégration `activity/[id].tsx`
- [ ] Tests RTL dédiés (optionnel)

---

## Critères d’acceptation

- [x] Admin crée badge (nom, description, photo)
- [x] Utilisateur voit badges + toggle profil
- [x] 3+ règles auto (4 en seed)
- [x] Commentaires modernisés
- [x] Registre RGPD T9

---

*Dernière mise à jour : mai 2026.*
