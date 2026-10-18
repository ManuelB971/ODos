#!/usr/bin/env bash
# Test de restauration ODOS, sans toucher à la prod : restaure une sauvegarde
# dans un Postgres jetable (sans réseau, données en tmpfs) et compare quelques
# comptages avec la base de prod. N'affiche que des nombres, aucune donnée perso.
#
# À lancer en tant que deploy, une fois par mois et après tout changement du
# script de sauvegarde :
#   ~/ODos/scripts/prod-restore-test.sh            # dernière sauvegarde locale
#   ~/ODos/scripts/prod-restore-test.sh offsite    # dernier instantané restic (hors site)
#
# Procédure complète : docs/ops/RUNBOOK_SAUVEGARDES.md

set -Eeuo pipefail
umask 077

SOURCE="${1:-local}"
APP_PATH="${ODOS_APP_PATH:-${HOME}/ODos}"
CONFIG_DIR="${ODOS_CONFIG_DIR:-${HOME}/odos-config}"
BACKUP_ENV="${ODOS_BACKUP_ENV:-${CONFIG_DIR}/backup.env}"
if [ -f "${BACKUP_ENV}" ]; then
  set -a
  # shellcheck source=/dev/null
  . "${BACKUP_ENV}"
  set +a
fi
BACKUP_ROOT="${ODOS_BACKUP_DIR:-${HOME}/odos-backups}"
CONTAINER="odos-restore-test"
WORK="$(mktemp -d)"

cleanup() {
  docker rm -f "${CONTAINER}" >/dev/null 2>&1 || true
  rm -rf "${WORK}"
}
trap cleanup EXIT

log() { echo "[$(date -Is)] $*"; }

case "${SOURCE}" in
  local)
    SRC="$(find "${BACKUP_ROOT}/daily" -mindepth 1 -maxdepth 1 -type d | sort | tail -n 1)"
    [ -n "${SRC}" ] || { log "Aucune sauvegarde dans ${BACKUP_ROOT}/daily" >&2; exit 1; }
    cp -a "${SRC}/." "${WORK}/"
    ;;
  offsite)
    [ -n "${RESTIC_REPOSITORY:-}" ] || { log "RESTIC_REPOSITORY absent de ${BACKUP_ENV}" >&2; exit 1; }
    restic snapshots --host odos-vps --tag odos-daily --latest 3
    restic restore latest --host odos-vps --tag odos-daily --target "${WORK}/restic"
    SRC="$(find "${WORK}/restic" -name SHA256SUMS -printf '%h\n' | head -n 1)"
    [ -n "${SRC}" ] || { log "Instantané restic sans SHA256SUMS" >&2; exit 1; }
    mv "${SRC}"/* "${WORK}/"
    ;;
  *)
    echo "Usage : $0 [local|offsite]" >&2
    exit 2
    ;;
esac

log "Sauvegarde testée : ${SRC}"
(cd "${WORK}" && sha256sum -c --quiet SHA256SUMS)
log "Sommes SHA-256 OK"
for f in uploads.tar.gz config.tar.gz jwt.tar.gz; do
  echo "  ${f} : $(tar tzf "${WORK}/${f}" | wc -l) entrées"
done

docker run -d --rm --name "${CONTAINER}" --network none \
  --tmpfs /var/lib/postgresql/data:rw,size=1g \
  -e POSTGRES_USER=odos -e POSTGRES_DB=odos -e POSTGRES_PASSWORD="$(openssl rand -hex 16)" \
  postgres:16-alpine >/dev/null
# Via TCP (127.0.0.1) : le serveur temporaire de l'init de l'image n'écoute que
# sur le socket Unix, donc on attend le vrai démarrage.
for _ in $(seq 1 60); do
  docker exec "${CONTAINER}" pg_isready -h 127.0.0.1 -U odos -d odos -q 2>/dev/null && break
  sleep 1
done

START="$(date +%s)"
zcat "${WORK}/db.sql.gz" | docker exec -i "${CONTAINER}" psql -q -v ON_ERROR_STOP=1 -U odos -d odos >/dev/null
log "Base restaurée en $(( $(date +%s) - START )) s"

QUERY="SELECT 'tables', count(*)::text FROM information_schema.tables WHERE table_schema = 'public'
UNION ALL SELECT 'user', count(*)::text FROM \"user\"
UNION ALL SELECT 'activity', count(*)::text FROM activity
UNION ALL SELECT 'category', count(*)::text FROM category
UNION ALL SELECT 'migration', max(version) FROM doctrine_migration_versions;"

export COMPOSE_FILE="docker-compose.yml:docker-compose.prod.yml"
echo
printf '%-12s %-28s %s\n' "" "restauré" "prod (maintenant)"
paste \
  <(docker exec "${CONTAINER}" psql -At -F ' ' -U odos -d odos -c "${QUERY}") \
  <(cd "${APP_PATH}" && docker compose exec -T postgres sh -c 'psql -At -F " " -U "${POSTGRES_USER:-odos}" "${POSTGRES_DB:-odos}" -c "$0"' "${QUERY}" | cut -d' ' -f2-) \
  | awk '{ printf "%-12s %-28s %s\n", $1, $2, $3 }'
echo
log "Test de restauration terminé. Écarts attendus : ce qui a changé depuis la sauvegarde."
