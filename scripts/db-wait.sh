#!/usr/bin/env bash
set -euo pipefail

container="${DB_CONTAINER:-gerpain-postgres}"
user="${DB_USER:-gerpain}"
db="${DB_NAME:-gerpain_dev}"

echo "Waiting for Postgres (${container})…"

for i in $(seq 1 60); do
  if docker exec "$container" pg_isready -U "$user" -d "$db" >/dev/null 2>&1; then
    echo "Postgres is ready."
    exit 0
  fi
  sleep 1
done

echo "Timed out waiting for Postgres in container ${container}." >&2
exit 1
