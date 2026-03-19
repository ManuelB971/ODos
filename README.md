# ODOS — Back (Symfony/API Platform) & Front (Expo)

Ce dépôt contient :
- `odos-back/` : API Symfony + API Platform + JWT (LexikJWT) + EasyAdmin (`/admin`)
- `odos-front/` : application mobile Expo/React Native

## Objectif immédiat (demandé)

- **Authentification fonctionnelle**
  - Mobile/Front : login utilisateur via JWT
  - Back : endpoint `/api/login` (json_login) + endpoints protégés sous `/api`
- **Admin entièrement fonctionnel**
  - Admin originel : **`admin@odos`**
  - L’admin peut **créer** d’autres admins/utilisateurs via EasyAdmin (`/admin`)

## Démarrage rapide

### Backend (`odos-back/`)

Prérequis : PHP + Composer + DB configurée (voir `.env` du back).

1) Installer les dépendances

```bash
cd odos-back
composer install
```

2) Base de données (exemple)

```bash
php bin/console doctrine:database:create
php bin/console doctrine:migrations:migrate
```

3) Créer/assurer l’admin originel `admin@odos`

> Recommandé pour staging/prod (ne dépend pas des fixtures).

```bash
php bin/console app:ensure-admin admin@odos "CHANGE_ME" --promote-existing --set-password
```

4) (Option dev) Données de démo

```bash
php bin/console doctrine:fixtures:load
```

5) Lancer le serveur

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

> Selon ton réseau mobile, pense à configurer l’URL API (voir scripts/config front).

## Ce qui est déjà en place (constaté dans le code)

### Auth API
- `POST /api/login` : login JWT (email/password)
- `GET /api/me` : profil courant (protégé `ROLE_USER`)
- Règles d’accès dans `odos-back/config/packages/security.yaml`

### Admin
- EasyAdmin : `UserCrudController`, `CategoryCrudController`, `ActivityCrudController`
- Accès : `^/admin` → `ROLE_ADMIN`
- **Création/édition user avec mot de passe** : gérée dans `UserCrudController` (champ `plainPassword` hashé automatiquement)

## Liste des tâches restantes (priorisée)

### P0 — Auth “propre” côté mobile (à valider/terminer)
- **Stockage sécurisé du token** (SecureStore/Keychain) + gestion expiration
- **Gestion des erreurs auth** (401 → logout, refresh si prévu)
- **Écrans** : login/register UX (loading, erreurs, validations)
- **Déconnexion** : purge token + reset navigation

### P0 — Admin “complet” (qualité & sécurité)
- **Politique mot de passe** (min length, complexité, reset)
- **Création d’utilisateur** : vérifier contraintes (email unique) + messages d’erreur lisibles
- **Empêcher l’auto-démotion** (optionnel mais recommandé) : éviter qu’un admin retire `ROLE_ADMIN` à son propre compte
- **Audit** : logs des actions admin (création user, promotion admin, suppression)

### P1 — API métier (cohérence)
- **Favoris** : rendre l’endpoint idempotent (POST=add, DELETE=remove) au lieu d’un “toggle” unique (plus robuste côté mobile)
- **Pagination/filtres** : standardiser sur toutes les collections (activities, users admin, etc.)
- **Schémas d’erreurs** : format unique (message + code + détails validation)

### P1 — Sécurité & CORS
- **CORS** : supprimer `allow_origin: ['*']` en prod et s’appuyer sur `%env(CORS_ALLOW_ORIGIN)%`
- **Rate limiting** : `/api/login`, recherche, reco
- **Durées JWT** : définir stratégie (access token TTL, refresh token si requis)

### P1 — CI/CD
- Pipeline PR :
  - Back : lint + static analysis + tests
  - Front : lint + typecheck + tests
- Environnements : staging auto, prod avec approbation
- Secrets : CI secrets (JWT keys, DB URL, etc.)

### P2 — Qualité produit / UX
- Onboarding intérêts
- “Pourquoi recommandé ?”
- Offline/empty states
- Observabilité : Sentry front/back, logs structurés, métriques

## “À confirmer” (car le cahier des charges PDF n’est pas extractible ici)

Le PDF `Document/CahierdesChargesODOS.pdf` semble scanné (pas de texte extractible dans l’environnement).
Dès que tu peux fournir une version texte (ou un copier/coller des sections Auth/Admin), je recale :
- rôles exacts (admin vs super-admin ?)
- règles d’inscription (public/privé, validation email)
- exigences de sécurité (RGPD, consentement, logs)

