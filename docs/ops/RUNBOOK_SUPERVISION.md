# Runbook — supervision (Prometheus, Alertmanager, Grafana)

Gestes à faire **à la main sur le VPS** après le merge de la PR « ops hardening ».
Le déploiement GitHub Actions ne touche pas à la pile `odos-monitoring` : elle vit
dans `/home/odos/odos-monitoring` (copie du dossier `monitoring/` du repo).

Conventions :

- `odos` = compte admin (sudo + docker), `deploy` = compte de la CI (repo dans `/home/deploy/ODos`).
- Toutes les commandes sont lancées en `odos`, sauf mention contraire.
- Avant toute modification : snapshot Contabo si le geste touche à l'hôte (SSH, UFW, nginx).

Index : [docs/ops/](.) · [monitoring/README.md](../../monitoring/README.md)

---

## 0. Mettre à jour la copie de `monitoring/`

Le repo est mis à jour par chaque déploiement dans `/home/deploy/ODos`. On recopie
la configuration sans écraser les secrets ni le `.env` :

```bash
sudo rsync -a --delete \
  --exclude .env --exclude secrets/ \
  /home/deploy/ODos/monitoring/ /home/odos/odos-monitoring/
sudo chown -R odos:odos /home/odos/odos-monitoring
cd /home/odos/odos-monitoring
```

Après chaque changement de configuration :

```bash
docker compose config --quiet && docker compose up -d
# Rechargement à chaud de Prometheus (règles) sans redémarrage :
curl -fsS -X POST http://127.0.0.1:9090/-/reload || docker compose restart prometheus
```

---

## 1. Notifications Discord + Watchdog (dead man's switch)

### 1.1 Créer les deux URL

1. **Discord** : salon `#alertes` → Paramètres du salon → Intégrations → Webhooks →
   Nouveau webhook → Copier l'URL.
2. **healthchecks.io** (offre gratuite, 20 checks) : créer un projet « ODOS », puis un check
   - nom `odos-watchdog`, type *Simple*, **période 5 min, délai de grâce 5 min** ;
   - onglet *Integrations* : activer l'e-mail (et Discord si souhaité, via un **autre**
     webhook que celui d'Alertmanager : si Discord est en panne on veut quand même l'e-mail).
   - copier l'URL de ping `https://hc-ping.com/<uuid>`.

### 1.2 Déposer les secrets (hors repo)

```bash
cd /home/odos/odos-monitoring
install -d -m 700 secrets
# « read -s » évite que l'URL reste dans l'historique du shell.
read -rs -p "URL webhook Discord : " URL && printf '%s\n' "$URL" > secrets/discord_webhook_url; unset URL; echo
read -rs -p "URL ping healthchecks (watchdog) : " URL && printf '%s\n' "$URL" > secrets/watchdog_ping_url; unset URL; echo
# Alertmanager tourne en nobody (uid 65534) : le fichier doit être lisible,
# c'est le dossier en 700 qui protège des autres comptes de l'hôte.
chmod 644 secrets/*
ls -la secrets
```

### 1.3 Appliquer et vérifier

```bash
docker compose up -d alertmanager prometheus
curl -fsS -X POST http://127.0.0.1:9090/-/reload
docker compose exec alertmanager amtool check-config /etc/alertmanager/alertmanager.yml
# Le Watchdog doit apparaître comme « firing » :
curl -s http://127.0.0.1:9093/api/v2/alerts | grep -o '"alertname":"Watchdog"'
```

Sur healthchecks.io, le check `odos-watchdog` passe au vert en 1 à 2 minutes.

**Test de bout en bout Discord** (alerte factice de 5 minutes) :

```bash
docker compose exec alertmanager amtool alert add TestNotification \
  severity=warning instance=test \
  --annotation=summary="Test de notification ODOS, à ignorer" \
  --end="$(date -u -d '+5 min' +%Y-%m-%dT%H:%M:%SZ)" \
  --alertmanager.url=http://127.0.0.1:9093
```

Le message arrive dans `#alertes` après `group_wait` (30 s).

**Test du dead man's switch** : `docker compose stop alertmanager`, attendre ~10 min →
e-mail « odos-watchdog is DOWN » de healthchecks.io → `docker compose start alertmanager`.

### 1.4 Retour arrière

Remettre l'ancien `alertmanager/alertmanager.yml` (receiver vide) et `docker compose up -d alertmanager`.
Mettre le check healthchecks en pause pour éviter la fausse alerte.

---

## 2. Métriques applicatives (santé, 5xx, latence) et nouvelles alertes

### 2.1 Ce qui est ajouté

| Source | Métriques | Alertes |
|--------|-----------|---------|
| `GET /api/health` (Symfony, sonde `blackbox-health`) | `probe_success` : 200 + `"status":"ok"` seulement si `SELECT 1` et `PING` Redis répondent | `SanteApiDegradee` |
| Logs `odos_metrics` du nginx hôte → `nginxlog-exporter` (:4040) | `nginx_http_response_count_total{vhost,status}`, `nginx_http_response_time_seconds_hist_bucket` | `Nginx5xxEleve` (> 5 % sur 5 min), `NginxLatenceP95Elevee` (p95 > 1,5 s sur 10 min), `MetriquesNginxAbsentes` |
| postgres-exporter | `pg_stat_activity_count`, `pg_settings_max_connections`, `pg_stat_database_deadlocks` | `PostgresConnexionsProchesDuMax` (> 80 %), `PostgresDeadlocks` |
| redis-exporter | `redis_memory_used_bytes`, `redis_memory_max_bytes`, `redis_evicted_keys_total` | `RedisMemoireProcheDuMax` (> 90 %), `RedisEvictions` |
| node-exporter | `node_vmstat_oom_kill`, `node_boot_time_seconds` | `OOMKill`, `ServeurRedemarre` (< 30 min) |

`/api/health` arrive en prod avec le déploiement automatique du merge ; il ne renvoie
que `ok` / `fail` par dépendance (le détail de l'erreur part dans les logs Symfony).
Pour que le healthcheck du déploiement l'utilise aussi : variable GitHub
`PROD_HEALTHCHECK_URL=https://api.odos-api.com/api/health` (environnement `production`).

### 2.2 Activer les logs de métriques nginx

Les logs `odos_metrics` sont définis par `deploy/nginx/conf.d/odos-common.conf` et
écrits par les blocs 443 versionnés : faire d'abord [RUNBOOK_NGINX.md](RUNBOOK_NGINX.md).
Vérifier qu'ils se remplissent :

```bash
sudo tail -n 3 /var/log/nginx/odos-metrics-api.log /var/log/nginx/odos-metrics-web.log
```

Ces fichiers sont pris en charge par le logrotate d'Ubuntu (`/etc/logrotate.d/nginx`,
`/var/log/nginx/*.log`, 14 jours) : ils ne contiennent ni IP ni query string.

### 2.3 Démarrer l'exporter et recharger Prometheus

```bash
cd /home/odos/odos-monitoring          # après le § 0
docker compose up -d nginxlog-exporter blackbox prometheus
curl -fsS -X POST http://127.0.0.1:9090/-/reload
curl -s http://127.0.0.1:4040/metrics | grep -m 3 '^nginx_http_response_count_total'
curl -s 'http://127.0.0.1:9115/probe?module=https_health&target=https://api.odos-api.com/api/health' | grep '^probe_success'
# Toutes les cibles doivent être « up » :
curl -s http://127.0.0.1:9090/api/v1/targets | grep -o '"health":"[a-z]*"' | sort | uniq -c
```

### 2.4 Recommandation Redis

Redis tourne sans `maxmemory` : `RedisMemoireProcheDuMax` et `RedisEvictions` ne se
déclencheront jamais, et un emballement du cache consommerait la RAM de l'hôte
(couvert seulement par `MemoireFaible` / `OOMKill`). Redis ne sert que de cache
(LLM, rate limiter), une éviction LRU est donc acceptable. À faire dans une PR dédiée
(le merge redéploie Redis) :

```yaml
# docker-compose.prod.yml
  redis:
    command: ["redis-server", "--maxmemory", "128mb", "--maxmemory-policy", "allkeys-lru"]
```

---

## 3. Dashboard « ODOS — Vue d'ensemble » et compte admin Grafana

### 3.1 Dashboard versionné

Le dashboard est dans `monitoring/grafana/provisioning/dashboards/odos-overview.json`
(uid `odos-overview`, dossier Grafana **ODOS**, lecture seule dans l'interface : on
modifie le JSON dans le repo). Nouvelles sections :

- **Application (nginx)** : taux de 5xx API et web app, latence p95, requêtes/s, réponses
  par classe de code, latence p50/p95/p99 par vhost ;
- **Sauvegardes et supervision** : âge de la dernière sauvegarde locale et hors site,
  taille, état du Watchdog, pings envoyés au dead man's switch ;
- la vignette « API » suit `/api/health` ; le Watchdog est exclu du compteur et de la table des alertes.

Après le § 0 : `docker compose up -d grafana`. Si l'ancienne version avait été montée depuis
`grafana/dashboards/` (branche `feat/monitoring-stack`), le même uid est repris, rien à supprimer.

### 3.2 Renommer le compte `admin`

`GF_SECURITY_ADMIN_USER` n'est lu qu'à la **création** de la base Grafana : changer la
variable ne renomme pas un compte existant. On renomme donc par l'API, puis on aligne `.env`.

```bash
cd /home/odos/odos-monitoring
NEW_LOGIN="odos-$(openssl rand -hex 3)"; echo "Nouvel identifiant : ${NEW_LOGIN}"   # → gestionnaire de mots de passe
read -rs -p "Mot de passe admin Grafana actuel : " GPW; echo
ID="$(curl -fsS -u "admin:${GPW}" 'http://127.0.0.1:3000/api/users/lookup?loginOrEmail=admin' | grep -o '"id":[0-9]*' | head -n 1 | cut -d: -f2)"
EMAIL="$(curl -fsS -u "admin:${GPW}" "http://127.0.0.1:3000/api/users/${ID}" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)"
curl -fsS -u "admin:${GPW}" -X PUT -H 'Content-Type: application/json' \
  -d "{\"login\":\"${NEW_LOGIN}\",\"name\":\"${NEW_LOGIN}\",\"email\":\"${EMAIL}\"}" \
  "http://127.0.0.1:3000/api/users/${ID}"
# Aligner .env (variable désormais obligatoire dans docker-compose.yml) :
grep -q '^GRAFANA_ADMIN_USER=' .env && sed -i "s/^GRAFANA_ADMIN_USER=.*/GRAFANA_ADMIN_USER=${NEW_LOGIN}/" .env \
  || echo "GRAFANA_ADMIN_USER=${NEW_LOGIN}" >> .env
docker compose up -d grafana
# Vérifier : l'ancien identifiant est refusé, le nouveau accepté.
curl -s -o /dev/null -w 'admin : %{http_code}\n' -u "admin:${GPW}" http://127.0.0.1:3000/api/user
curl -s -o /dev/null -w "${NEW_LOGIN} : %{http_code}\n" -u "${NEW_LOGIN}:${GPW}" http://127.0.0.1:3000/api/user
unset GPW
```

Attendu : `admin : 401`, `odos-xxxxxx : 200`. Sans `GRAFANA_ADMIN_USER` dans `.env`,
`docker compose up` refuse de démarrer (message « manquant, voir .env.example »).
