# ODOS - Taches restantes (mis a jour avril 2026)

> **Derniere MAJ** : avril 2026 — recadrage complet par rapport a l'etat reel du depot.

---

## Realise

### Backend Symfony (odos-back)

- [x] Symfony 7.4 configure + Docker (PHP-FPM, Nginx, PostgreSQL, Redis)
- [x] Entity `Category` (name unique, API Platform groups)
- [x] Entity `User` (email, roles, password, interests ManyToMany -> Category, favorites, alias, bio, avatar, displayName)
- [x] Entity `Activity` (name, description, lat/lon, city, price, imageUrl, dates, isPublished, category ManyToOne, ratingAverage, ratingCount)
- [x] Entity `ActivityRating` (note 1-5 par utilisateur, agregation sur Activity)
- [x] Entity `Comment` (auteur, contenu sanitize, soft-delete `isHidden`)
- [x] Migrations Doctrine executees
- [x] JWT authentification (LexikJWT : `/api/login`, `/api/token/refresh`)
- [x] Endpoint `/api/me` (MeStateProvider)
- [x] Endpoint `GET /api/recommendations` (RecommendationStateProvider + re-ranking LLM optionnel)
- [x] `LlmRankingService` : appel Ollama, cache Redis, fallback DB, timeout configurable
- [x] `CandidateForLlm` DTO (id, name, description, category, city, ratingAverage, ratingCount)
- [x] Securite : acces public categories/activities, recommandations ROLE_USER, admin ROLE_ADMIN
- [x] CORS configure (NelmioCorsBundle)
- [x] EasyAdmin dashboard (`/admin`) : Activity, Category, User, Comment, import CSV
- [x] `ActivityRatingController` : GET/PUT/DELETE `/api/activities/{id}/rating`
- [x] `ActivityCommentsController` : GET/POST `/api/activities/{id}/comments`
- [x] `CommentItemController` : PATCH/DELETE `/api/comments/{id}`
- [x] `FavoriteActivityController` : POST/DELETE `/api/activities/{id}/favorite`
- [x] `UserAvatarController` : upload avatar securise
- [x] `UserActionThrottleService` : anti-abus (cache)
- [x] `CommentContentSanitizer` : nettoyage XSS
- [x] `ActivityImportService` + `ActivityPhotoUploader` (import CSV admin)
- [x] `AdminDashboardStatsProvider` : stats admin
- [x] Fixtures de base
- [x] Tests PHPUnit : RecommendationTest, ActivityRatingAggregateTest, CommentContentSanitizerTest, UserActionThrottleServiceTest, ThrottledActionExceptionTest, ActivityImportResultTest
- [x] PHPStan analyse statique (niveau progressif, extensions Doctrine + Symfony)

### Frontend React Native / Expo (odos-front)

- [x] Navigation tabs (home, search, favorites, account)
- [x] Ecran login JWT (AuthService + AuthContext + SecureStore)
- [x] Ecran interests (selection centres d'interet, InterestContext)
- [x] Ecran account (profil, alias, bio, avatar, settings)
- [x] Ecran detail activite (`activity/[id].tsx`) : favoris, notes, commentaires
- [x] Ecran recherche avec filtres
- [x] Ecran carte (`map.tsx`) avec MapExperience, pins, bottom sheet
- [x] Ecran favoris (FavoriteCard)
- [x] Hook `useRecommendations` (appel `/api/recommendations` avec JWT)
- [x] Composant `RecommendedActivities`
- [x] Types centralises (`types/index.ts`)
- [x] API centralisee (`scripts/api.ts`)
- [x] Gestion d'erreurs centralisee (`utils/errorHandling.ts`)
- [x] Tests unitaires Jest : api, AuthService, errorHandling, imageUrl, jwt, useRecommendations, useDebounce, useFavorites, useSearchActivities, useActivities, InterestContext

### CI/CD (GitHub Actions)

- [x] Workflow `.github/workflows/ci.yml` : detection de changements (paths-filter)
- [x] Job backend : PHPUnit + PostgreSQL + Redis en service
- [x] Job frontend : lint (eslint) + tests Jest
- [x] Job backend-static-analysis : PHPStan
- [x] Job backend-coverage : rapport HTML en artifact
- [x] Job frontend-coverage : rapport HTML en artifact
- [x] Job build-backend-prod : image Docker cible prod
- [x] Actions mises a jour : checkout@v6, setup-node@v6, pnpm/action-setup@v5

### Docker & Infrastructure

- [x] `docker-compose.yml` : PHP, Nginx, PostgreSQL, Redis, Ollama (LLM)
- [x] `docker-compose.override.yml` : config dev
- [x] Configuration Contabo VPS documentee dans README

---

## Reste a faire (par priorite)

### P0 — Critique (avant release)

- [ ] Deploiement prod sur Contabo VPS (reverse proxy TLS, `docker-compose.prod.yml`)
- [ ] Strategie de backup DB (dump PostgreSQL quotidien + retention hors VPS)
- [ ] Monitoring LLM en prod (latence p95, taux erreurs, taux fallback, cout)

### P1 — Important (court terme)

- [ ] Tests d'integration API complets (parcours auth -> reco -> favoris -> commentaires)
- [ ] Tests React Native end-to-end (Detox ou Maestro)
- [ ] Notifications push (COULD dans le cahier des charges)
- [ ] Explicabilite recommandations cote front ("pourquoi cette reco ?") — **hypothese a valider**

### P2 — Nice to have (apres MVP)

- [ ] Filtres contextuels (meteo, budget, duree) — **hypothese a valider**
- [ ] Listes / favoris partageables (viralite)
- [ ] A/B testing recommandations (LLM on vs off)
- [ ] Microservice ML dedie (scaling LLM independant)

---

## Checklist de test (etat actuel)

### API

- [x] `POST /api/login` -> Status 200 + token
- [x] `GET /api/recommendations` + Authorization Bearer -> Status 200
- [x] `GET/PUT/DELETE /api/activities/{id}/rating` fonctionnel
- [x] `GET/POST /api/activities/{id}/comments` fonctionnel
- [x] `POST/DELETE /api/activities/{id}/favorite` fonctionnel
- [x] `GET /api/me` -> profil utilisateur courant

### Admin

- [x] Dashboard accessible : `http://localhost:8000/admin`
- [x] CRUD Activity/Category/User/Comment fonctionnel
- [x] Import CSV activites

### Frontend

- [x] Login/Logout fonctionne
- [x] Token persiste (SecureStore)
- [x] Appels API passent le JWT header
- [x] Recommandations s'affichent
- [x] Favoris toggle + ecran dedie
- [x] Notes et commentaires sur detail activite

---

## Ressources / Docs

- [API Platform - StateProvider](https://api-platform.com/docs/core/state-providers/)
- [Symfony Security + JWT](https://symfony.com/doc/current/security.html)
- [EasyAdmin 4](https://symfony.com/doc/current/EasyAdminBundle/index.html)
- [Expo Documentation](https://docs.expo.dev/)
- `docs/CI_CD_V2_2026.md` : documentation CI/CD active
- `planllm.md` : design LLM re-ranking
