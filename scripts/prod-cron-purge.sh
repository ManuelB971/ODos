#!/usr/bin/env bash
# Cron de rétention RGPD (Sprint 2) — à installer sur le VPS Contabo.
# Exemple crontab (root ou deploy user) :
#   0 3 * * * /opt/odos/scripts/prod-cron-purge.sh >> /var/log/odos-retention.log 2>&1

set -euo pipefail

APP_PATH="${ODOS_APP_PATH:-/opt/odos}"
cd "${APP_PATH}"

export COMPOSE_FILE="docker-compose.yml:docker-compose.prod.yml"

echo "[$(date -Is)] Début purge rétention ODOS"

docker compose exec -T php php bin/console app:data-retention:purge --no-interaction --env=prod

echo "[$(date -Is)] Purge terminée"
