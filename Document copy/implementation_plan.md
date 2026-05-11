# ODOS MVP - Technical Roadmap & Implementation Plan

> **Statut** : plan initial **realise**. Ce document est conserve comme reference historique.  
> Pour l'etat actuel du projet, voir `TASKS_REMAINING.md` (version avril 2026).

This roadmap addresses the missing elements to reach the MVP, focusing on the User/Activity recommendation flow.

---

## 1. Modelisation BDD (Entities & Relations) — REALISE

### **Entity: Category** ✅
Represents "Interets" (Interests) for Users and classifications for Activities.
- **Fields**:
    - `name` (string, 255, unique)
- **Groups**: `['category:read']`

### **Entity: User** ✅
- **Fields**:
    - `email` (string, 180, unique)
    - `roles` (json)
    - `password` (string, hashed)
    - `interests` (ManyToMany with **Category**)
    - `favorites` (ManyToMany with **Activity**)
    - `alias` (string, 60, nullable — pseudo public)
    - `bio` (text, nullable — sanitized)
    - `avatarUrl` (string, nullable — upload controle)
    - `phoneNumber` (string, nullable)
- **API Platform**:
    - `GetCollection` (ROLE_ADMIN), `Get` (/me + par id), `Post`, `Patch`, `Delete`
    - `normalizationContext`: `['groups' => ['user:read']]`
    - `denormalizationContext`: `['groups' => ['user:write']]`
    - Champ calcule `displayName` (alias ou local-part email)
- **Security**:
    - Password NEVER readable.
    - Only Owner or Admin can view/edit full profile.
    - avatarUrl non-writable via API (upload uniquement via `UserAvatarController`).

### **Entity: Activity** ✅
- **Fields**:
    - `name` (string, 255), `description` (text), `latitude` (float), `longitude` (float)
    - `category` (ManyToOne with **Category**)
    - `city` (string, optional), `price` (float, nullable), `imageUrl` (string, nullable)
    - `dateStart`, `dateEnd` (datetime, nullable)
    - `isPublished` (bool, default true)
    - `ratingAverage` (decimal 4,2, nullable), `ratingCount` (int, default 0)
- **Relations**: `comments` (OneToMany -> Comment), `ratings` (OneToMany -> ActivityRating), `favoritedBy` (ManyToMany -> User)
- **Groups**: `['activity:read']`, `['activity:write']`

### **Entity: ActivityRating** ✅
- User + Activity (unique pair), score 1-5
- Agregation automatique sur `Activity.ratingAverage` / `ratingCount`

### **Entity: Comment** ✅
- Auteur (User), activite (Activity), contenu sanitize, `isHidden` (soft-delete)
- Controleurs dedies (CRUD par auteur, moderation admin)

---

## 2. Logique Metier (Recommendations) — REALISE

### **Endpoint** ✅
`GET /api/recommendations` — protege `ROLE_USER`

### **Implementation** ✅
1.  `RecommendationStateProvider` : filtre par interets utilisateur + `isPublished`.
2.  **Re-ranking LLM** via `LlmRankingService` (Ollama, cache Redis, fallback DB).
3.  `CandidateForLlm` DTO (id, name, description, category, city, ratingAverage, ratingCount).
4.  Validation stricte : IDs renvoyes par le LLM ⊆ candidats DB.
5.  Desactivable via `LLM_ENABLED=false`.

---

## 3. Securite & Permissions — REALISE

### **Access Control** ✅
- `/api/login`, `/api/docs`, `GET /api/activities` : PUBLIC_ACCESS
- `/api/recommendations`, `/api/me` : ROLE_USER
- `/admin/*` : ROLE_ADMIN
- PATCH/DELETE user : owner or admin
- Commentaires : auteur uniquement (edit/delete)

### **Fonctionnalites securite additionnelles** ✅
- `UserActionThrottleService` : limitation d'abus (cache)
- `CommentContentSanitizer` : nettoyage XSS dans les commentaires
- Sanitization dans setters `User.alias`, `User.bio` (strip_tags)
- Politique de mot de passe (min 8 chars, majuscule, minuscule, chiffre, special)
- WebAuthn admin (entite `AdminWebauthnCredential`)
- CORS (NelmioCorsBundle)

---

## 4. Jeux de Donnees (Fixtures) — REALISE ✅

Fixtures de demonstration avec categories, utilisateurs et activites.

---

## 5. Tests — REALISE ✅

### Backend (PHPUnit)
- `RecommendationTest` : pipeline recommandations
- `ActivityRatingAggregateTest` : agregation notes
- `CommentContentSanitizerTest` : nettoyage XSS
- `UserActionThrottleServiceTest` : limitation d'abus
- `ThrottledActionExceptionTest` : exception throttle
- `ActivityImportResultTest` : import CSV

### Frontend (Jest)
- 12 fichiers de test couvrant : api, AuthService, errorHandling, imageUrl, jwt, hooks (useRecommendations, useDebounce, useFavorites, useSearchActivities, useActivities), context (InterestContext)

### CI/CD (GitHub Actions)
- Pipeline complete : lint, tests, coverage, PHPStan, build Docker prod
- Voir `docs/CI_CD_V2_2026.md` pour la documentation active

---

## 6. API Reference (etat actuel)

| Methode | Chemin | Role |
|---------|--------|------|
| POST | `/api/login` | JWT access token |
| POST | `/api/token/refresh` | Refresh token |
| GET | `/api/me` | Profil utilisateur courant |
| GET | `/api/recommendations` | Recommandations personnalisees (auth) |
| GET | `/api/activities`, `/api/activities/{id}` | Catalogue |
| GET/PUT/DELETE | `/api/activities/{id}/rating` | Notes (auth) |
| GET/POST | `/api/activities/{id}/comments` | Commentaires (auth pour POST) |
| PATCH/DELETE | `/api/comments/{id}` | Edition / masquage commentaire (auteur) |
| POST/DELETE | `/api/activities/{id}/favorite` | Favoris (auth) |
| POST | `/api/users/{id}/avatar` | Upload avatar (auth, owner) |

---

## Ressources

- [API Platform - StateProvider](https://api-platform.com/docs/core/state-providers/)
- [Symfony Security + JWT](https://symfony.com/doc/current/security.html)
- [EasyAdmin 4](https://symfony.com/doc/current/EasyAdminBundle/index.html)
- `planllm.md` : design complet LLM re-ranking
- `docs/CI_CD_V2_2026.md` : documentation CI/CD active
