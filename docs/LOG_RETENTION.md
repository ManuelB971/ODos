# Politique de rétention des logs — ODOS

_Complément au registre RGPD (`docs/RGPD_registre.md`)._

## Durées cibles

| Source | Emplacement | Rétention | Mécanisme |
|--------|-------------|-----------|-----------|
| Logs Symfony (prod) | `odos-back/var/log/prod.log` (volume Docker) | **90 jours** | Rotation OS / troncature planifiée |
| Logs Nginx access/error | Volume `nginx_logs` → `/var/log/nginx/odos_*.log` | **30 jours** access, **90 jours** error | logrotate sur l'hôte |
| Logs admin (BDD) | table `admin_audit_log` | **90 jours** | `app:admin-audit:purge` via cron |
| Refresh tokens expirés | table `refresh_tokens` | Suppression dès expiration | `app:refresh-token:purge` via cron |

## Cron production (Contabo)

Installer sur le VPS :

```bash
chmod +x /opt/odos/scripts/prod-cron-purge.sh
crontab -e
```

Ajouter :

```cron
0 3 * * * /opt/odos/scripts/prod-cron-purge.sh >> /var/log/odos-retention.log 2>&1
```

La commande agrégée :

```bash
docker compose exec -T php php bin/console app:data-retention:purge --env=prod
```

équivaut à :

- `app:refresh-token:purge`
- `app:admin-audit:purge --days=90`

Alternative Gesdinet : `gesdinet:jwt:clear-invalid-tokens` (déjà fourni par le bundle).

## Exemple logrotate Nginx (hôte)

Fichier `/etc/logrotate.d/odos-nginx` (adapter le chemin du volume si monté sur l'hôte) :

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

## Variables JWT (prod)

| Variable | Valeur recommandée | Rôle |
|----------|-------------------|------|
| `JWT_TOKEN_TTL` | `900` (15 min) | Durée du access token |
| `JWT_REFRESH_TTL` | `2592000` (30 j) | Durée du refresh token |

Après modification : redémarrer PHP / vider le cache prod.

## CORS production

Ne pas utiliser `*` sur `/api`. Définir dans `.env` serveur :

```dotenv
CORS_ALLOW_ORIGIN='^https://admin\.votre-domaine\.com$'
```

Les apps mobiles natives n'envoient souvent pas d'`Origin` : CORS ne s'applique pas à l'APK, seulement aux clients web.
