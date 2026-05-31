# API en production — `api.odos-api.com`

Guide pour exposer le backend Symfony (VPS Contabo) sur le sous-domaine **`api.odos-api.com`** en HTTPS.

Liens : [prod sans domaine](PROD_SANS_DOMAINE.md) · [landing `odos.world`](PROD_SANS_DOMAINE.md) · [CI/CD](CI_CD_V2_2026.md)

---

## Architecture

| Domaine | Hébergement | Rôle |
|---------|-------------|------|
| `odos.world` | Render | Landing marketing |
| `api.odos-api.com` | VPS `167.86.75.36` | API Symfony + admin `/admin` |

L’app mobile appelle `EXPO_PUBLIC_API_URL` (build EAS). Le CORS ne concerne pas l’APK native.

---

## 1. DNS (GoDaddy — domaine `odos-api.com`)

Enregistrement déjà validé si :

```powershell
nslookup api.odos-api.com
# → 167.86.75.36
```

| Type | Nom | Valeur |
|------|-----|--------|
| A | `api` | IP du VPS |

Pas de forwarding GoDaddy vers une autre URL.

---

## 2. HTTPS sur le VPS (nginx hôte → Docker :8000)

Docker expose l’API sur **`127.0.0.1:8000`** (`APP_HTTP_PORT=8000`).  
Le nginx **du VPS** écoute **80/443** et proxy vers ce port.

### Installation (Ubuntu sur le VPS)

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
sudo mkdir -p /var/www/certbot
```

### Config nginx (2 étapes)

Fichier modèle : [`deploy/nginx/api.odos-api.com.conf`](../deploy/nginx/api.odos-api.com.conf) — **HTTP seulement** (pas de `ssl_certificate` tant que certbot n’a pas tourné).

**Étape A — nginx sans SSL**

```bash
cd ~/ODos && git pull   # récupérer la conf corrigée
sudo cp ~/ODos/deploy/nginx/api.odos-api.com.conf /etc/nginx/sites-available/api.odos-api.com
sudo ln -sf /etc/nginx/sites-available/api.odos-api.com /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default   # si conflit port 80
sudo mkdir -p /var/www/certbot
sudo nginx -t && sudo systemctl reload nginx
```

Test : `curl -s -o /dev/null -w "%{http_code}\n" http://api.odos-api.com/api/categories`

**Étape B — certbot ajoute HTTPS**

```bash
sudo certbot --nginx -d api.odos-api.com
sudo nginx -t && sudo systemctl reload nginx
```

Certbot crée `/etc/letsencrypt/options-ssl-nginx.conf` et le bloc `listen 443 ssl`.

Erreur fréquente si vous sautez l’étape A :

```text
open() "/etc/letsencrypt/options-ssl-nginx.conf" failed (2: No such file or directory)
```

→ reprenez avec la conf **HTTP only** du repo, puis relancez certbot.

### Firewall

Ouvrir **80** et **443** (Contabo / `ufw`) :

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

---

## 3. Variables `~/odos-config/.env`

```dotenv
DEFAULT_URI=https://api.odos-api.com

CORS_ALLOW_ORIGIN='^https?://(www\.)?odos\.world$|^https?://api\.odos-api\.com$|^https?://167\.86\.75\.36(:[0-9]+)?$'

TRUSTED_PROXIES=127.0.0.1,REMOTE_ADDR,172.16.0.0/12

JWT_TOKEN_TTL=900
JWT_REFRESH_TTL=2592000

ADMIN_WEBAUTHN_RP_ID=api.odos-api.com
```

Puis :

```bash
cd ~/ODos
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T php php bin/console cache:clear --env=prod
```

Modèle : [`odos-config/env.prod.example`](../odos-config/env.prod.example).

---

## 4. App mobile (EAS)

Dans `odos-front/eas.json` (profils `preview` / `production`) :

```json
"EXPO_PUBLIC_API_URL": "https://api.odos-api.com"
```

Rebuild obligatoire :

```bash
cd odos-front
pnpm run build:apk:prod
```

---

## 5. Vérifications

```bash
# Depuis le VPS
curl -s -o /dev/null -w "%{http_code}\n" https://api.odos-api.com/api/categories

# Depuis votre PC
curl -s -o /dev/null -w "%{http_code}\n" https://api.odos-api.com/api/categories
```

Attendu : **200** (si la base et les migrations sont OK).

Admin : `https://api.odos-api.com/admin`

---

## Dépannage

| Symptôme | Cause probable |
|----------|----------------|
| DNS OK mais connexion refusée sur 443 | nginx hôte ou certbot pas installé ; ports 80/443 fermés |
| `ERR_SSL_PROTOCOL_ERROR` | Certificat absent ; bloc 443 actif sans certificats |
| 502 Bad Gateway | Docker pas démarré ou pas sur `:8000` |
| 500 sur **toute** l’API (`/api/categories`, `/api/docs`, …) | `.env` prod incomplet (`JWT_TOKEN_TTL`, `JWT_REFRESH_TTL`, `TRUSTED_PROXIES`) ou syntaxe `%env(default:900:VAR)%` invalide — voir ci-dessous |
| 500 sur `/api/categories` seul | Migrations, DB, ou données — rare si le reste de l’API répond |
| APK ne joint pas | Ancien build avec IP/localhost ; rebuild EAS + HTTPS |

### 500 sur toute l’API — diagnostic rapide

```bash
# 1. Variables JWT + proxy présentes ?
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T php \
  printenv | grep -E 'JWT_TOKEN_TTL|JWT_REFRESH_TTL|TRUSTED_PROXIES'

# 2. Smoke test local
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/api/categories
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/api/docs

# 3. Logs applicatifs (stderr → docker logs après deploy monolog fix)
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs php --tail 40
```

La CI exécute les mêmes checks en HTTPS après chaque deploy sur `main`.

Test HTTP direct (sans TLS) :

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://api.odos-api.com:8000/api/categories
```

---

## Checklist

- [ ] `nslookup api.odos-api.com` → IP VPS
- [ ] nginx hôte + certbot + HTTPS
- [ ] `curl https://api.odos-api.com/api/categories` → 200
- [ ] `curl https://api.odos-api.com/api/docs` → 200
- [ ] `~/odos-config/.env` : `JWT_TOKEN_TTL`, `JWT_REFRESH_TTL`, `TRUSTED_PROXIES`
- [ ] `eas.json` + nouvel APK
- [ ] Landing `odos.world` reste sur Render (domaine séparé)
