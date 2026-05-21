## Backend Setup

### 1) Install deps

```bash
uv sync
```

### 2) Run migrations

```bash
uv run python manage.py migrate
```

### 3) Run server

```bash
uv run python manage.py runserver
```

Default local backend URL is `http://127.0.0.1:8000` (also reachable at `http://localhost:8000`).
Frontend dev server runs on `http://localhost:4321`.

### Quick local auth connectivity checks

```bash
# Check backend process is listening on 8000
curl -i http://127.0.0.1:8000/api/auth/users/

# Verify auth endpoint route is registered
curl -i -X POST http://127.0.0.1:8000/api/auth/token/login/ \
  -H 'Content-Type: application/json' \
  --data '{"username":"invalid","password":"invalid"}'
```

## Production Runtime Security Requirements

When `DJANGO_DEBUG=False`, the app enforces production-safe startup checks.

- `DJANGO_SECRET_KEY` must be set to a real secret.
- `DJANGO_ALLOWED_HOSTS` must be explicitly set (comma-separated list).
- If `EMAIL_PROVIDER=smtp`, `EMAIL_HOST_PASSWORD` must be set.
- `DATABASE_URL` should be set to Postgres in production.
- `DATABASE_SSL_REQUIRE=True` enables `sslmode=require` for Postgres.
- At least one auth mode must be enabled: `ENABLE_LEGACY_TOKEN_AUTH` or `ENABLE_JWT_AUTH`.
- `JWT_BLACKLIST_AFTER_ROTATION=True` requires `JWT_ROTATE_REFRESH_TOKENS=True`.
- Wildcard CORS is blocked (`*` is not allowed in `CORS_ALLOWED_ORIGINS`).
- If `CORS_ALLOW_CREDENTIALS=True` in production, explicit `CORS_ALLOWED_ORIGINS` are required.

Local development remains functional without `DATABASE_URL`; sqlite is used by default.

## Auth migration mode (legacy token + JWT)

Backend supports dual-mode auth for a safe migration path:

- `AUTH_MODE=dual` (default): enables both legacy token and JWT auth.
- `AUTH_MODE=legacy_token`: only legacy token auth.
- `AUTH_MODE=jwt`: only JWT auth.

You can also explicitly override with `ENABLE_LEGACY_TOKEN_AUTH` and `ENABLE_JWT_AUTH`.
Legacy compatibility endpoints remain available by default (`/api/auth/token/login/`, `/api/auth/token/logout/`) while JWT endpoints are enabled (`/api/auth/jwt/create/`, `/api/auth/jwt/refresh/`, `/api/auth/jwt/verify/`).

## Local CORS defaults

When `DJANGO_DEBUG=True`, backend automatically allows CORS and CSRF trusted origins for:

- `http://localhost:4321`
- `http://127.0.0.1:4321`

Override or extend with:

- `DEV_CORS_ALLOWED_ORIGINS`
- `DEV_CSRF_TRUSTED_ORIGINS`

Production still requires explicit environment configuration (`CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`) and keeps wildcard origins blocked.

### Validation commands

```bash
# Fails: production mode without required secret key
DJANGO_DEBUG=False DJANGO_ALLOWED_HOSTS=example.com uv run python manage.py check

# Fails: production mode with placeholder secret key
DJANGO_DEBUG=False DJANGO_SECRET_KEY=replace-with-strong-secret DJANGO_ALLOWED_HOSTS=example.com uv run python manage.py check

# Fails: smtp configured without SMTP password
DJANGO_DEBUG=False DJANGO_SECRET_KEY=real-secret DJANGO_ALLOWED_HOSTS=example.com EMAIL_PROVIDER=smtp EMAIL_HOST=smtp.sendgrid.net EMAIL_HOST_PASSWORD= uv run python manage.py check

# Passes: local dev defaults (sqlite)
DJANGO_DEBUG=True uv run python manage.py check

# Passes: production-like config with required values
DJANGO_DEBUG=False DJANGO_SECRET_KEY=real-secret DJANGO_ALLOWED_HOSTS=example.com DATABASE_SSL_REQUIRE=True uv run python manage.py check

# Fails: both auth modes disabled
DJANGO_DEBUG=False DJANGO_SECRET_KEY=real-secret DJANGO_ALLOWED_HOSTS=example.com ENABLE_JWT_AUTH=False ENABLE_LEGACY_TOKEN_AUTH=False uv run python manage.py check

# Fails: invalid JWT rotation/blacklist combination
DJANGO_DEBUG=False DJANGO_SECRET_KEY=real-secret DJANGO_ALLOWED_HOSTS=example.com ENABLE_JWT_AUTH=True JWT_ROTATE_REFRESH_TOKENS=False JWT_BLACKLIST_AFTER_ROTATION=True uv run python manage.py check

# Passes: dual-mode transition (recommended rollout default)
DJANGO_DEBUG=False DJANGO_SECRET_KEY=real-secret DJANGO_ALLOWED_HOSTS=example.com AUTH_MODE=dual ENABLE_JWT_AUTH=True ENABLE_LEGACY_TOKEN_AUTH=True uv run python manage.py check
```

See `backend/SECURITY_RUNBOOK.md` for secret rotation and incident response checklists.

## Djoser JWT Migration (Issue 43)

- Default rollout is **dual-mode** (`AUTH_MODE=dual`) to avoid frontend/backend breakage.
- Legacy token endpoints remain available while JWT clients are deployed.
- JWT endpoints are enabled via `djoser.urls.jwt` when `ENABLE_JWT_AUTH=True`.
- Rollback is one env change: set `ENABLE_JWT_AUTH=False` (or `AUTH_MODE=legacy`) and redeploy.

## SendGrid SMTP on Fly

BoomerBill uses Django + Djoser for password recovery emails. No email SDK is needed; Django SMTP is enough.

### Option A: Set secrets manually

```bash
fly secrets set \
DJANGO_SECRET_KEY="REPLACE_ME" \
DJANGO_DEBUG=false \
DJANGO_ALLOWED_HOSTS="your-fly-app.fly.dev" \
FRONTEND_ORIGIN="https://boomerbill.net" \
PUBLIC_DOMAIN="boomerbill.net" \
PASSWORD_RESET_CONFIRM_URL="reset-password?uid={uid}&token={token}" \
DATABASE_URL="postgres://..." \
EMAIL_PROVIDER=smtp \
EMAIL_HOST="smtp.sendgrid.net" \
EMAIL_PORT=587 \
EMAIL_HOST_USER="apikey" \
EMAIL_HOST_PASSWORD="SG.REPLACE_ME" \
EMAIL_USE_TLS=true \
DEFAULT_FROM_EMAIL="BoomerBill <noreply@boomerbill.net>"
```

### Option B: Load secrets from `.env` with script

1) Copy and fill the template:

```bash
cp .env.example .env.production
```

2) Run helper script:

```bash
./scripts/fly-secrets-from-env.sh --env-file .env.production --app your-fly-app
```

If you include `FLY_APP=your-fly-app` in your env file, `--app` is optional.

### Option C: Run full backend release script

This sets secrets, deploys, runs migrations, and verifies migration state in one flow.

```bash
./scripts/fly-release.sh --env-file .env.production --app your-fly-app --api-url https://your-fly-app.fly.dev
```

### Verify reset flow

1. Create a user with email.
2. Trigger password reset from app settings or `/api/auth/users/reset_password/`.
3. Confirm SendGrid activity shows sent mail.
4. Open reset link and complete `/reset-password` flow.

### DNS for deliverability (Netlify DNS)

In SendGrid domain authentication, add SPF and DKIM records for `boomerbill.net`. Without these, reset emails may go to spam.
