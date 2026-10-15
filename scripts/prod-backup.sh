#!/usr/bin/env bash
# Sauvegarde quotidienne ODOS : base Postgres + uploads + config (secrets, clés JWT).
# À lancer en tant que deploy (accès Docker + ~/odos-config). Installation :
#   sudo crontab -u deploy -e
#   15 3 * * * /home/deploy/ODos/scripts/prod-backup.sh >> /home/deploy/odos-backups/backup.log 2>&1
#
# Restauration (depuis ~/ODos, avec COMPOSE_FILE comme ci-dessous) :
#   zcat db.sql.gz | docker compose exec -T postgres sh -c 'psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER:-odos}" "${POSTGRES_DB:-odos}"'
#   docker compose exec -T php sh -c 'tar xzf - -C /app/public/uploads' < uploads.tar.gz

set -euo pipefail
umask 077

APP_PATH="${ODOS_APP_PATH:-${HOME}/ODos}"
CONFIG_DIR="${ODOS_CONFIG_DIR:-${HOME}/odos-config}"
BACKUP_ROOT="${ODOS_BACKUP_DIR:-${HOME}/odos-backups}"
KEEP_DAILY="${KEEP_DAILY:-7}"
KEEP_WEEKLY="${KEEP_WEEKLY:-4}"

cd "${APP_PATH}"
export COMPOSE_FILE="docker-compose.yml:docker-compose.prod.yml"

STAMP="$(date +%Y%m%d-%H%M)"
DEST="${BACKUP_ROOT}/daily/${STAMP}"
mkdir -p "${DEST}" "${BACKUP_ROOT}/weekly"

echo "[$(date -Is)] Début sauvegarde -> ${DEST}"

docker compose exec -T postgres sh -c 'pg_dump --clean --if-exists -U "${POSTGRES_USER:-odos}" "${POSTGRES_DB:-odos}"' \
  | gzip > "${DEST}/db.sql.gz"
# nginx monte le volume des uploads en lecture seule : pas besoin d'image supplémentaire.
docker compose exec -T nginx tar czf - -C /app/public/uploads . > "${DEST}/uploads.tar.gz"
tar czf "${DEST}/config.tar.gz" -C "$(dirname "${CONFIG_DIR}")" "$(basename "${CONFIG_DIR}")"

for f in db.sql.gz uploads.tar.gz config.tar.gz; do
  gzip -t "${DEST}/${f}"
done
if ! zcat "${DEST}/db.sql.gz" | tail -n 5 | grep -q "PostgreSQL database dump complete"; then
  echo "[$(date -Is)] ERREUR : dump Postgres incomplet" >&2
  exit 1
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

echo "[$(date -Is)] Sauvegarde OK ($(du -sh "${DEST}" | cut -f1))"
