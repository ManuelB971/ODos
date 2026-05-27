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

### Config nginx

Fichier modèle dans le repo : [`deploy/nginx/api.odos-api.com.conf`](../deploy/nginx/api.odos-api.com.conf)

```bash
sudo cp ~/ODos/deploy/nginx/api.odos-api.com.conf /etc/nginx/sites-available/api.odos-api.com
sudo ln -sf /etc/nginx/sites-available/api.odos-api.com /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default   # si conflit port 80
sudo nginx -t
```

**Avant** d’avoir les certificats, commentez temporairement le bloc `server { listen 443 ...}` ou utilisez seulement le bloc port 80 pour la première passe certbot :

```bash
sudo certbot --nginx -d api.odos-api.com
sudo systemctl reload nginx
```

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
| 500 sur `/api/categories` | Backend (migrations, `.env`, DB) — pas le DNS |
| APK ne joint pas | Ancien build avec IP/localhost ; rebuild EAS + HTTPS |

Test HTTP direct (sans TLS) :

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://api.odos-api.com:8000/api/categories
```

---

## Checklist

- [ ] `nslookup api.odos-api.com` → IP VPS
- [ ] nginx hôte + certbot + HTTPS
- [ ] `curl https://api.odos-api.com/api/categories` → 200
- [ ] `~/odos-config/.env` mis à jour
- [ ] `eas.json` + nouvel APK
- [ ] Landing `odos.world` reste sur Render (domaine séparé)
