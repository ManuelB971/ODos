# Runbook — sauvegardes hors site et test de restauration

`scripts/prod-backup.sh` (cron `deploy`, 3 h 15) fait la sauvegarde locale dans
`/home/deploy/odos-backups`. Ce runbook ajoute :

1. une **copie hors site chiffrée** avec [restic](https://restic.net) (chiffrement AES-256 sur le VPS, le stockage ne voit que des blocs chiffrés) ;
2. un **ping healthchecks.io** de début, de succès et d'échec ;
3. une **métrique** lue par node-exporter et l'alerte « sauvegarde > 26 h » ;
4. un **test de restauration** mensuel (`scripts/prod-restore-test.sh`).

Sans `~/odos-config/backup.env`, le script se comporte comme avant (local seulement)
et l'alerte `SauvegardeHorsSiteNonConfiguree` le signale.

Index : [docs/ops/](.) · supervision : [RUNBOOK_SUPERVISION.md](RUNBOOK_SUPERVISION.md)

---

## 1. Choisir le stockage

| | Hetzner Storage Box (recommandé) | Backblaze B2 |
|---|---|---|
| Localisation | Allemagne / Finlande (UE) | choisir **EU Central** (Amsterdam) à la création du compte |
| Protocole restic | `sftp:` (port 23) | `b2:` natif |
| Prix indicatif | BX11 1 To ≈ 4 €/mois | ≈ 6 $/To/mois, 10 Go gratuits |
| Protection contre l'effacement | instantanés automatiques de la Storage Box | Object Lock sur le bucket |

Données personnelles (base complète) : le stockage choisi est un **sous-traitant RGPD**
à ajouter au [registre](../RGPD_registre.md) (hébergeur de sauvegarde, UE). Rétention
hors site : 7 quotidiennes, 5 hebdomadaires, 6 mensuelles, donc un compte supprimé
disparaît des sauvegardes au bout de 6 mois au plus : le préciser dans la politique de
confidentialité.

> Le compte `deploy` détient les identifiants du stockage : un attaquant qui le compromet
> peut effacer les sauvegardes distantes. Activer les **instantanés automatiques** de la
> Storage Box (Hetzner Console → Storage Box → Snapshots → plan quotidien, 7 jours) ou
> l'**Object Lock** du bucket B2 pour garder une copie qu'il ne peut pas supprimer.

---

## 2. Installation (une fois)

### 2.1 restic et dossier de métriques

```bash
sudo apt-get update && sudo apt-get install -y restic
restic version            # 0.16 ou plus (option --retry-lock)
# Dossier lu par node-exporter (--collector.textfile.directory), écrit par deploy.
sudo install -d -o deploy -g deploy -m 755 /var/lib/node_exporter/textfile
```

Puis appliquer la nouvelle configuration de node-exporter et des règles
([RUNBOOK_SUPERVISION.md § 0](RUNBOOK_SUPERVISION.md#0-mettre-à-jour-la-copie-de-monitoring)) :

```bash
cd /home/odos/odos-monitoring && docker compose up -d node-exporter
curl -fsS -X POST http://127.0.0.1:9090/-/reload
```

### 2.2a Hetzner Storage Box (SFTP)

Dans Hetzner Console → Storage Box : activer **SSH support**, et de préférence créer un
**sous-compte** limité au dossier `odos-restic` (noté `uXXXXXX-sub1` ci-dessous).

```bash
sudo -iu deploy
ssh-keygen -t ed25519 -f ~/.ssh/storagebox -N '' -C "odos-vps restic"
cat >> ~/.ssh/config <<'EOF'
Host storagebox
    HostName uXXXXXX.your-storagebox.de
    User uXXXXXX-sub1
    Port 23
    IdentityFile ~/.ssh/storagebox
    IdentitiesOnly yes
    ServerAliveInterval 60
EOF
chmod 600 ~/.ssh/config
# Dépose la clé publique (demande le mot de passe du sous-compte une seule fois).
ssh-copy-id -p 23 -s -i ~/.ssh/storagebox.pub uXXXXXX-sub1@uXXXXXX.your-storagebox.de
# Doit se connecter sans mot de passe (accepter l'empreinte au premier passage) :
echo ls | sftp -b - storagebox
```

### 2.2b Backblaze B2 (variante)

Créer le bucket **privé** `odos-backups` (région EU Central), réglage *Lifecycle* = « Keep only
the last version », puis une **clé applicative limitée à ce bucket** (Read and Write).
Renseigner `B2_ACCOUNT_ID` / `B2_ACCOUNT_KEY` et `RESTIC_REPOSITORY=b2:odos-backups:vps`.

### 2.3 Mot de passe du dépôt et `backup.env`

```bash
sudo -iu deploy
openssl rand -base64 32 > ~/odos-config/restic-password
chmod 600 ~/odos-config/restic-password
cat ~/odos-config/restic-password   # → à copier TOUT DE SUITE dans le gestionnaire de mots de passe
cp ~/ODos/scripts/backup.env.example ~/odos-config/backup.env
chmod 600 ~/odos-config/backup.env
nano ~/odos-config/backup.env       # RESTIC_REPOSITORY, HC_BACKUP_PING_URL (cf. § 2.4)
```

**Sans ce mot de passe, les sauvegardes hors site sont illisibles.** Il est aussi dans
`config.tar.gz`, mais celui-ci est… dans la sauvegarde chiffrée : il faut une copie ailleurs.

### 2.4 Check healthchecks.io

healthchecks.io → projet ODOS → *Add Check* : nom `odos-backup`, période **1 jour**,
délai de grâce **2 heures**. Copier l'URL `https://hc-ping.com/<uuid>` dans `HC_BACKUP_PING_URL`.
Le script envoie `/start` au début (healthchecks mesure la durée), le ping de succès à la
fin, `/fail` sur erreur.

### 2.5 Initialiser le dépôt et lancer une première sauvegarde

```bash
sudo -iu deploy
set -a; . ~/odos-config/backup.env; set +a
restic init
~/ODos/scripts/prod-backup.sh
restic snapshots --host odos-vps
cat /var/lib/node_exporter/textfile/odos_backup.prom
curl -s http://127.0.0.1:9100/metrics | grep '^odos_backup'
```

Le cron existant (`15 3 * * *`) n'a pas à changer : le script lit `backup.env` lui-même.

---

## 3. Ce qui alerte

| Alerte | Condition |
|--------|-----------|
| `SauvegardeTropAncienne` (critical) | dernière sauvegarde locale réussie > 26 h |
| `SauvegardeHorsSiteTropAncienne` (critical) | dernière copie restic réussie > 26 h |
| `SauvegardeHorsSiteNonConfiguree` (warning) | `RESTIC_REPOSITORY` absent |
| `MetriqueSauvegardeAbsente` (warning) | aucune métrique depuis 2 h (dossier textfile absent, cron arrêté) |
| healthchecks.io `odos-backup` | aucun ping de succès depuis 26 h, ou `/fail` reçu |

---

## 4. Test de restauration (mensuel)

Sans toucher à la prod : la base est restaurée dans un Postgres jetable, sans réseau,
en mémoire, puis supprimé. Le script n'affiche que des comptages.

```bash
sudo -iu deploy
~/ODos/scripts/prod-restore-test.sh            # dernière sauvegarde locale
~/ODos/scripts/prod-restore-test.sh offsite    # dernier instantané restic
```

Résultat attendu : `Sommes SHA-256 OK`, `Base restaurée en N s`, puis un tableau
`tables / user / activity / category / migration` où les colonnes « restauré » et
« prod » sont égales ou proches (écart = activité depuis 3 h 15). Noter la date et le
résultat dans le journal de `docs/PLAN_LANCEMENT.md`.

Contrôle d'intégrité complet du dépôt distant (relit tout, plus long ; le script n'en
relit que 10 % le dimanche) :

```bash
set -a; . ~/odos-config/backup.env; set +a
restic check --read-data
```

---

## 5. Restauration réelle (perte du VPS)

Sur un nouveau VPS avec Docker, le repo cloné dans `~/ODos` et restic installé :

```bash
# 1. Récupérer la sauvegarde (mot de passe restic depuis le gestionnaire de mots de passe)
export RESTIC_REPOSITORY=sftp:storagebox:odos-restic   # ou b2:… avec B2_ACCOUNT_ID/KEY
export RESTIC_PASSWORD_FILE=/root/restic-password
restic snapshots --host odos-vps
restic restore latest --host odos-vps --tag odos-daily --target /tmp/odos-restore
cd "$(find /tmp/odos-restore -name SHA256SUMS -printf '%h\n' | head -n 1)" && sha256sum -c SHA256SUMS

# 2. Configuration et clés JWT
tar xzf config.tar.gz -C ~                      # → ~/odos-config
mkdir -p ~/odos-config/jwt && tar xzf jwt.tar.gz -C ~/odos-config/jwt
sudo chown 82:82 ~/odos-config/jwt/*.pem && sudo chmod 640 ~/odos-config/jwt/*.pem

# 3. Démarrer la pile puis restaurer base et uploads
cd ~/ODos && export COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml
docker compose up -d --build
zcat "$OLDPWD/db.sql.gz" | docker compose exec -T postgres sh -c 'psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER:-odos}" "${POSTGRES_DB:-odos}"'
docker compose exec -T php sh -c 'tar xzf - -C /app/public/uploads' < "$OLDPWD/uploads.tar.gz"
docker compose exec -T php php bin/console doctrine:migrations:migrate --no-interaction --env=prod
```

Puis nginx hôte + certificats ([RUNBOOK_NGINX.md](RUNBOOK_NGINX.md)), DNS, et `rm -rf /tmp/odos-restore`.
