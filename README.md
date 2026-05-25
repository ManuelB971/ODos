# ODOS

Application mobile de découverte d'activités locales, avec API Symfony et back-office admin.

- **Backend** — `odos-back/` : Symfony 7, API Platform, JWT, EasyAdmin (`/admin`)
- **Frontend** — `odos-front/` : Expo / React Native (Android, iOS, web)
- **Dépôt** — [github.com/ManuelB971/ODos](https://github.com/ManuelB971/ODos.git)

---

## Ce qui tourne aujourd'hui

### API & auth mobile

- Login JWT (`POST /api/login`), refresh token (`POST /api/token/refresh`), logout (`POST /api/logout`)
- Profil courant (`GET /api/me`), inscription publique, export et suppression de compte (RGPD)
- Tokens stockés côté mobile via SecureStore, renouvellement automatique sur 401
- Rate limiting login / inscription / commentaires / notes

### Métier

- Catalogue d'activités et catégories (API Platform)
- Favoris (`POST` / `DELETE` sur `/api/activities/{id}/favorite`)
- Recommandations personnalisées (`GET /api/recommendations`) — scoring + LLM local optionnel (Ollama)
- Commentaires sur les activités (liste, création, édition, suppression soft)
- Notes 1–5 étoiles avec moyenne agrégée
- Avatar utilisateur (upload / suppression)

### Admin (`/admin`)

- CRUD utilisateurs, catégories, activités, commentaires
- Import CSV d'activités + modèle téléchargeable
- Dashboard stats, page recommandations, export CSV des logs admin
- MFA obligatoire : TOTP, SMS OTP, WebAuthn
- Journal d'audit des actions sensibles
- Politique mot de passe (8 car., majuscule, chiffre, caractère spécial)

### App mobile

- Onglets : accueil, recherche, favoris, compte
- Carte MapLibre, détail activité (note, commentaires, favori)
- Choix des centres d'intérêt, paramètres, pages légales (CGU, confidentialité)
- Build APK via EAS (`pnpm build:apk:preview` / `build:apk:prod`)

### Infra & qualité

- Docker Compose (Postgres, Redis, Nginx, PHP ; LLM en profile optionnel)
- CI GitHub Actions : tests back (PHPUnit + PHPStan), lint + tests front, coverage sur `main`, build image prod
- Déploiement Contabo documenté ; stack Wazuh optionnelle pour les logs
- Docs RGPD, rétention, incident, prod — voir ci-dessous

---

## Documentation

Index complet : **[docs/README.md](docs/README.md)**

| Sujet | Fichier |
|-------|---------|
| Architecture & données | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| TODO badges & exploration | [docs/TODO_GAMIFICATION_BADGES.md](docs/TODO_GAMIFICATION_BADGES.md) |
| RGPD (audit + registre) | [docs/RGPD_AUDIT_2026.md](docs/RGPD_AUDIT_2026.md) · [docs/RGPD_registre.md](docs/RGPD_registre.md) |
| CI/CD | [docs/CI_CD_V2_2026.md](docs/CI_CD_V2_2026.md) |
| Déploiement Contabo | [docs/PROD_SANS_DOMAINE.md](docs/PROD_SANS_DOMAINE.md) |
| Rétention logs & cron | [docs/LOG_RETENTION.md](docs/LOG_RETENTION.md) |
| Violation de données | [docs/INCIDENT_RESPONSE.md](docs/INCIDENT_RESPONSE.md) |
| Tests front | voir `odos-front/` (Jest) et [PLAN-COUVERTURE-70.md](../deliverables/PLAN-COUVERTURE-70.md) |

---

## Prérequis

- Docker Desktop (Windows/Mac) ou Docker Engine + Compose v2
- Node.js 20+ et pnpm (ou npm) pour le front
- PHP 8.2+ et Composer si tu veux lancer le back sans Docker

---

## Démarrage rapide (Docker)

```bash
docker compose up -d --build
docker compose exec php composer install
docker compose exec php php bin/console lexik:jwt:generate-keypair --skip-if-exists
docker compose exec php php bin/console doctrine:migrations:migrate --no-interaction
docker compose exec php php bin/console app:ensure-admin admin@odos "CHANGE_ME" --promote-existing --set-password
```

Données de démo (optionnel) :

```bash
docker compose exec php php bin/console doctrine:fixtures:load --no-interaction
```

API : [http://localhost:8000](http://localhost:8000)  
Admin : [http://localhost:8000/admin](http://localhost:8000/admin) — login classique, puis MFA si activé

### Frontend

```bash
cd odos-front
pnpm install
pnpm start
```

Configurer l'URL de l'API dans `odos-front/.env` (voir `.env.example`). Sur un téléphone physique, mets l'IP de ta machine, pas `localhost`.

### Commandes Docker utiles

```bash
docker compose logs -f php          # logs PHP
docker compose exec php sh          # shell dans le conteneur
docker compose ps                   # état des services
docker compose down                 # arrêt (données conservées)
docker compose down -v              # arrêt + suppression volumes DB
```

---

## Lancer sans Docker

PostgreSQL et Redis doivent tourner en local. Dans `odos-back/.env.local`, pointer `DATABASE_URL` vers `127.0.0.1`.

```bash
cd odos-back
composer install
php bin/console doctrine:database:create
php bin/console doctrine:migrations:migrate
php bin/console app:ensure-admin admin@odos "CHANGE_ME" --promote-existing --set-password
symfony server:start
```

---

## Stack Wazuh (optionnel)

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml -f docker-compose.wazuh.yml up -d
```

Dashboard : [http://localhost:5601](http://localhost:5601) (sans login en dev).

Logs Symfony et Nginx indexés dans OpenSearch. Export des dashboards et règles :

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\export-siem.ps1
```

Sortie dans `deliverables/siem/`.

---

## Tests

### Backend

```bash
docker compose exec php composer test
docker compose exec -e XDEBUG_MODE=coverage php composer test:coverage
```

Rapport : `odos-back/var/coverage/html/index.html`

### Frontend

```bash
cd odos-front
pnpm test:ci
pnpm test:coverage
```

Rapport : `odos-front/coverage/lcov-report/index.html`

### Les deux d'un coup (Windows)

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-coverage.ps1
```

La CI tourne sur chaque PR et push `main`. Détails dans [docs/CI_CD_V2_2026.md](docs/CI_CD_V2_2026.md).

---

## Hébergement prod (Contabo)

Le VPS visé : Cloud VPS 30 (8 vCPU, 24 Go RAM, ~200 Go NVMe). Largement suffisant pour un MVP.

Points à ne pas oublier :

- Reverse proxy TLS (Nginx/Caddy + Let's Encrypt) — requis pour les stores
- Backups DB réguliers en plus des snapshots Contabo
- Cron de purge RGPD : `scripts/prod-cron-purge.sh` (voir [LOG_RETENTION.md](docs/LOG_RETENTION.md))
- Si Wazuh + LLM tournent en permanence sur la même machine, surveiller la RAM

Guide pas à pas : [docs/PROD_SANS_DOMAINE.md](docs/PROD_SANS_DOMAINE.md)

---

## Prochaines étapes

Le gros du code est en place. Ce qui reste surtout :

**Exploitation prod**

- Cron rétention + vérification CORS / secrets sur le VPS
- HTTPS avec un vrai nom de domaine (stores Play / App Store)
- Logrotate Nginx sur l'hôte

**Qualité**

- Monter la couverture de tests vers 70 % (`deliverables/PLAN-COUVERTURE-70.md`)
- Quelques warnings Jest front à nettoyer

**Juridique & conformité**

- Compléter mentions légales (SIRET, statut) dans `odos-front/app/legal.tsx`
- Nommer le responsable incident dans [INCIDENT_RESPONSE.md](docs/INCIDENT_RESPONSE.md)

Le détail des écarts RGPD et la feuille de route priorisée sont dans [docs/RGPD_AUDIT_2026.md](docs/RGPD_AUDIT_2026.md).

---

## Livrables encadrant

- Plan couverture : [deliverables/PLAN-COUVERTURE-70.md](deliverables/PLAN-COUVERTURE-70.md)
