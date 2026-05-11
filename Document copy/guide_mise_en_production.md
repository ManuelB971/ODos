# Guide de Mise en Production — ODOS

> **Stack :** Symfony 7.4 (API Platform + Lexik JWT) · React Native / Expo · PostgreSQL · Redis · Ollama (LLM optionnel)  
> **Hebergement cible :** Contabo Cloud VPS (8 vCPU, 24 GB RAM, 200 GB NVMe)  
> **Mis a jour :** avril 2026

---

## Phase 1 — Backend (Symfony + Docker)

### Etape 1 : Hebergement

| Hebergeur | Prix | Simplicite | Recommande si |
|---|---|---|---|
| **Contabo VPS** (choisi) | ~15-20 EUR/mois | Technique | Controle total, bonne RAM, rapport perf/prix |
| Railway.app | ~5 EUR/mois | Tres simple | Prototype rapide |
| Render.com | Gratuit limite / ~7 EUR | Simple | MVP, projet perso |

> **Configuration actuelle :** Contabo Cloud VPS 30 — 8 vCPU, 24 GB RAM, 200 GB NVMe, 600 Mbit/s.  
> Voir `README.md` (racine) pour l'evaluation complete de cette config.

---

### Etape 2 : Variables d'environnement sur le serveur

Ne jamais commiter le `.env` avec de vraies valeurs. Configurer ces variables dans le fichier `.env.local` sur le VPS (ou via secrets Docker) :

```dotenv
APP_ENV=prod
APP_SECRET=<chaine_aleatoire_32_chars>
DATABASE_URL=postgresql://odos_user:password@db:5432/odos_prod?serverVersion=16&charset=utf8
DEFAULT_URI=https://api.odos.com
REDIS_URL=redis://redis:6379
JWT_SECRET_KEY=%kernel.project_dir%/config/jwt/private.pem
JWT_PUBLIC_KEY=%kernel.project_dir%/config/jwt/public.pem
JWT_PASSPHRASE=<passphrase_securisee>
CORS_ALLOW_ORIGIN='^https?://(localhost|127\.0\.0\.1):(3000|8081|5173)|https://odos\.com$'

# LLM (optionnel — desactivable)
LLM_ENABLED=true
LLM_PROVIDER=ollama
LLM_BASE_URL=http://llm:11434
LLM_MODEL=mistral
LLM_TIMEOUT_MS=3000
LLM_TOP_K=15
LLM_CANDIDATE_MAX=50
```

> Verifier que `config/jwt/private.pem` et `public.pem` sont dans le `.gitignore` !

---

### Etape 3 : Generer les cles JWT sur le serveur

A faire UNE FOIS sur le serveur :

```bash
docker compose exec php php bin/console lexik:jwt:generate-keypair
```

---

### Etape 4 : Deploiement Docker (production)

Le projet utilise Docker Compose. Sur le VPS Contabo :

```bash
# Cloner le repo
git clone git@github.com:<org>/ODos.git && cd ODos

# Copier la config prod
cp .env.local.example .env.local   # adapter les valeurs

# Lancer la stack prod
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Executer les migrations
docker compose exec php php bin/console doctrine:migrations:migrate --no-interaction

# Vider le cache prod
docker compose exec php php bin/console cache:clear --env=prod

# Creer l'admin initial (si premiere fois)
docker compose exec php php bin/console app:ensure-admin
```

### Stack Docker (prod)

```
php (Symfony API) ─── nginx (reverse proxy interne)
       │                       │
       ├── db (PostgreSQL 16)  │
       ├── redis (cache)       │
       └── llm (Ollama, optionnel)
                               │
                    Caddy / Nginx (TLS) ← Internet
```

---

### Etape 5 : Activer HTTPS / TLS

> **Obligatoire** pour proteger les tokens JWT en transit.

Installer un reverse proxy TLS devant Nginx :

**Option A — Caddy (recommande, plus simple) :**
```bash
# Caddyfile minimal
api.odos.com {
    reverse_proxy localhost:8000
}
```

**Option B — Nginx + Certbot :**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.odos.com
```

---

### Etape 6 : Backup & maintenance

```bash
# Dump PostgreSQL quotidien (cron)
docker compose exec db pg_dump -U odos_user odos_prod > backup_$(date +%Y%m%d).sql

# Retention : garder 7 jours localement + copie hebdo hors VPS (S3, FTP, etc.)
```

---

## Phase 2 — Frontend (Expo)

### Etape 7 : Installer EAS CLI et se connecter

```bash
npm install -g eas-cli
eas login
eas build:configure
```

---

### Etape 8 : Configurer les variables d'environnement

Creer un fichier `.env.production` a la racine de `odos-front` :

```dotenv
EXPO_PUBLIC_API_URL=https://api.odos.com
```

> Cette valeur est **figee au moment du build**. Si l'URL du back change, il faut rebuilder l'app.

---

### Etape 9 : Builder l'application mobile

```bash
# Android (APK ou AAB pour le Play Store)
eas build --platform android --profile production

# iOS (necessite un compte Apple Developer = 99 $/an)
eas build --platform ios --profile production
```

---

### Etape 10 : (Optionnel) Deployer la version Web

```bash
npx expo export --platform web
```

| Hebergeur web | Prix | Commande |
|---|---|---|
| Vercel | Gratuit | `npx vercel deploy` |
| Netlify | Gratuit | glisser/deposer le dossier `dist/` |
| GitHub Pages | Gratuit | via GitHub Actions |

---

## Phase 3 — Checklist pre-lancement

### Backend
- [ ] `APP_ENV=prod` configure
- [ ] **HTTPS** active (certificat valide)
- [ ] Migrations executees sans erreur
- [ ] Pas de fixtures/donnees de test en prod
- [ ] Cles JWT generees et hors Git
- [ ] `CORS_ALLOW_ORIGIN` limite a l'URL du Front
- [ ] Logs configures (Monolog -> fichier ou service externe)
- [ ] Endpoint `/api/login` repond en HTTPS
- [ ] `LLM_ENABLED` ajuste (true si Ollama tourne, false sinon)
- [ ] Backup DB automatise (cron)
- [ ] Monitoring LLM (latence, taux fallback)

### Frontend
- [ ] `EXPO_PUBLIC_API_URL` pointe vers `https://api.odos.com`
- [ ] Build EAS cree avec le profil `production`
- [ ] Aucun `console.log` de debug sensible
- [ ] Icone de l'app configuree (`app.json` -> `icon`)
- [ ] Ecran de demarrage (splash screen) configure
- [ ] APK teste sur un vrai appareil Android

---

## Ordre d'execution recommande

```
1.  Provisionner le VPS Contabo + configurer Docker
2.  Deployer la stack Docker (docker-compose.prod.yml)
3.  Generer les cles JWT sur le serveur
4.  Configurer le reverse proxy TLS (Caddy ou Nginx + Certbot)
5.  Lancer les migrations Doctrine
6.  Verifier que https://api.odos.com/api/login repond (code 401 = OK)
7.  Mettre en place le backup DB automatise
8.  Creer .env.production cote Expo avec la bonne URL HTTPS
9.  Builder l'app avec EAS (Android en premier)
10. Tester l'APK sur un vrai telephone
11. (Optionnel) Deployer la version Web sur Vercel/Netlify
12. (Optionnel) Soumettre sur Google Play / App Store
```

---

## CI/CD

Le deploiement peut etre automatise via GitHub Actions (voir `docs/CI_CD_V2_2026.md`).

Le workflow actuel (`.github/workflows/ci.yml`) inclut :
- Tests backend (PHPUnit) + analyse statique (PHPStan)
- Tests frontend (ESLint + Jest)
- Build image Docker prod
- Deploiement SSH vers le VPS (a configurer avec les secrets GitHub)

---

## Ressources

- [Documentation EAS Build](https://docs.expo.dev/build/introduction/)
- [Documentation Lexik JWT Bundle](https://github.com/lexik/LexikJWTAuthenticationBundle)
- [Caddy — reverse proxy TLS automatique](https://caddyserver.com/)
- [Certbot — HTTPS gratuit avec Let's Encrypt](https://certbot.eff.org/)
- `docs/CI_CD_V2_2026.md` : documentation CI/CD active
