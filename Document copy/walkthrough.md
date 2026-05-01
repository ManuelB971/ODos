# Walkthrough - Architecture types et fichiers cles

> **Mis a jour :** avril 2026

## Types centralises (frontend)

Tous les types et interfaces TypeScript sont centralises dans un fichier unique pour la maintenabilite.

**Fichier** : `odos-front/types/index.ts`

Types principaux :
- `User` et `AuthContextType`
- `InterestContextType`
- `Activity` (avec `ratingAverage`, `ratingCount`, `price`, `imageUrl`, dates, etc.)
- `Comment`, `ActivityRating`

## Fichiers qui importent depuis `@/types`

### Contexts
- `odos-front/context/AuthContext.tsx` — authentification JWT + SecureStore
- `odos-front/context/InterestContext.tsx` — gestion des centres d'interet

### Hooks
- `odos-front/hooks/useRecommendations.ts` — appel `/api/recommendations`
- `odos-front/hooks/useFavorites.ts` — gestion favoris
- `odos-front/hooks/useSearchActivities.ts` — recherche activites
- `odos-front/hooks/useActivities.ts` — listing activites
- `odos-front/hooks/useDebounce.ts` — debounce input

### Components
- `odos-front/components/RecommendedActivities.tsx` — affichage recommandations
- `odos-front/components/FavoriteCard.tsx` — carte favori
- `odos-front/components/map/ActivityCard.tsx` — carte activite sur la map

### Screens
- `odos-front/app/(tabs)/search.tsx` — recherche
- `odos-front/app/(tabs)/index.tsx` — home
- `odos-front/app/(tabs)/favorites.tsx` — favoris
- `odos-front/app/(tabs)/account.tsx` — profil
- `odos-front/app/activity/[id].tsx` — detail activite
- `odos-front/app/map.tsx` — carte interactive

### Services & Utils
- `odos-front/scripts/api.ts` — client API centralise
- `odos-front/services/AuthService.ts` — service auth JWT
- `odos-front/utils/errorHandling.ts` — gestion d'erreurs
- `odos-front/utils/imageUrl.ts` — resolution URLs images

## Backend — fichiers cles

### Entities
- `odos-back/src/Entity/Activity.php` — activite (categories, notes, commentaires, favoris)
- `odos-back/src/Entity/User.php` — utilisateur (interets, favoris, alias, bio, avatar, webauthn)
- `odos-back/src/Entity/Category.php` — categorie d'interet
- `odos-back/src/Entity/Comment.php` — commentaire avec soft-delete
- `odos-back/src/Entity/ActivityRating.php` — note 1-5

### Services
- `odos-back/src/Service/LlmRankingService.php` — re-ranking LLM (Ollama, cache, fallback)
- `odos-back/src/Service/UserActionThrottleService.php` — anti-abus
- `odos-back/src/Service/CommentContentSanitizer.php` — nettoyage XSS
- `odos-back/src/Service/ActivityImportService.php` — import CSV admin
- `odos-back/src/Service/UserAvatarUploader.php` — upload avatar
- `odos-back/src/Service/AdminDashboardStatsProvider.php` — stats admin

### Controllers
- `odos-back/src/Controller/ActivityRatingController.php` — notes
- `odos-back/src/Controller/ActivityCommentsController.php` — commentaires
- `odos-back/src/Controller/CommentItemController.php` — edition/suppression commentaire
- `odos-back/src/Controller/FavoriteActivityController.php` — favoris
- `odos-back/src/Controller/UserAvatarController.php` — upload avatar

### State Providers
- `odos-back/src/State/RecommendationStateProvider.php` — pipeline recommandations
- `odos-back/src/State/MeStateProvider.php` — `/api/me`

## Verification

### Tests backend (PHPUnit)
```bash
cd odos-back && composer test
```

### Tests frontend (Jest)
```bash
cd odos-front && pnpm test
```

### Analyse statique (PHPStan)
```bash
cd odos-back && composer analyse:ci
```

### CI/CD
Pipeline GitHub Actions complete — voir `docs/CI_CD_V2_2026.md`.
