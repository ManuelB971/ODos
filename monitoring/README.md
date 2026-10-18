# Supervision ODOS

Prometheus + Alertmanager + Grafana + exporters, en projet Compose séparé
(`odos-monitoring`) sur le VPS. Tout écoute sur `127.0.0.1` ; accès par tunnel SSH :

```bash
ssh -L 3000:127.0.0.1:3000 -L 9090:127.0.0.1:9090 -L 9093:127.0.0.1:9093 odos@<vps>
```

Gestes d'installation et de mise à jour : [docs/ops/RUNBOOK_SUPERVISION.md](../docs/ops/RUNBOOK_SUPERVISION.md).

## Fichiers

| Fichier | Rôle |
|---------|------|
| `docker-compose.yml` | Services, ports (tous sur 127.0.0.1), limites mémoire |
| `prometheus/prometheus.yml` | Cibles scrapées |
| `prometheus/alerts.yml` | Règles d'alerte |
| `alertmanager/alertmanager.yml` | Routage des notifications |
| `blackbox/blackbox.yml` | Modules de sonde HTTPS |
| `grafana/provisioning/` | Datasources et dashboards provisionnés |
| `.env` (hors repo) | Mots de passe et DSN, modèle : `.env.example` |
| `secrets/` (hors repo) | URL de webhook, une par fichier |

## Notifications

| Quoi | Où | Pourquoi |
|------|-----|----------|
| Toutes les alertes (`warning`, `critical`) | Discord, via `secrets/discord_webhook_url` | Être prévenu ; `critical` répétée toutes les 2 h, le reste toutes les 12 h |
| `Watchdog` (toujours active) | healthchecks.io, via `secrets/watchdog_ping_url`, ping chaque minute | Dead man's switch : si le VPS, Prometheus ou Alertmanager tombe, les pings cessent et healthchecks.io prévient par e-mail |

Les URL ne sont jamais dans le repo : Alertmanager les lit dans des secrets Compose
(`webhook_url_file` / `url_file`). Le dossier `secrets/` est en `700`, les fichiers en
`644` (Alertmanager tourne en `nobody`).

## Vérifier la configuration avant de l'appliquer

```bash
docker compose config --quiet
docker run --rm --entrypoint promtool -v "$PWD/prometheus:/etc/prometheus:ro" prom/prometheus:v3.5.0 check config /etc/prometheus/prometheus.yml
docker run --rm --entrypoint amtool -v "$PWD/alertmanager:/a:ro" prom/alertmanager:v0.28.1 check-config /a/alertmanager.yml
```


## Sauvegardes

`scripts/prod-backup.sh` écrit `/var/lib/node_exporter/textfile/odos_backup.prom`
(horodatage de la dernière sauvegarde locale et hors site réussie, taille, durée),
lu par le collecteur textfile de node-exporter. Alertes `SauvegardeTropAncienne`
(> 26 h), `SauvegardeHorsSiteTropAncienne`, `SauvegardeHorsSiteNonConfiguree`,
`MetriqueSauvegardeAbsente`. Mise en place : [docs/ops/RUNBOOK_SAUVEGARDES.md](../docs/ops/RUNBOOK_SAUVEGARDES.md).

## Métriques applicatives

- `blackbox-health` sonde `https://api.odos-api.com/api/health` (base + Redis vus par Symfony).
- `nginxlog-exporter` lit `/var/log/nginx/odos-metrics-{api,web}.log` (log_format
  `odos_metrics`, sans IP ni query string) et expose taux de réponses par code et
  histogramme de latence par vhost (`nginx_http_*`). Config : `nginxlog/config.yml`.
