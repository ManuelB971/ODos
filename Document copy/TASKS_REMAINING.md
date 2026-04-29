# 📋 ODOS - Tâches Restantes pour MVP

## ✅ Complété
- [x] Symfony 7.4.5 configuré
- [x] PostgreSQL en Docker
- [x] JWT authentiication (private/public.pem générées)
- [x] EasyAdmin dashboard
- [x] API Platform
- [x] Fixtures de base

---

## 🔨 Backend Symfony (odos-back)

### Phase 1: Entities & Database
- [ ] Créer Entity `Category` (Catégorie d'intérêts)
  - `name` (string, 255, unique)
  - Group API Platform: `category:read`
  
- [ ] Créer Entity `User` 
  - Ajouter relation ManyToMany → `Category` (interests)
  - Configurer groupes API Platform: `user:read`, `user:write`
  - Masquer password en lecture
  - **Attention**: Seul le propriétaire/admin peut voir profil complet

- [ ] Créer Entity `Activity`
  - Fields: `name`, `description`, `latitude`, `longitude`, `city`
  - ManyToOne → `Category`
  - Groupes API: `activity:read`, `activity:write`

- [ ] Ajouter migrations et exécuter
  ```bash
  php bin/console make:migration
  php bin/console doctrine:migrations:migrate
  ```

### Phase 2: Logique Métier
- [ ] Créer `StateProvider` pour recommandations
  - Chemin: `src/State/RecommendationStateProvider.php`
  - Endpoint: `GET /api/recommendations`
  - Logique: Match activity.category avec user.interests
  
- [ ] Configurer Activity Entity avec StateProvider
  ```php
  #[ApiResource(provider: RecommendationStateProvider::class)]
  ```

- [ ] Tester endpoint `/api/recommendations`

### Phase 3: Sécurité & Validation
- [ ] Protéger endpoints avec Access Control (JWT)
  - `GET /api/categories` → PUBLIC_ACCESS
  - `GET /api/activities` → PUBLIC_ACCESS  
  - `PATCH /api/users/{id}` → ROLE_USER (propriétaire seulement)
  - `POST /api/recommendations` → ROLE_USER
  - `/admin/*` → ROLE_ADMIN

- [ ] Ajouter validation Symfony (groups avec JWT)

- [ ] Configurer CORS pour odos-front
  ```yaml
  # .env
  CORS_ALLOW_ORIGIN='^https?://(localhost|127\.0\.0\.1):(3000|8081|5173)'
  ```

### Phase 4: EasyAdmin
- [ ] Configurer CrudController pour `User`, `Activity`, `Category`
- [ ] Ajouter filtres et recherche en admin
- [ ] Tester dashboard: http://localhost:8000/admin

---

## 📱 Frontend React Native (odos-front)

### Phase 1: Authentification
- [ ] Intégrer login JWT
  - POST `/api/login` → récupérer token
  - Stocker token dans `AuthContext`
  - Ajouter token dans headers Authorization

- [ ] Protéger navigations avec `useAuth()` hook

### Phase 2: Écrans Principaux
- [ ] Screen `activities` - Liste les activités
- [ ] Screen `login` - Connexion JWT
- [ ] Screen `interests` - Sélectionner ses catégories (interests)
- [ ] Screen `account` - Profil utilisateur (déjà partiellement fait)

### Phase 3: Recommandations
- [ ] Hook `useRecommendations()` (déjà présent?)
  - Appeler `GET /api/recommendations`
  - Passer Authorization header avec JWT
  
- [ ] Component `RecommendedActivities` - Afficher les recommandations

### Phase 4: ML (Optionnel pour MVP)
- [ ] Vérifier modèle ML dans `ml/recommendationModel.ts`
- [ ] Tester logique de recommandation frontend vs backend

---

## 🐳 Docker & Déploiement

### Development
- [ ] Ajouter service `app` en docker-compose (optionnel, PHP local ok)
- [ ] Vérifier compose.yaml pour prod ready

### Tests
- [ ] Tests unitaires JWT (PHPUnit)
- [ ] Tests API Platform
- [ ] Tests React Native (Detox ou Expo Testing)

---

## 📝 Checklist de Test

### API JWT
- [ ] `POST /api/login` → Status 200 + token (✅ Confirmé)
- [ ] `GET /api/recommendations` + Authorization Bearer → Status 200
- [ ] `PATCH /api/users/{id}` (propriétaire) → Status 200
- [ ] `DELETE /api/users/{id}` (non propriétaire) → Status 403

### Admin
- [ ] Dashboard accessible: http://localhost:8000/admin
- [ ] CRUD User/Activity/Category fonctionnel
- [ ] Logout fonctionne

### Frontend
- [ ] Login/Logout fonctionne
- [ ] Token persiste après refresh
- [ ] Appels API passent le JWT header
- [ ] Recommandations s'affichent

---

## 📅 Priorité (MVP)

**Priority 1 - CRITIQUE** (Cette semaine)
1. User.interests → Category relation
2. Activity.name, description, latitude, longitude
3. RecommendationStateProvider
4. Tester endpoint `/api/recommendations`

**Priority 2 - IMPORTANT** (Prochaine semaine)
5. Frontend integration (login, interests, recommendations)
6. CORS + Security
7. EasyAdmin CRUD

**Priority 3 - NICE TO HAVE** (Après MVP)
8. Tests unitaires
9. ML backend vs frontend
10. Déploiement prod

---

## 🔗 Ressources / Docs

- [API Platform - StateProvider](https://api-platform.com/docs/core/state-providers/)
- [Symfony Security + JWT](https://symfony.com/doc/current/security.html)
- [EasyAdmin 4](https://symfony.com/doc/current/EasyAdminBundle/index.html)
- [React Native HTTP Headers](https://reactnative.dev/docs/network)

---

**Dernière MAJ**: 17 Février 2026 - JWT ✅, MVP Planning ✅
