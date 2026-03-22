#!/usr/bin/env bash

set -euo pipefail

usage() {
  printf 'Usage: %s --env-file PATH --app APP_NAME [--api-url URL]\n' "$0"
  printf 'Example: %s --env-file .env.production --app boomerbill-api --api-url https://boomerbill-api.fly.dev\n' "$0"
}

ENV_FILE=""
APP_NAME=""
API_URL=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --app)
      APP_NAME="$2"
      shift 2
      ;;
    --api-url)
      API_URL="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown argument: %s\n' "$1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$ENV_FILE" || -z "$APP_NAME" ]]; then
  usage
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  printf 'Env file not found: %s\n' "$ENV_FILE" >&2
  exit 1
fi

if ! command -v fly >/dev/null 2>&1; then
  printf 'Fly CLI not found. Install from https://fly.io/docs/flyctl/install/\n' >&2
  exit 1
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

printf '\n[1/5] Setting Fly secrets from %s\n' "$ENV_FILE"
"$SCRIPT_DIR/fly-secrets-from-env.sh" --env-file "$ENV_FILE" --app "$APP_NAME"

printf '\n[2/5] Deploying app %s\n' "$APP_NAME"
fly deploy --app "$APP_NAME"

printf '\n[3/5] Migration step\n'
printf 'Using fly.toml release_command to run migrations during deploy.\n'

printf '\n[4/5] App status\n'
fly status --app "$APP_NAME"

if [[ -n "$API_URL" ]]; then
  printf '\n[5/5] Public endpoint smoke checks\n'
  curl -fsS "$API_URL/api/public/messages/" >/dev/null
  curl -fsS "$API_URL/api/public/wall/boomers/" >/dev/null
  printf 'Public endpoints OK: %s\n' "$API_URL"
else
  printf '\n[5/5] Skipping API smoke checks (no --api-url provided)\n'
fi

printf '\nRelease script complete.\n'
printf 'Next: deploy frontend and run auth/sync manual smoke tests.\n'
