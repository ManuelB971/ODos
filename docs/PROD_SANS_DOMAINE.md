# Mise en prod sans nom de domaine

Guide pour déployer ODOS sur un VPS Contabo avec une IP publique uniquement (pas de HTTPS pour l'instant).

Liens utiles : [index docs](README.md) · [CI/CD](CI_CD_V2_2026.md) · [rétention logs](LOG_RETENTION.md)

---

## Avant de commencer

- VPS accessible en SSH (`root@TON_IP`)
- repo cloné (ex. `/opt/odos`)
- fichier `~/odos-config/.env` avec les secrets (DB, JWT, `APP_SECRET`)

---

## 1. Variables d'environnement

Fichier `~/odos-config/.env` :

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

# CORS : back-office admin via IP (adapter IP + port)
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

Modèle complet : `odos-config/env.prod.example`. Remplace `167.86.75.36` par ton IP.

---

## 2. Clés JWT (une fois)

```bash
cd /opt/odos
docker compose exec php php bin/console lexik:jwt:generate-keypair --env=prod
```

Les fichiers doivent finir dans `~/odos-config/jwt/` (montés dans le conteneur).

---

## 3. Lancer l'API

```bash
cd /opt/odos
git pull origin main
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose exec -T php php bin/console doctrine:migrations:migrate --no-interaction --env=prod
docker compose exec -T php php bin/console cache:clear --env=prod
```

Ou laisser GitHub Actions le faire via `deploy-prod.yml` — voir [CI_CD_V2_2026.md](CI_CD_V2_2026.md).

---

## 4. Vérifier que ça répond

```bash
curl -s -o /dev/null -w "%{http_code}" http://167.86.75.36:8000/api/categories
# Attendu : 200
```

Admin : `http://167.86.75.36:8000/admin`

Tests RGPD rapides (app mobile connectée) :

- Export : Paramètres → « Télécharger mes données »
- Suppression : Paramètres → « Supprimer mon compte »

---

## 5. Cron rétention RGPD

```bash
chmod +x /opt/odos/scripts/prod-cron-purge.sh
crontab -e
```

Ajouter :

```cron
0 3 * * * /opt/odos/scripts/prod-cron-purge.sh >> /var/log/odos-retention.log 2>&1
```

Détail : [LOG_RETENTION.md](LOG_RETENTION.md).

---

## 6. Logrotate Nginx

Recommandé — config dans [LOG_RETENTION.md](LOG_RETENTION.md).

---

## 7. APK mobile

L'URL prod est dans `odos-front/eas.json` (`EXPO_PUBLIC_API_URL`).

```bash
cd odos-front
pnpm run build:apk:prod
```

En local : `odos-front/.env` avec `http://localhost:8000` ou l'IP LAN.

Le CORS ne concerne pas l'APK native (pas d'en-tête `Origin`).

---

## Limites sans domaine

| | Sans domaine | Avec domaine + HTTPS |
|---|--------------|----------------------|
| TLS | Non (HTTP) | Let's Encrypt |
| Wi‑Fi public | Risqué | OK |
| Stores Play / App Store | Souvent refusé | HTTPS obligatoire |
| URL politique de confidentialité | Texte in-app seulement | Page web publique requise |

---

## Quand tu auras un domaine

1. Enregistrement DNS A → IP du VPS
2. HTTPS (Caddy ou Certbot)
3. Mettre à jour `CORS_ALLOW_ORIGIN`, `DEFAULT_URI`, `EXPO_PUBLIC_API_URL`
4. Publier une page `/privacy` pour les stores
5. Rebuild l'APK

---

## Checklist déploiement

### Infra

- [ ] Migrations Doctrine OK
- [ ] `~/odos-config/.env` en place (jamais commité)
- [ ] Clés JWT dans `~/odos-config/jwt/`
- [ ] `CORS_ALLOW_ORIGIN` = IP ou domaine admin réel
- [ ] Login admin + MFA OK

### RGPD & sécurité

- [ ] Cron purge installé, log dans `/var/log/odos-retention.log`
- [ ] logrotate Nginx configuré
- [ ] Inscription avec case CGU testée
- [ ] Export données testé
- [ ] Suppression compte testée
- [ ] Bandeau cookies visible sur login admin

### Mobile & légal

- [ ] APK pointe vers la bonne URL prod
- [ ] Mentions légales complètes dans `legal.tsx` (SIRET manquant)
- [ ] HTTPS planifié avant soumission stores

### Voir aussi

- [RGPD_AUDIT_2026.md](RGPD_AUDIT_2026.md) — écarts restants
- [INCIDENT_RESPONSE.md](INCIDENT_RESPONSE.md) — responsable incident à nommer
