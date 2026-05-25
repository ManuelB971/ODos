# Rétention des logs

Combien de temps on garde quoi, et comment purger automatiquement en prod.

Complète le [registre RGPD](RGPD_registre.md). Index : [docs/README.md](README.md)

---

## Durées

| Source | Où | Combien de temps | Comment |
|--------|-----|------------------|---------|
| Logs Symfony prod | `odos-back/var/log/prod.log` | 90 jours | rotation / troncature planifiée |
| Nginx access | volume `nginx_logs` | 30 jours | logrotate sur l'hôte |
| Nginx error | idem | 90 jours | logrotate |
| Audit admin (BDD) | table `admin_audit_log` | 90 jours | cron → `app:admin-audit:purge` |
| Refresh tokens expirés | table `refresh_tokens` | dès expiration | cron → `app:refresh-token:purge` |

---

## Cron sur le VPS

### Installation

```bash
chmod +x /opt/odos/scripts/prod-cron-purge.sh
crontab -e
```

Ajouter :

```cron
0 3 * * * /opt/odos/scripts/prod-cron-purge.sh >> /var/log/odos-retention.log 2>&1
```

### Ce que le script lance

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T php \
  php bin/console app:data-retention:purge --no-interaction --env=prod
```

Ça enchaîne :

- `app:refresh-token:purge`
- `app:admin-audit:purge --days=90`

Alternative Gesdinet : `gesdinet:jwt:clear-invalid-tokens`.

### Vérifier que ça tourne

```bash
tail -20 /var/log/odos-retention.log
/opt/odos/scripts/prod-cron-purge.sh   # test manuel
```

---

## Logrotate Nginx

Fichier `/etc/logrotate.d/odos-nginx` (adapter le chemin du volume si besoin) :

```
/var/lib/docker/volumes/odos_nginx_logs/_data/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
```

---

## JWT en prod

| Variable | Valeur | Rôle |
|----------|--------|------|
| `JWT_TOKEN_TTL` | `900` (15 min) | durée du access token |
| `JWT_REFRESH_TTL` | `2592000` (30 j) | durée du refresh token |

Après modification : redémarrer PHP / vider le cache prod.

Modèle complet : `odos-config/env.prod.example`.

---

## CORS

Pas de `*` sur `/api`. Dans le `.env` serveur :

Avec domaine :

```dotenv
CORS_ALLOW_ORIGIN='^https://admin\.ton-domaine\.com$'
```

Sans domaine (IP) :

```dotenv
CORS_ALLOW_ORIGIN='^https?://167\.86\.75\.36(:[0-9]+)?$'
```

L'APK native n'envoie pas d'en-tête `Origin` — le CORS ne la concerne pas.

---

## Checklist ops

- [ ] Cron `prod-cron-purge.sh` installé, log actif
- [ ] logrotate Nginx en place
- [ ] `JWT_TOKEN_TTL=900` et `JWT_REFRESH_TTL=2592000` dans `~/odos-config/.env`
- [ ] `CORS_ALLOW_ORIGIN` adapté à l'IP ou domaine admin
- [ ] Rotation de `prod.log` Symfony planifiée (90 j)

Checklist déploiement globale : [PROD_SANS_DOMAINE.md](PROD_SANS_DOMAINE.md).
