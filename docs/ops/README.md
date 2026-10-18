# Runbooks d'exploitation (VPS de prod)

Ce qui ne se déploie pas par GitHub Actions et se fait **à la main sur le VPS**, avec les
commandes exactes. Le merge sur `main` ne déploie que l'API (dont `/api/health`) et la web app.

| Runbook | Contenu |
|---------|---------|
| [RUNBOOK_NGINX.md](RUNBOOK_NGINX.md) | Config HTTPS versionnée, HSTS, CSP, `server_tokens off`, `limit_req` |
| [RUNBOOK_SUPERVISION.md](RUNBOOK_SUPERVISION.md) | Discord + Watchdog, métriques nginx et santé, nouvelles alertes, dashboard, compte admin Grafana |
| [RUNBOOK_SAUVEGARDES.md](RUNBOOK_SAUVEGARDES.md) | Copie hors site restic, ping healthchecks, métrique, test de restauration, reprise après sinistre |
| [RUNBOOK_DURCISSEMENT_HOTE.md](RUNBOOK_DURCISSEMENT_HOTE.md) | SSH, unattended-upgrades, UFW, ports Docker, CrowdSec, rétention des logs (CNIL) |

## Ordre conseillé après le merge

1. Attendre la fin de « Deploy Production » (`/api/health` vérifie base + Redis) :
   `curl -s https://api.odos-api.com/api/health` → `{"status":"ok","checks":{"database":"ok","redis":"ok"}}`.
2. **nginx** ([RUNBOOK_NGINX.md](RUNBOOK_NGINX.md)) : il crée les logs `odos_metrics` lus par la supervision.
3. **Supervision** ([RUNBOOK_SUPERVISION.md](RUNBOOK_SUPERVISION.md)) §§ 0 à 3 : secrets Discord /
   healthchecks, `GRAFANA_ADMIN_USER` dans `.env` (désormais obligatoire), puis `docker compose up -d`.
4. **Sauvegardes** ([RUNBOOK_SAUVEGARDES.md](RUNBOOK_SAUVEGARDES.md)) : dossier textfile, restic, premier test de restauration.
5. **Hôte** ([RUNBOOK_DURCISSEMENT_HOTE.md](RUNBOOK_DURCISSEMENT_HOTE.md)), section par section, snapshot avant chacune.

Les alertes `MetriquesNginxAbsentes`, `SauvegardeHorsSiteNonConfiguree` et
`MetriqueSauvegardeAbsente` restent actives tant que les étapes 2 et 4 ne sont pas faites :
c'est voulu, elles servent de liste de contrôle.
