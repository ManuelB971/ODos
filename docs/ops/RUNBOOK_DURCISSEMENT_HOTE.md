# Runbook — durcissement de l'hôte (VPS Contabo, Ubuntu 24.04)

Chaque section est indépendante. Règles communes :

- **snapshot Contabo** avant les §§ 1, 3 et 4 (SSH, pare-feu, Docker) ;
- garder **une session SSH ouverte** pendant toute modification SSH ou UFW, et tester
  dans une **seconde** session avant de fermer la première ;
- secours si l'accès SSH est perdu : console VNC du panneau Contabo, puis restauration du snapshot.

Les fichiers à poser sont versionnés dans `deploy/host/` et `deploy/logrotate/`
(repo à jour dans `/home/deploy/ODos` après le merge). Commandes lancées en `odos`.

Index : [docs/ops/](.) · état d'avancement : [PLAN_LANCEMENT.md § 1.3](../PLAN_LANCEMENT.md)

```bash
R=/home/deploy/ODos     # raccourci utilisé ci-dessous
```

---

## 1. SSH : clé uniquement, pas de root

Déjà fait le 16/10 (`00-hardening.conf`, `AllowUsers odos deploy`). Le fichier versionné
reprend ces réglages et ajoute `MaxAuthTries 3`, `AuthenticationMethods publickey`, pas de
redirection d'agent ni de X11, tunnels `-L` seulement (Grafana) et aucun tunnel pour `deploy`.

```bash
sudo diff -u /etc/ssh/sshd_config.d/00-hardening.conf "$R/deploy/host/ssh/00-hardening.conf"
sudo install -m 644 "$R/deploy/host/ssh/00-hardening.conf" /etc/ssh/sshd_config.d/00-hardening.conf
sudo sshd -t && sudo systemctl reload ssh
```

Dans une **seconde** session (sans fermer la première) :

```bash
ssh odos@<vps> 'echo ok'
ssh -L 3000:127.0.0.1:3000 odos@<vps> 'curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/login'
# Doivent échouer :
ssh -o PubkeyAuthentication=no -o PreferredAuthentications=password odos@<vps>   # Permission denied (publickey)
ssh root@<vps>                                                                     # Permission denied
```

Vérifier la configuration effective (la première valeur lue gagne, `50-cloud-init.conf` ne doit pas l'emporter) :

```bash
sudo sshd -T | grep -E '^(passwordauthentication|kbdinteractiveauthentication|permitrootlogin|pubkeyauthentication|authenticationmethods|allowusers|maxauthtries|allowtcpforwarding)'
# Attendu : no, no, no, yes, publickey, odos deploy, 3, local
sudo passwd -l root            # verrouille aussi le mot de passe root (console VNC comprise)
sudo passwd -S root            # → « root L … »
```

Puis lancer un déploiement (Actions → Deploy Production → *Run workflow*, cible `web`) pour
confirmer que `deploy` passe toujours.

Clés autorisées : `sudo cat /home/deploy/.ssh/authorized_keys /home/odos/.ssh/authorized_keys` —
retirer toute clé dont l'usage n'est pas identifié (point ouvert du plan de lancement).

---

## 2. Mises à jour de sécurité automatiques (unattended-upgrades)

```bash
sudo apt-get update && sudo apt-get install -y unattended-upgrades apt-listchanges
sudo install -m 644 "$R/deploy/host/apt/52odos-unattended-upgrades" /etc/apt/apt.conf.d/52odos-unattended-upgrades
# Active le passage quotidien (écrit /etc/apt/apt.conf.d/20auto-upgrades) :
echo 'unattended-upgrades unattended-upgrades/enable_auto_updates boolean true' | sudo debconf-set-selections
sudo dpkg-reconfigure -f noninteractive unattended-upgrades
cat /etc/apt/apt.conf.d/20auto-upgrades          # Update-Package-Lists "1"; Unattended-Upgrade "1";
sudo unattended-upgrade --dry-run --debug 2>&1 | grep -E 'Allowed origins|Packages that will be upgraded' 
systemctl list-timers apt-daily-upgrade.timer
```

Seuls les dépôts `-security` (et ESM) sont pris : Docker n'est jamais mis à jour en
douce. Pas de redémarrage automatique ; vérifier une fois par semaine :

```bash
[ -f /var/run/reboot-required ] && cat /var/run/reboot-required.pkgs
sudo tail -n 20 /var/log/unattended-upgrades/unattended-upgrades.log
```

---

## 3. UFW : refus par défaut

État attendu (16/10) : 22, 80, 443 ouverts, rien d'autre.

```bash
sudo ufw status verbose
```

Si UFW n'est pas actif ou pas en refus par défaut — **ouvrir SSH avant d'activer** :

```bash
sudo sed -i 's/^IPV6=.*/IPV6=yes/' /etc/default/ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw limit 22/tcp comment 'SSH (6 tentatives / 30 s / IP)'
sudo ufw allow 80/tcp comment 'HTTP (ACME + redirection)'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw enable
sudo ufw status numbered
```

Attendu : `Default: deny (incoming), allow (outgoing)` et uniquement 22 (LIMIT), 80, 443, en v4 et v6.
Supprimer toute autre règle : `sudo ufw delete <numéro>`.

---

## 4. Docker contourne UFW : vérifier que tout est sur 127.0.0.1

Docker écrit ses propres règles iptables (chaîne `DOCKER`) **avant** celles d'UFW : un port
publié en `0.0.0.0` est joignable depuis Internet même si UFW le refuse.

### 4.1 Ce que dit le repo

| Fichier | Port | Lien | Chargé en prod ? |
|---------|------|------|------------------|
| `docker-compose.prod.yml` | nginx 8000 | `127.0.0.1` (`!override`) | oui |
| `docker-compose.yml` | nginx 8000 | toutes interfaces | remplacé par prod.yml |
| `docker-compose.yml` | Ollama 11434 | `127.0.0.1` (corrigé dans cette PR) | profil `llm`, inactif |
| `docker-compose.override.yml` | Postgres 5432 | `127.0.0.1` (corrigé dans cette PR) | **oui si `docker compose up` est lancé sans `-f`** |
| `monitoring/docker-compose.yml` | 9093, 9115, 4040, 9187, 9121 | `127.0.0.1` | oui |
| `monitoring/docker-compose.yml` | Prometheus, Grafana, node-exporter | réseau hôte, `--web.listen-address=127.0.0.1:…` | oui |
| `docker-compose.wazuh.yml` | 9200, 1514, 1515, 55000, 5601 | toutes interfaces | **ne plus jamais lancer** (Wazuh abandonné) |

`docker-compose.override.yml` est chargé automatiquement par tout `docker compose` sans `-f`.
Pour qu'une commande tapée à la main sur le VPS n'utilise jamais la config de dev :

```bash
sudo -u deploy sh -c 'grep -q "^COMPOSE_FILE=" /home/deploy/ODos/.env 2>/dev/null || echo "COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml" >> /home/deploy/ODos/.env'
sudo -u deploy sh -c 'cd /home/deploy/ODos && docker compose config --services'   # pas de service llm, pas de wazuh
```

### 4.2 Ce qui tourne vraiment

```bash
# Aucune ligne attendue :
docker ps --format '{{.Names}}\t{{.Ports}}' | grep -E '0\.0\.0\.0|\[::\]|:::' 
# Ports en écoute hors loopback : seuls sshd (22) et nginx (80, 443) attendus.
sudo ss -tlnpH | awk '$4 !~ /^(127\.0\.0\.1|\[::1\]):/ {print $4, $6}'
sudo iptables -t nat -S DOCKER | grep -v -- '-d 127.0.0.1' | grep DNAT    # aucune ligne attendue
```

Depuis le PC (hors VPS), un scan ne doit montrer que 22, 80, 443 :

```bash
nmap -Pn -p 1-65535 --open <ip du vps>
```

### 4.3 Garde-fou : lier par défaut à 127.0.0.1 et limiter les logs Docker

`deploy/host/docker/daemon.json` : `"ip": "127.0.0.1"` (un port publié sans IP explicite
n'écoute plus que sur la boucle locale) et rotation des logs des conteneurs (10 Mo × 3,
au lieu de logs `json-file` sans limite). **Redémarre Docker, donc l'app (~30 s)** : à faire
hors des heures d'usage, snapshot avant.

```bash
sudo cat /etc/docker/daemon.json 2>/dev/null     # s'il existe : fusionner à la main, ne pas écraser
sudo install -m 644 "$R/deploy/host/docker/daemon.json" /etc/docker/daemon.json
sudo dockerd --validate --config-file /etc/docker/daemon.json && sudo systemctl restart docker
docker ps --format '{{.Names}}\t{{.Status}}'      # tous « Up » (restart: unless-stopped)
curl -fsS https://api.odos-api.com/api/health && curl -fsSI https://app.odos.world/ | head -n 1
```

La rotation ne s'applique qu'aux conteneurs **recréés** : elle prendra effet au prochain
déploiement (app) et au prochain `docker compose up -d --force-recreate` (supervision).

---

## 5. CrowdSec : les décisions sont-elles appliquées ?

CrowdSec **détecte** ; c'est le **bouncer** qui bloque. Sans bouncer actif, les « IP bannies »
du dashboard ne sont bannies nulle part. L'alerte `CrowdSecBouncerMuet` surveille désormais
qu'un bouncer interroge l'API locale.

### 5.1 Inventaire

```bash
sudo cscli version
sudo cscli bouncers list          # au moins un bouncer « ✔️ » avec un « Last API pull » de quelques secondes
systemctl status crowdsec crowdsec-firewall-bouncer --no-pager | grep -E 'Loaded|Active'
sudo cscli collections list | grep -E 'nginx|sshd|linux|http-cve|base-http-scenarios'
sudo cscli metrics show acquisition    # lignes lues par fichier : nginx access/error et auth.log
```

Pas de bouncer ? Installer le bouncer pare-feu (nftables sur Ubuntu 24.04) :

```bash
sudo apt-get install -y crowdsec-firewall-bouncer-nftables
sudo systemctl enable --now crowdsec-firewall-bouncer
sudo cscli bouncers list
```

Le bouncer pare-feu bloque dans la chaîne `input` : il protège nginx (80/443) et sshd. Les
ports Docker, eux, ne passeraient pas par cette chaîne, d'où l'importance du § 4.

### 5.2 Sources lues

Si `acquis.yaml` lit `/var/log/nginx/*.log`, il analyse aussi les logs de métriques
(`odos-metrics-*.log`, sans IP) : poser la liste explicite versionnée.

```bash
sudo grep -n -A3 filenames /etc/crowdsec/acquis.yaml /etc/crowdsec/acquis.d/*.yaml 2>/dev/null
sudo install -d /etc/crowdsec/acquis.d
sudo install -m 644 "$R/deploy/host/crowdsec/acquis-odos.yaml" /etc/crowdsec/acquis.d/odos.yaml
# Retirer de /etc/crowdsec/acquis.yaml les entrées nginx / auth.log désormais en double, puis :
sudo crowdsec -t && sudo systemctl reload crowdsec
sudo cscli metrics show acquisition
```

### 5.3 Test d'une décision de bout en bout

Avec une IP de documentation (sans effet réel) :

```bash
sudo cscli decisions add --ip 192.0.2.10 --duration 5m --reason "test runbook ODOS"
sleep 15
sudo nft list ruleset | grep -c 192.0.2.10        # ≥ 1 (bouncer nftables)
# (bouncer iptables : sudo ipset test crowdsec-blacklists 192.0.2.10)
sudo cscli decisions delete --ip 192.0.2.10
```

Test réel, avec un téléphone en 4G (Wi-Fi coupé) : relever son IP (`https://ifconfig.me`), puis

```bash
sudo cscli decisions add --ip <ip du téléphone> --duration 3m --reason "test blocage ODOS"
```

→ `https://app.odos.world` ne répond plus depuis le téléphone (délai d'attente), puis
`sudo cscli decisions delete --ip <ip du téléphone>`. **Ne jamais tester avec l'IP du PC
d'administration** (perte de l'accès SSH pendant la durée du ban).

---

## 6. Rétention des logs contenant des IP (CNIL)

La CNIL recommande, pour la journalisation, une conservation de **6 mois à 1 an**
(recommandation du 14/10/2021). On applique 6 mois partout où il y a des IP, et moins
quand il n'y en a pas.

| Journal | Contenu | Avant | Après |
|---------|---------|-------|-------|
| `/var/log/nginx/access.log`, `error.log` (hôte) | IP, URL, user-agent | 14 jours (paquet) | **183 jours** |
| `/var/log/nginx/odos-metrics-*.log` | ni IP ni query string | — | 7 jours |
| `/var/log/auth.log` | IP et comptes SSH, sudo | 4 semaines | **26 semaines** |
| journal systemd (sshd, ufw, crowdsec) | IP | taille seulement (jusqu'à 4 Go, durée indéfinie) | **6 mois**, 1 Go max |
| volume Docker `odos_nginx_logs` | IP du proxy hôte seulement | 30 jours | inchangé ([LOG_RETENTION.md](../LOG_RETENTION.md)) |
| base CrowdSec (alertes, décisions) | IP | `flush.max_age` (7 j par défaut) | inchangé : cache de travail, la trace de référence est dans les logs ci-dessus |

```bash
sudo cp /etc/logrotate.d/nginx /etc/logrotate.d/rsyslog /root/   # copie du fichier du paquet
diff -u /etc/logrotate.d/rsyslog "$R/deploy/logrotate/rsyslog"    # ne doit différer que par le bloc auth.log
sudo install -m 644 "$R/deploy/logrotate/nginx"   /etc/logrotate.d/nginx
sudo install -m 644 "$R/deploy/logrotate/rsyslog" /etc/logrotate.d/rsyslog
sudo logrotate -d /etc/logrotate.d/nginx /etc/logrotate.d/rsyslog 2>&1 | grep -iE 'error|rotating pattern'

sudo install -d /etc/systemd/journald.conf.d
sudo install -m 644 "$R/deploy/host/journald/odos-retention.conf" /etc/systemd/journald.conf.d/odos-retention.conf
sudo systemctl restart systemd-journald
journalctl --disk-usage
sudo grep -n max_age /etc/crowdsec/config.yaml
```

Espace disque : 6 mois de logs nginx compressés pèsent quelques centaines de Mo au plus au
trafic actuel ; l'alerte `DisquePresquePlein` (< 15 %) prévient avant tout problème.

À reporter dans le [registre RGPD](../RGPD_registre.md) (traitement « journalisation de
sécurité » : finalité, durée 6 mois) et dans [LOG_RETENTION.md](../LOG_RETENTION.md).
