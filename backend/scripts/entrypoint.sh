#!/usr/bin/env bash
#
# Container entrypoint for the BoomerBill backend.
#
# Runs database migrations before starting Gunicorn.
#
# Environment variables:
#   SKIP_MIGRATIONS   Set to "1" or "true" to skip migrations (useful for
#                     one-off admin tasks like createsuperuser, shell, etc.)
#   MIGRATION_TIMEOUT Seconds to wait for migration to complete (default: 120)
#   PORT              Port Gunicorn binds to (default: 8000)
#   WORKERS           Number of Gunicorn workers (default: 2)
#
# Usage:
#   # Normal startup (migrate then serve)
#   /app/scripts/entrypoint.sh
#
#   # One-off admin task (skip migrations)
#   SKIP_MIGRATIONS=1 /app/scripts/entrypoint.sh python manage.py createsuperuser
#
#   # Override default command entirely when first arg is a known executable
#   /app/scripts/entrypoint.sh python manage.py shell

set -euo pipefail

MANAGE_DIR="/app/core"
MIGRATION_TIMEOUT="${MIGRATION_TIMEOUT:-120}"
PORT="${PORT:-8000}"
WORKERS="${WORKERS:-2}"

# ---------------------------------------------------------------------------
# Helper: run migrations with a timeout
# ---------------------------------------------------------------------------
run_migrations() {
  echo "[entrypoint] Running database migrations (timeout: ${MIGRATION_TIMEOUT}s)..."
  if timeout "${MIGRATION_TIMEOUT}" \
       uv run python "${MANAGE_DIR}/manage.py" migrate --noinput; then
    echo "[entrypoint] Migrations completed successfully."
  else
    exit_code=$?
    if [[ $exit_code -eq 124 ]]; then
      echo "[entrypoint] ERROR: Migrations timed out after ${MIGRATION_TIMEOUT}s." >&2
    else
      echo "[entrypoint] ERROR: Migrations failed with exit code ${exit_code}." >&2
    fi
    exit $exit_code
  fi
}

# ---------------------------------------------------------------------------
# Helper: collect static assets
# ---------------------------------------------------------------------------
collect_static() {
  echo "[entrypoint] Collecting static assets..."
  if uv run python "${MANAGE_DIR}/manage.py" collectstatic --noinput; then
    echo "[entrypoint] Static assets collected successfully."
  else
    exit_code=$?
    echo "[entrypoint] ERROR: collectstatic failed with exit code ${exit_code}." >&2
    exit $exit_code
  fi
}

# ---------------------------------------------------------------------------
# Helper: start Gunicorn
# ---------------------------------------------------------------------------
start_gunicorn() {
  echo "[entrypoint] Starting Gunicorn on port ${PORT} with ${WORKERS} worker(s)..."
  exec uv run gunicorn core.wsgi:application \
    --bind "0.0.0.0:${PORT}" \
    --workers "${WORKERS}" \
    --access-logfile - \
    --error-logfile - \
    --timeout 120 \
    --graceful-timeout 30
}

# ---------------------------------------------------------------------------
# Main logic
# ---------------------------------------------------------------------------

# If arguments are provided, treat as an override command.
# This allows one-off tasks like `createsuperuser`, `shell`, `collectstatic`, etc.
if [[ $# -gt 0 ]]; then
  echo "[entrypoint] Override command detected: $*"
  if [[ "${SKIP_MIGRATIONS:-}" =~ ^(1|true|True|TRUE)$ ]]; then
    echo "[entrypoint] SKIP_MIGRATIONS is set, skipping migrations."
  else
    echo "[entrypoint] Running pre-flight migrations before override command..."
    run_migrations
  fi
  exec "$@"
fi

# Normal startup path: collect static, run migrations, then start Gunicorn.
if [[ "${SKIP_MIGRATIONS:-}" =~ ^(1|true|True|TRUE)$ ]]; then
  echo "[entrypoint] SKIP_MIGRATIONS is set, skipping migrations."
  start_gunicorn
else
  collect_static
  run_migrations
  start_gunicorn
fi
