#!/usr/bin/env bash

set -euo pipefail

usage() {
  printf 'Usage: %s [--env-file PATH] [--app APP_NAME]\n' "$0"
  printf 'Example: %s --env-file .env.production --app boomerbill-api\n' "$0"
}

ENV_FILE=".env"
APP_NAME=""

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

if [[ ! -f "$ENV_FILE" ]]; then
  printf 'Env file not found: %s\n' "$ENV_FILE" >&2
  exit 1
fi

if ! command -v fly >/dev/null 2>&1; then
  printf 'Fly CLI not found. Install from https://fly.io/docs/flyctl/install/\n' >&2
  exit 1
fi

trim() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

declare -A ENV_VARS

while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line%$'\r'}"
  [[ -z "$line" ]] && continue
  [[ "${line:0:1}" == "#" ]] && continue
  [[ "$line" != *=* ]] && continue

  key="${line%%=*}"
  value="${line#*=}"

  key="$(trim "$key")"

  if [[ "$value" == \"*\" && "$value" == *\" ]]; then
    value="${value:1:${#value}-2}"
  elif [[ "$value" == \'.*\' && "$value" == *\' ]]; then
    value="${value:1:${#value}-2}"
  fi

  ENV_VARS["$key"]="$value"
done < "$ENV_FILE"

if [[ -z "$APP_NAME" && -n "${ENV_VARS[FLY_APP]:-}" ]]; then
  APP_NAME="${ENV_VARS[FLY_APP]}"
fi

SECRET_KEYS=(
  DJANGO_SECRET_KEY
  DJANGO_DEBUG
  DJANGO_ALLOWED_HOSTS
  DATABASE_URL
  DATABASE_SSL_REQUIRE
  FRONTEND_ORIGIN
  PUBLIC_DOMAIN
  SITE_NAME
  PASSWORD_RESET_CONFIRM_URL
  EMAIL_PROVIDER
  EMAIL_HOST
  EMAIL_PORT
  EMAIL_HOST_USER
  EMAIL_HOST_PASSWORD
  EMAIL_USE_TLS
  EMAIL_USE_SSL
  EMAIL_TIMEOUT
  DEFAULT_FROM_EMAIL
)

declare -a SECRET_ARGS=()

for key in "${SECRET_KEYS[@]}"; do
  value="${ENV_VARS[$key]:-}"
  if [[ -n "$value" ]]; then
    SECRET_ARGS+=("${key}=${value}")
  fi
done

if [[ ${#SECRET_ARGS[@]} -eq 0 ]]; then
  printf 'No secret keys found in %s\n' "$ENV_FILE" >&2
  exit 1
fi

declare -a CMD=(fly secrets set)
CMD+=("${SECRET_ARGS[@]}")

if [[ -n "$APP_NAME" ]]; then
  CMD+=(--app "$APP_NAME")
fi

printf 'Setting %d Fly secrets from %s\n' "${#SECRET_ARGS[@]}" "$ENV_FILE"
if [[ -n "$APP_NAME" ]]; then
  printf 'Target app: %s\n' "$APP_NAME"
fi

"${CMD[@]}"
