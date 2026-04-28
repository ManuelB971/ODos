# CI/CD ODOS — version 1 (gratuit, apprentissage)

Ce document décrit une **première chaîne** concrète pour le monorepo **ODOS** :

- Backend : `odos-back` (Symfony 7, PHP 8.2, Docker avec cible `prod`).
- Frontend : `odos-front` (Expo / React Native, `pnpm`).
- En local : Docker Compose (PostgreSQL, Redis, Nginx, Ollama).

**Objectif v1** : CI fiable sur GitHub (0 € sur dépôt public dans les quotas Actions) + option de déploiement backend « démo » sur une offre gratuite limitée. Vous affinerez ensuite (staging, scans, EAS, etc.).

---

## 1. Principes (architecture v1)

| Couche | Rôle v1 | Où |
|--------|-----------|-----|
| **CI** | Vérifier à chaque PR / push sur `main` que backend et frontend passent (install, validate, lint, tests). | GitHub Actions |
| **CD** | Déployer l’API (optionnel au début : manuel depuis le dashboard hébergeur). | Render, Fly.io, Railway, ou VPS |
| **Secrets** | Jamais dans le code ; uniquement GitHub **Secrets** et variables du PaaS. | GitHub + plateforme |

**Contrainte importante** : en production gratuite type PaaS, **Ollama n’est en général pas disponible** comme en Docker local. Prévoir `LLM_ENABLED=false` ou un fournisseur LLM externe plus tard ; sinon le déploiement reste pédagogique mais pas fidèle au stack LLM local.

---

## 2. Prérequis côté vous

1. Compte [GitHub](https://github.com).
2. Dépôt Git contenant **à la racine** les dossiers `odos-back/` et `odos-front/` (structure actuelle du projet).
3. Branche de référence **`main`** (adapter les noms de branches dans les workflows si vous utilisez `master`).

---

## 3. Étape A — Ajouter le CI (GitHub Actions)

### 3.1 Fichier à créer

Créez le fichier :

`.github/workflows/ci.yml`

### 3.2 Contenu proposé (copier-coller)

Ce workflow :

- Lance **PostgreSQL 16** en service (même famille que `docker-compose.yml`) pour que `composer install` / scripts Symfony qui touchent à la config Doctrine ne cassent pas si la base est attendue.
- Exécute **`composer test`** (défini dans `odos-back/composer.json`, PHPUnit avec `phpunit.dist.xml`).
- Sur le front : **`pnpm install --frozen-lockfile`**, **`pnpm run lint`**, **`pnpm run test:ci`**.

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  backend:
    name: Backend (Symfony)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: odos-back

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: odos
          POSTGRES_PASSWORD: odos_secret
          POSTGRES_DB: odos_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U odos -d odos_test"
          --health-interval 4s
          --health-timeout 5s
          --health-retries 12

    env:
      APP_ENV: test
      # Valeur factice pour la CI uniquement (32+ caractères pour Symfony)
      APP_SECRET: bbc627d631954aad172eee3adf08a5ced109b607837efa24c8d9219665819278
      DATABASE_URL: postgresql://odos:odos_secret@127.0.0.1:5432/odos_test?serverVersion=16&charset=utf8

    steps:
      - uses: actions/checkout@v4

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: "8.2"
          extensions: intl, pdo_pgsql, zip
          coverage: none

      - name: Install Composer dependencies
        run: composer install --prefer-dist --no-progress

      - name: Validate composer.json
        run: composer validate --no-check-publish

      - name: Run PHPUnit
        run: composer test

  frontend:
    name: Frontend (Expo)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: odos-front

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: pnpm
          cache-dependency-path: odos-front/pnpm-lock.yaml

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm run lint

      - name: Tests
        run: pnpm run test:ci

  docker-backend-prod:
    name: Docker build (backend prod)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build PHP-FPM prod image
        run: docker build --target prod -t odos-back:ci ./odos-back
```

### 3.3 Après le premier push

1. Allez dans l’onglet **Actions** du dépôt GitHub.
2. Ouvrez le dernier run : corrigez les erreurs jusqu’à **tout vert**.
3. Si un jour vous ajoutez des tests **Kernel** / **WebTestCase** qui exigent un schéma à jour, ajoutez une étape avant les tests, par exemple :

   `php bin/console doctrine:migrations:migrate --no-interaction --env=test`

   (uniquement si votre config `test` pointe vers la même base `odos_test` et que les migrations sont idempotentes pour la CI).

### 3.4 (Option v1.1) Vérification stricte Composer

Dans le job backend, vous pouvez remplacer ou compléter par :

`composer validate --strict --no-check-publish`

---

## 4. Étape B — Déploiement backend « gratuit » (CD minimal)

Deux approches raisonnables pour **apprendre** sans vous noyer :

### Option 1 — La plus simple : Render

1. Créez un compte sur [Render](https://render.com).
2. Créez une **PostgreSQL** gratuite (notez l’URL interne / `DATABASE_URL` fournie).
3. Créez un **Web Service** :
   - Source : connecter le dépôt GitHub, branche `main`, racine ou sous-dossier selon ce que Render propose (si le build part de la racine, utilisez un `Dockerfile` à la racine qui délègue à `odos-back`, ou indiquez le contexte de build si l’UI le permet).
   - Build : image Docker basée sur votre `odos-back/Dockerfile` cible **`prod`**, **plus** un reverse proxy (Nginx) si votre image actuelle n’expose que PHP-FPM — en v1, beaucoup d’équipes utilisent une **image unique** « php + nginx » ou le **Dockerfile** fourni par Symfony/Render ; adaptez à votre image réelle.
4. Variables d’environnement minimales (à ajuster selon votre code) :

   | Variable | Exemple / remarque |
   |----------|-------------------|
   | `APP_ENV` | `prod` |
   | `APP_SECRET` | Générez une chaîne longue et unique (ex. `openssl rand -hex 32`) |
   | `DATABASE_URL` | Fournie par Render PostgreSQL |
   | `REDIS_URL` | URL d’un Redis managé ou service Render Redis si vous en ajoutez un |
   | `LLM_ENABLED` | `false` en v1 gratuite si vous n’avez pas d’Ollama |
   | JWT / OAuth / Twilio | Renseigner selon `odos-back/.env.example` et la doc des bundles |

5. **Commande de release** (ou script au démarrage du conteneur) : exécuter les migrations une fois le conteneur prêt :

   `php bin/console doctrine:migrations:migrate --no-interaction`

6. Déclenchez un **déploiement manuel** ; vérifiez les logs jusqu’à HTTP 200 sur une route publique (ex. health ou `/api` selon votre config).

**Limite** : offre gratuite souvent avec **sommeil** après inactivité ; acceptable pour l’apprentissage.

### Option 2 — Plus « Docker natif » : Fly.io

1. Installez la CLI [Fly](https://fly.io/docs/hands-on/install-flyctl/).
2. `fly launch` dans un dossier où vous avez un `fly.toml` et un Dockerfile adaptés (souvent un Dockerfile par service).
3. Attachez une base Postgres Fly (ou externe) et injectez `DATABASE_URL` via `fly secrets set`.

Utile si vous voulez vous rapprocher d’un modèle **conteneur + CLI** pour la suite du CD.

---

## 5. Secrets et variables (récap)

### GitHub (CI)

| Nom | Usage |
|-----|--------|
| *(aucun obligatoire pour le `ci.yml` ci-dessus)* | `APP_SECRET` et `DATABASE_URL` sont injectés en dur pour l’environnement test CI uniquement |

Quand vous ajouterez publication d’image, déploiement SSH, ou appels API Render/Fly depuis Actions, vous utiliserez par ex. `RENDER_API_KEY`, `FLY_API_TOKEN`, stockés dans **Settings → Secrets and variables → Actions**.

### Hébergeur (CD)

Tout ce qui est sensible : `APP_SECRET`, `DATABASE_URL`, clés JWT, OAuth GitHub, Twilio, etc. — **uniquement** dans l’UI du PaaS ou `fly secrets`.

---

## 6. Frontend Expo (`odos-front`)

- **CI** : déjà couvert par `pnpm run lint` et `pnpm run test:ci` dans le workflow ci-dessus.
- **« Production » mobile** : en général **EAS Build** (Expo) + soumission App Store / Play Store ; ce n’est pas le même pipeline que le serveur Symfony.
- **v1** : gardez les builds EAS **manuels** (`eas build`) tant que le CI front est vert ; automatisez EAS dans Actions en **v2** si besoin.

---

## 7. Checklist « première fois »

- [ ] Dépôt sur GitHub, code sur `main`.
- [ ] Fichier `.github/workflows/ci.yml` ajouté (contenu section 3.2).
- [ ] Premier run Actions **vert**.
- [ ] Compte Render (ou Fly) + base PostgreSQL.
- [ ] Service web avec variables d’environnement + migrations.
- [ ] `LLM_ENABLED=false` (ou stratégie LLM cloud) tant qu’Ollama n’est pas hébergé.
- [ ] Noter ce qui a coincidé (ports, Nginx, Dockerfile) pour la **v2** (staging, preview PR, cache Actions, Dependabot).

---

## 8. Évolutions naturelles (après la v1)

- **Cache** Composer / pnpm dans Actions (déjà partiellement via `cache: pnpm`).
- **Environnement staging** + promotion vers prod.
- **Dependabot** + revue obligatoire sur PR.
- **Scan** (Symfony Security Checker, `npm audit`, etc.).
- **Déploiement automatique** sur `main` via webhook ou job `deploy` avec secrets.

---

*Document aligné sur la structure du dépôt ODOS (Symfony `composer test`, Expo `pnpm`, Docker `prod` dans `odos-back/Dockerfile`). Mettez à jour ce fichier quand vous changerez de branche par défaut, de manager de paquets, ou d’hébergeur.*
