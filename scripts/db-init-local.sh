#!/usr/bin/env bash
set -euo pipefail

# Creates the local Gerpain role + database on an existing Postgres install.
# Uses peer/trust auth via psql (no password) — run as a superuser-capable OS user.

DB_USER="${DB_USER:-gerpain}"
DB_PASSWORD="${DB_PASSWORD:-gerpain}"
DB_NAME="${DB_NAME:-gerpain_dev}"
PSQL="${PSQL:-psql postgres}"

echo "Ensuring role ${DB_USER}…"
$PSQL -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;
SQL

echo "Ensuring database ${DB_NAME}…"
if ! $PSQL -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  $PSQL -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
else
  echo "Database ${DB_NAME} already exists."
fi

$PSQL -v ON_ERROR_STOP=1 -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"

echo "Local database ready: postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"
