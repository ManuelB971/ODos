# ODOS — Back (Symfony/API Platform) & Front (Expo)

[https://github.com/ManuelB971/ODos.git](https://github.com/ManuelB971/ODos.git)
Ce dépôt contient :

- `odos-back/` : API Symfony + API Platform + JWT (LexikJWT) + EasyAdmin (`/admin`)
- `odos-front/` : application mobile Expo/React Native

## Prérequis

- Docker Desktop (Windows/Mac) ou Docker Engine + Compose v2
- Node.js 20+ (pour lancer les tests front hors conteneur)
- pnpm (optionnel, sinon npm)
- (Optionnel) PHP 8.2+ + Composer pour exécution locale sans Docker

## Objectif immédiat (demandé)

- **Authentification fonctionnelle**
  - Mobile/Front : login utilisateur via JWT
  - Back : endpoint `/api/login` (json_login) + endpoints protégés sous `/api`
- **Admin entièrement fonctionnel**
  - Admin originel : `**admin@odos`**
  - L'admin peut **créer** d'autres admins/utilisateurs via EasyAdmin (`/admin`)

## Démarrage rapide

### Option A — Docker (recommandé)

Prérequis : Docker Desktop installé et lancé.

```bash
# 1. Construire et démarrer les conteneurs
docker compose up -d --build

# 2. Installer les dépendances PHP
docker compose exec php composer install

# 3. Générer les clés JWT (première fois uniquement)
docker compose exec php php bin/console lexik:jwt:generate-keypair --skip-if-exists

# 4. Créer/migrer la base de données
docker compose exec php php bin/console doctrine:migrations:migrate --no-interaction

# 5. Créer l'admin originel
docker compose exec php php bin/console app:ensure-admin admin@odos "CHANGE_ME" --promote-existing --set-password

# 6. (Optionnel) Charger les données de démo
docker compose exec php php bin/console doctrine:fixtures:load --no-interaction
```

Backend accessible sur **[http://localhost:8000](http://localhost:8000)**

### Stack complète en une commande (ODOS + SIEM)

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml -f docker-compose.wazuh.yml up -d
```

### Option C — Ajouter Wazuh (SIEM)

Si tu veux activer Wazuh en local avec Docker :

```bash
# Démarrer la stack ODOS + Wazuh
docker compose -f docker-compose.yml -f docker-compose.override.yml -f docker-compose.wazuh.yml up -d

# Vérifier que les services Wazuh sont bien up
docker compose -f docker-compose.yml -f docker-compose.override.yml -f docker-compose.wazuh.yml ps
```

Accès Wazuh Dashboard : **[http://localhost:5601](http://localhost:5601)**
En mode local actuel (dev), l'accès se fait **sans login**.

Ports exposés :

- `5601` (Dashboard)
- `55000` (API Wazuh manager)
- `1514/udp`, `1515` (agents Wazuh)
- `9200` (Indexer)

Logs applicatifs envoyés vers Filebeat/Indexer :

- Symfony (`odos-back/var/log/*.log`) -> index `odos-logs-symfony-`*
- Nginx (`/var/log/nginx/odos_access.log`, `/var/log/nginx/odos_error.log`) -> index `odos-logs-nginx-*`

Pour arrêter Wazuh (et garder le reste du projet) :

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml -f docker-compose.wazuh.yml stop wazuh.indexer wazuh.manager wazuh.dashboard
```

## Configuration

### Variables d'environnement

- Back: utiliser `odos-back/.env` et `odos-back/.env.local` selon l'environnement.
- Front: utiliser `odos-front/.env` (ex: URL d'API).

### Endpoints principaux

- API Back: `http://localhost:8000`
- Wazuh Dashboard: `http://localhost:5601`
- Wazuh API Manager: `https://localhost:55000`

### Logs applicatifs vers SIEM

- Symfony logs: `odos-back/var/log/*.log`
- Nginx access/error: `/var/log/nginx/odos_access.log` et `/var/log/nginx/odos_error.log`
- Indices créés:
  - `odos-logs-symfony-*`
  - `odos-logs-nginx-access-*`
  - `odos-logs-nginx-error-*`

#### Commandes utiles Docker

```bash
# Voir les logs en temps réel
docker compose logs -f

# Logs d'un service précis
docker compose logs -f php

# Shell dans le conteneur PHP
docker compose exec php sh

# Status des services
docker compose ps

# Arrêter les conteneurs (conserve les données)
docker compose down

# Arrêter ET supprimer les données DB (attention !)
docker compose down -v

# Reconstruire après modification du Dockerfile
docker compose up -d --build
```

### Option B — Local (sans Docker)

Prérequis : PHP 8.2+ + Composer + PostgreSQL configurée.

> Utiliser `DATABASE_URL` vers `127.0.0.1` dans `.env.local` (voir `.env.example`).

1. Installer les dépendances

```bash
cd odos-back
composer install
```

1. Base de données

```bash
php bin/console doctrine:database:create
php bin/console doctrine:migrations:migrate
```

1. Créer/assurer l'admin originel `admin@odos`

```bash
php bin/console app:ensure-admin admin@odos "CHANGE_ME" --promote-existing --set-password
```

1. (Option dev) Données de démo

```bash
php bin/console doctrine:fixtures:load
```

1. Lancer le serveur

```bash
symfony server:start
```

#### Accès admin

- URL : `/admin`
- Login : via `/login` (form_login), puis redirection vers `/admin`

### Frontend (`odos-front/`)

```bash
cd odos-front
pnpm install
pnpm start
```

> Selon ton réseau mobile, pense à configurer l'URL API (voir scripts/config front).

## Tests automatisés et couverture

### Backend (PHPUnit)

```bash
# tests
docker compose exec php composer test

# couverture (xdebug activé uniquement pour cette commande)
docker compose exec -e XDEBUG_MODE=coverage php composer test:coverage
```

Rapports générés:

- HTML: `odos-back/var/coverage/html/index.html`
- Clover XML: `odos-back/var/coverage/clover.xml`

### Frontend (Jest)

```bash
cd odos-front

# tests
pnpm test:ci

# couverture
pnpm test:coverage
```

Rapports générés:

- HTML: `odos-front/coverage/lcov-report/index.html`
- LCOV: `odos-front/coverage/lcov.info`

### Exécution coverage en une commande

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-coverage.ps1
```

## Export SIEM (dashboards, règles, alertes)

Commande:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\export-siem.ps1
```

Sortie:

- `deliverables/siem/saved-objects-<timestamp>.ndjson`
- `deliverables/siem/wazuh-apis-<timestamp>.json`
- `deliverables/siem/local_rules-<timestamp>.xml`
- `deliverables/siem/local_decoder-<timestamp>.xml`

## Checklist de remise

- Fichier prêt: `deliverables/CHECKLIST-ENCADRANT.md`
- Utiliser cette checklist avant envoi du dépôt à l'encadrant.

## Ce qui est déjà en place (constaté dans le code)

### Auth API

- `POST /api/login` : login JWT (email/password)
- `GET /api/me` : profil courant (protégé `ROLE_USER`)
- Règles d'accès dans `odos-back/config/packages/security.yaml`

### Admin

- EasyAdmin : `UserCrudController`, `CategoryCrudController`, `ActivityCrudController`
- Accès : `^/admin` → `ROLE_ADMIN`
- **Création/édition user avec mot de passe** : gérée dans `UserCrudController` (champ `plainPassword` hashé automatiquement)

## Liste des tâches restantes (mise à jour)

### P0 — Couverture de tests vers 70%

- **Etat actuel** : run tests vert (back/front) et rapports coverage générés.
- **Reste à faire** : augmenter la couverture (actuellement basse) pour atteindre `>= 70%`.
- **Plan** : appliquer `deliverables/PLAN-COUVERTURE-70.md` par lots (utils/hooks/services puis intégration API).

### P0 — Stabilisation qualité test

- **Frontend** : nettoyer les warnings de test (`react-test-renderer` / `act(...)`) et fiabiliser l'environnement Jest.
- **Backend** : étendre les tests métier (auth, recommandations, erreurs API) pour réduire le risque de régression.

### P1 — Auth mobile "propre"

- **Token** : finaliser cycle complet SecureStore/expiration/invalidations.
- **Gestion 401** : logout automatique + reset navigation cohérent.
- **UX auth** : états loading/erreurs/validation sur login/register.

### P1 — Admin et sécurité applicative

- **Politique mot de passe** : règles minimales + messages explicites.
- **Admin safety** : empêcher l'auto-démotion d'un admin.
- **Audit** : journaliser les actions admin sensibles (création/promotion/suppression).

### P1 — API métier et hardening

- **Favoris** : confirmer API idempotente (`POST add`, `DELETE remove`) côté front.
- **Standard erreurs** : harmoniser format (`message`, `code`, `details`) sur tous endpoints.
- **Commentaires utilisateurs** : ajouter CRUD commentaires sur activités (avec modération minimale).
- **Notation activités** : ajouter note utilisateur de `1` à `5` étoiles + agrégat (moyenne + nombre de votes).
- **Sécurité** : durcir CORS prod, ajouter rate limiting, clarifier stratégie JWT.

### P1 — CI/CD

- Pipeline PR:
  - Back : lint + analyse statique + tests + coverage gate
  - Front : lint + typecheck + tests + coverage gate
- Publication artifacts coverage + livrables SIEM dans CI.

### P2 — Produit / observabilité

- Onboarding intérêts, offline states, explication des recommandations.
- Observabilité applicative: Sentry front/back + logs structurés + métriques.

## Plan technique — futures features (commentaires + notation)

### 1) Commentaires utilisateurs sur activité

#### Modèle de données (Back / DB)

- Nouvelle entité `Comment`:
  - `id` (PK)
  - `content` (TEXT, min 2, max 1000)
  - `createdAt`, `updatedAt`
  - `isEdited` (bool)
  - `isHidden` (bool, modération simple)
  - relation `ManyToOne` vers `User` (auteur)
  - relation `ManyToOne` vers `Activity`
- Index recommandés:
  - `(activity_id, created_at DESC)`
  - `(user_id, created_at DESC)`

#### Endpoints API (proposition)

- `GET /api/activities/{id}/comments` (public, paginé)
- `POST /api/activities/{id}/comments` (ROLE_USER)
- `PATCH /api/comments/{id}` (auteur ou admin)
- `DELETE /api/comments/{id}` (auteur ou admin, soft-delete via `isHidden=true`)
- Réponse standard:
  - `id`, `content`, `createdAt`, `updatedAt`, `isEdited`
  - `author` minimal (`id`, `displayName`)
  - `activityId`

#### Règles métier

- 1 utilisateur peut poster plusieurs commentaires par activité.
- Edition autorisée uniquement à l’auteur (ou admin).
- Suppression: soft-delete pour conserver la traçabilité.
- Affichage public: exclure `isHidden=true` pour les non-admin.

### 2) Notation activité (1 à 5 étoiles)

#### Modèle de données (Back / DB)

- Nouvelle entité `ActivityRating`:
  - `id` (PK)
  - `score` (int, 1..5)
  - `createdAt`, `updatedAt`
  - relation `ManyToOne` vers `User`
  - relation `ManyToOne` vers `Activity`
- Contrainte d’unicité:
  - `UNIQUE(user_id, activity_id)` (1 note max par utilisateur et activité)
- Champs agrégés dans `Activity`:
  - `ratingAverage` (decimal/float)
  - `ratingCount` (int)

#### Endpoints API (proposition)

- `GET /api/activities/{id}/rating` (public)
  - `{ average, count, userScore? }`
- `PUT /api/activities/{id}/rating` (ROLE_USER)
  - crée ou met à jour la note utilisateur
- `DELETE /api/activities/{id}/rating` (ROLE_USER)
  - retire la note utilisateur

#### Règles métier

- Validation stricte `score in [1..5]`.
- Recalcul agrégat (`average`, `count`) transactionnel après create/update/delete.
- Anti-abus minimal:
  - throttling léger sur `PUT/DELETE rating` par utilisateur.

### 3) Ecrans Front (Expo)

- Détail activité (`app/activity/[id].tsx`):
  - bloc “Note moyenne” (étoiles + nombre d’avis)
  - widget de note utilisateur (1..5)
  - section commentaires (liste paginée + formulaire)
- Actions UX:
  - optimistic update pour note/commentaire
  - rollback en cas d’erreur API
  - états loading/empty/error

### 4) Sécurité et modération (minimum viable)

- Sanitization server-side du texte commentaire.
- Limitation de longueur et fréquence de post.
- Journalisation d’actions sensibles:
  - suppression/masquage commentaire
  - modification de note

### 5) Tests à prévoir

- Back unit:
  - validation score 1..5
  - unicité `(user, activity)`
  - recalcul correct des agrégats
- Back integration:
  - permissions auteur/admin sur commentaires
  - workflow note (create/update/delete)
- Front:
  - rendu étoiles + calcul affichage
  - ajout/édition/suppression commentaire (UI + erreurs)

