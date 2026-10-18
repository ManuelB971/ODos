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
