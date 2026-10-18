#!/usr/bin/env bash
# Sauvegarde quotidienne ODOS : base Postgres + uploads + config (secrets, clés JWT).
# À lancer en tant que deploy (accès Docker + ~/odos-config). Installation :
#   sudo crontab -u deploy -e
#   15 3 * * * /home/deploy/ODos/scripts/prod-backup.sh >> /home/deploy/odos-backups/backup.log 2>&1
#
# Copie hors site chiffrée (restic), ping healthchecks.io et métrique pour
# node-exporter : activés par ~/odos-config/backup.env (modèle : scripts/backup.env.example).
# Sans ce fichier, la sauvegarde reste locale comme avant.
# Installation, restauration et test de restauration : docs/ops/RUNBOOK_SAUVEGARDES.md
#
# Restauration rapide (depuis ~/ODos, avec COMPOSE_FILE comme ci-dessous) :
#   zcat db.sql.gz | docker compose exec -T postgres sh -c 'psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER:-odos}" "${POSTGRES_DB:-odos}"'
#   docker compose exec -T php sh -c 'tar xzf - -C /app/public/uploads' < uploads.tar.gz
#   config.tar.gz → ~/odos-config ; jwt.tar.gz → ~/odos-config/jwt (propriétaire 82:82, mode 640)

set -Eeuo pipefail
umask 077

APP_PATH="${ODOS_APP_PATH:-${HOME}/ODos}"
CONFIG_DIR="${ODOS_CONFIG_DIR:-${HOME}/odos-config}"
BACKUP_ENV="${ODOS_BACKUP_ENV:-${CONFIG_DIR}/backup.env}"

# Réglages hors repo (dépôt restic, mot de passe, URL de ping). Lu avant les
# valeurs par défaut pour pouvoir les surcharger.
if [ -f "${BACKUP_ENV}" ]; then
  set -a
  # shellcheck source=/dev/null
  . "${BACKUP_ENV}"
  set +a
fi

BACKUP_ROOT="${ODOS_BACKUP_DIR:-${HOME}/odos-backups}"
KEEP_DAILY="${KEEP_DAILY:-7}"
KEEP_WEEKLY="${KEEP_WEEKLY:-4}"
# Dumps faits par chaque déploiement (deploy-prod.yml), non compressés : purgés au-delà.
KEEP_PREDEPLOY_DAYS="${KEEP_PREDEPLOY_DAYS:-14}"
OFFSITE_KEEP_DAILY="${OFFSITE_KEEP_DAILY:-7}"
OFFSITE_KEEP_WEEKLY="${OFFSITE_KEEP_WEEKLY:-5}"
OFFSITE_KEEP_MONTHLY="${OFFSITE_KEEP_MONTHLY:-6}"
TEXTFILE_DIR="${NODE_EXPORTER_TEXTFILE_DIR:-/var/lib/node_exporter/textfile}"
METRICS_FILE="${TEXTFILE_DIR}/odos_backup.prom"
HC_PING_URL="${HC_BACKUP_PING_URL:-}"

cd "${APP_PATH}"
export COMPOSE_FILE="docker-compose.yml:docker-compose.prod.yml"

STARTED_AT="$(date +%s)"
STAMP="$(date +%Y%m%d-%H%M)"
DEST="${BACKUP_ROOT}/daily/${STAMP}"
mkdir -p "${DEST}" "${BACKUP_ROOT}/weekly"

log() { echo "[$(date -Is)] $*"; }

# Ping healthchecks.io (/start, succès, /fail). Jamais bloquant : une panne de
# healthchecks.io ne doit pas faire échouer la sauvegarde.
hc_ping() {
  [ -n "${HC_PING_URL}" ] || return 0
  curl -fsS -m 10 --retry 3 -o /dev/null --data-raw "${2:-}" "${HC_PING_URL}${1}" \
    || log "AVERTISSEMENT : ping healthchecks${1:- (succès)} impossible" >&2
}

# Métriques lues par node-exporter (collecteur textfile). On repart des valeurs
# précédentes pour qu'un échec ne remette pas à zéro la dernière réussite.
prev_metric() {
  [ -r "${METRICS_FILE}" ] || { echo 0; return; }
  awk -v m="$1" '$1 == m { print $2; found=1 } END { if (!found) print 0 }' "${METRICS_FILE}"
}
LAST_OK="$(prev_metric odos_backup_last_success_timestamp_seconds)"
LAST_OFFSITE_OK="$(prev_metric odos_backup_offsite_last_success_timestamp_seconds)"
LAST_SIZE="$(prev_metric odos_backup_size_bytes)"
OFFSITE_ENABLED=0
if [ -n "${RESTIC_REPOSITORY:-}" ]; then OFFSITE_ENABLED=1; fi

write_metrics() {
  local success="$1" now
  [ -d "${TEXTFILE_DIR}" ] && [ -w "${TEXTFILE_DIR}" ] || return 0
  now="$(date +%s)"
  # Écriture atomique (mv dans le même dossier) : node-exporter ne lit jamais un fichier à moitié écrit.
  cat > "${METRICS_FILE}.$$" <<EOF
# HELP odos_backup_last_success_timestamp_seconds Fin de la dernière sauvegarde locale réussie.
# TYPE odos_backup_last_success_timestamp_seconds gauge
odos_backup_last_success_timestamp_seconds ${LAST_OK}
# HELP odos_backup_offsite_last_success_timestamp_seconds Fin de la dernière copie hors site réussie.
# TYPE odos_backup_offsite_last_success_timestamp_seconds gauge
odos_backup_offsite_last_success_timestamp_seconds ${LAST_OFFSITE_OK}
# HELP odos_backup_offsite_enabled 1 si la copie hors site (restic) est configurée.
# TYPE odos_backup_offsite_enabled gauge
odos_backup_offsite_enabled ${OFFSITE_ENABLED}
# HELP odos_backup_size_bytes Taille de la dernière sauvegarde locale réussie.
# TYPE odos_backup_size_bytes gauge
odos_backup_size_bytes ${LAST_SIZE}
# HELP odos_backup_last_run_timestamp_seconds Fin de la dernière exécution (réussie ou non).
# TYPE odos_backup_last_run_timestamp_seconds gauge
odos_backup_last_run_timestamp_seconds ${now}
# HELP odos_backup_last_run_success 1 si la dernière exécution a réussi.
# TYPE odos_backup_last_run_success gauge
odos_backup_last_run_success ${success}
# HELP odos_backup_last_run_duration_seconds Durée de la dernière exécution.
# TYPE odos_backup_last_run_duration_seconds gauge
odos_backup_last_run_duration_seconds $((now - STARTED_AT))
EOF
  chmod 644 "${METRICS_FILE}.$$"
  mv -f "${METRICS_FILE}.$$" "${METRICS_FILE}"
}

# Une sauvegarde locale incomplète ne doit pas compter dans la rétention. Si
# seule la copie hors site échoue, la sauvegarde locale (valide) est gardée.
LOCAL_DONE=0
on_error() {
  local line="$1" what="sauvegarde locale"
  trap - ERR
  if [ "${LOCAL_DONE}" = "1" ]; then
    what="copie hors site"
    log "ERREUR (ligne ${line}) : copie hors site en échec, sauvegarde locale conservée" >&2
  else
    log "ERREUR (ligne ${line}) : sauvegarde incomplète supprimée" >&2
    rm -rf "${DEST}"
  fi
  write_metrics 0 || true
  hc_ping /fail "ODOS : ${what} en échec à la ligne ${line}, voir ~/odos-backups/backup.log"
}
trap 'on_error ${LINENO}' ERR

log "Début sauvegarde -> ${DEST}"
hc_ping /start

docker compose exec -T postgres sh -c 'pg_dump --clean --if-exists -U "${POSTGRES_USER:-odos}" "${POSTGRES_DB:-odos}"' \
  | gzip > "${DEST}/db.sql.gz"
# nginx monte le volume des uploads en lecture seule : pas besoin d'image supplémentaire.
docker compose exec -T nginx tar czf - -C /app/public/uploads . > "${DEST}/uploads.tar.gz"
tar czf "${DEST}/config.tar.gz" -C "$(dirname "${CONFIG_DIR}")" --exclude="$(basename "${CONFIG_DIR}")/jwt" "$(basename "${CONFIG_DIR}")"
# Les clés JWT appartiennent à www-data (uid 82, 640) : lues via le conteneur php qui les monte.
docker compose exec -T php tar czf - -C /app/config/jwt private.pem public.pem > "${DEST}/jwt.tar.gz"

for f in db.sql.gz uploads.tar.gz config.tar.gz jwt.tar.gz; do
  gzip -t "${DEST}/${f}"
done
if ! zcat "${DEST}/db.sql.gz" | tail -n 5 | grep -q "PostgreSQL database dump complete"; then
  log "ERREUR : dump Postgres incomplet" >&2
  false
fi
(cd "${DEST}" && sha256sum ./*.gz > SHA256SUMS)

# Copie hebdomadaire le dimanche.
if [ "$(date +%u)" = "7" ]; then
  cp -a "${DEST}" "${BACKUP_ROOT}/weekly/${STAMP}"
fi

# Rétention : garde les N dossiers les plus récents (noms horodatés, donc tri alphabétique).
prune() {
  find "$1" -mindepth 1 -maxdepth 1 -type d | sort | head -n -"$2" | xargs -r rm -rf
}
prune "${BACKUP_ROOT}/daily" "${KEEP_DAILY}"
prune "${BACKUP_ROOT}/weekly" "${KEEP_WEEKLY}"
find "${BACKUP_ROOT}" -maxdepth 1 -type f -name 'predeploy-*.sql' -mtime +"${KEEP_PREDEPLOY_DAYS}" -delete

LAST_OK="$(date +%s)"
LAST_SIZE="$(du -sb "${DEST}" | cut -f1)"
LOCAL_DONE=1
log "Sauvegarde locale OK ($(du -sh "${DEST}" | cut -f1))"

# Copie hors site : restic chiffre côté VPS (AES-256) avant l'envoi ; le
# stockage distant ne voit jamais les données en clair. Le dépôt, le mot de
# passe et les identifiants viennent de backup.env (RESTIC_REPOSITORY,
# RESTIC_PASSWORD_FILE, B2_ACCOUNT_ID/B2_ACCOUNT_KEY ou AWS_* selon le stockage).
if [ "${OFFSITE_ENABLED}" = "1" ]; then
  # Le chemin change chaque jour (dossier horodaté) : on regroupe par hôte + tag
  # pour que la rétention porte sur l'ensemble des instantanés.
  restic backup --retry-lock 10m --quiet --host odos-vps --tag odos-daily "${DEST}"
  restic forget --retry-lock 10m --quiet --host odos-vps --tag odos-daily --group-by host,tags \
    --keep-daily "${OFFSITE_KEEP_DAILY}" --keep-weekly "${OFFSITE_KEEP_WEEKLY}" \
    --keep-monthly "${OFFSITE_KEEP_MONTHLY}" --prune
  # Le dimanche, relit 10 % des données distantes pour détecter une corruption.
  if [ "$(date +%u)" = "7" ]; then
    restic check --retry-lock 10m --read-data-subset=10%
  fi
  LAST_OFFSITE_OK="$(date +%s)"
  log "Copie hors site OK (${RESTIC_REPOSITORY%%:*})"
else
  log "AVERTISSEMENT : pas de copie hors site (RESTIC_REPOSITORY absent de ${BACKUP_ENV})" >&2
fi

write_metrics 1
hc_ping "" "Sauvegarde ODOS OK, ${LAST_SIZE} octets, hors site=${OFFSITE_ENABLED}"
log "Sauvegarde OK"
