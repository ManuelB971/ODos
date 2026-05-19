# Mise en production ODOS sans nom de domaine

Guide pas à pas pour Contabo (IP publique uniquement).

## Prérequis

- VPS accessible en SSH (`root@VOTRE_IP`)
- Repo cloné (ex. `/opt/odos`)
- Fichier `~/odos-config/.env` avec secrets (DB, JWT, `APP_SECRET`)

## 1. Variables d'environnement (`~/odos-config/.env`)

```dotenv
APP_ENV=prod
APP_DEBUG=0
APP_SECRET=<32_caracteres_aleatoires>

DATABASE_URL=postgresql://odos:MOT_DE_PASSE@postgres:5432/odos?serverVersion=16&charset=utf8
REDIS_URL=redis://redis:6379

JWT_SECRET_KEY=%kernel.project_dir%/config/jwt/private.pem
JWT_PUBLIC_KEY=%kernel.project_dir%/config/jwt/public.pem
JWT_PASSPHRASE=<passphrase>
JWT_TOKEN_TTL=900
JWT_REFRESH_TTL=2592000

# CORS : admin web via IP (adapter l'IP et le port HTTP)
CORS_ALLOW_ORIGIN='^https?://167\.86\.75\.36(:[0-9]+)?$'

DEFAULT_URI=http://167.86.75.36:8000
APP_HTTP_PORT=8000

ADMIN_MFA_ENABLED=1
ADMIN_MFA_PIN=<pin>
ADMIN_MFA_TOTP_SECRET=<secret_base32>
ADMIN_MFA_TOTP_ISSUER=ODos
ADMIN_MFA_REQUIRE_BIOMETRIC=1
ADMIN_WEBAUTHN_RP_ID=167.86.75.36
```

Modèle complet : `odos-config/env.prod.example`.

Remplacez `167.86.75.36` par l'IP de votre VPS.

## 2. Clés JWT (une fois)

```bash
cd /opt/odos
docker compose exec php php bin/console lexik:jwt:generate-keypair --env=prod
```

Les fichiers doivent être dans `~/odos-config/jwt/` (montés dans le conteneur).

## 3. Déployer l'API

```bash
cd /opt/odos
git pull origin main
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose exec -T php php bin/console doctrine:migrations:migrate --no-interaction --env=prod
docker compose exec -T php php bin/console cache:clear --env=prod
```

## 4. Vérifier l'API

```bash
curl -s -o /dev/null -w "%{http_code}" http://167.86.75.36:8000/api/categories
# Attendu : 200
```

Admin : `http://167.86.75.36:8000/admin`

## 5. Cron rétention RGPD

```bash
chmod +x /opt/odos/scripts/prod-cron-purge.sh
crontab -e
# Ajouter :
0 3 * * * /opt/odos/scripts/prod-cron-purge.sh >> /var/log/odos-retention.log 2>&1
```

## 6. Application mobile (APK)

L'URL prod est définie dans `odos-front/eas.json` (`EXPO_PUBLIC_API_URL`).

```bash
cd odos-front
pnpm run build:apk:prod
# ou : eas build --platform android --profile production
```

En dev local, utiliser `odos-front/.env` (`http://localhost:8000` ou IP LAN `:8000`).

Le CORS ne concerne pas l'APK native.

## 7. Limites sans domaine

| Élément | Sans domaine | Avec domaine + HTTPS |
|---------|--------------|----------------------|
| Certificat TLS | Non (HTTP seulement) | Let's Encrypt |
| Sécurité transport | Risque si Wi‑Fi public | Recommandé |
| Stores (Play / App Store) | Souvent refus HTTP | HTTPS obligatoire |

## 8. Quand vous aurez un domaine

1. DNS A → IP du VPS  
2. HTTPS (Caddy / Certbot)  
3. Mettre à jour `CORS_ALLOW_ORIGIN`, `DEFAULT_URI`, `EXPO_PUBLIC_API_URL`  
4. Rebuild APK  

## Checklist rapide

- [ ] Migration Doctrine OK  
- [ ] Login admin + MFA OK  
- [ ] Inscription app avec case CGU  
- [ ] Cron purge installé  
- [ ] APK pointe vers `http://IP:8000` (ou HTTPS plus tard)
