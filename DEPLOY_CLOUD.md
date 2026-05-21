# Cloud Deployment Guide — Single Container + Managed Postgres

> **Issue #25**: Provider-agnostic cloud deployment profile for BoomerBill backend.

This guide covers deploying the BoomerBill Django backend as a **single container** on a cloud PaaS (Fly.io primary) with a **managed PostgreSQL** database. The same patterns apply to Render, Railway, DigitalOcean App Platform, or any container PaaS.

---

## 1) Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Cloud Provider                     │
│                                                      │
│  ┌──────────────┐    ┌──────────────────────────┐   │
│  │  Load Balancer│───▶│  Single Container        │   │
│  │  (TLS + HTTPS)│    │  Django + Gunicorn       │   │
│  └──────────────┘    │  (fly.toml / Dockerfile)  │   │
│                      └──────────┬───────────────┘   │
│                                 │                    │
│                      ┌──────────▼───────────────┐   │
│                      │  Managed Postgres         │   │
│                      │  (Fly Postgres / Supabase)│   │
│                      │  SSL required             │   │
│                      └──────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

- **Compute**: Single container running Django + Gunicorn (1 CPU, 1 GB RAM)
- **Database**: Managed PostgreSQL with connection pooling (PgBouncer)
- **Static files**: Served by WhiteNoise from within the container
- **Email**: External SMTP (SendGrid / Brevo)

---

## 2) Fly.io Deployment

### 2.1 Prerequisites

```bash
# Install Fly CLI
# macOS:  brew install flyctl
# Linux:  curl -L https://fly.io/install.sh | sh
# Windows: powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

fly auth login
```

### 2.2 Existing Configuration

The project already includes a `fly.toml` at `backend/fly.toml`:

```toml
app = 'boomerbill-api'
primary_region = 'iad'
console_command = 'sh -c "cd /app/core && uv run python manage.py shell"'

[env]
  PORT = '8000'

[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 0
  processes = ['app']

[[vm]]
  memory = '1gb'
  cpus = 1
  memory_mb = 1024

[[statics]]
  guest_path = '/app/core/static'
  url_prefix = '/static/'
```

Key notes:
- **`auto_stop_machines = 'stop'`**: Machines sleep when idle (cost savings). First request wakes them (~1-2s cold start).
- **`min_machines_running = 0`**: No always-on machine. Set to `1` if you need consistent response times.
- **`primary_region = 'iad'`**: US East (Ashburn). Change to your target region.

### 2.3 Deploy Steps

```bash
cd backend

# Option A: One-command release (secrets + deploy + verify)
./scripts/fly-release.sh --env-file .env.production --app boomerbill-api --api-url https://boomerbill-api.fly.dev

# Option B: Manual step-by-step
# 1. Set secrets
./scripts/fly-secrets-from-env.sh --env-file .env.production --app boomerbill-api

# 2. Deploy
fly deploy --app boomerbill-api

# 3. Verify
fly status --app boomerbill-api
fly logs --app boomerbill-api
```

### 2.4 Provision Managed Postgres on Fly

```bash
# Create a new Postgres cluster
fly postgres create --name boomerbill-db --region iad --initial-cluster-size 1

# Attach to your app (sets DATABASE_URL secret automatically)
fly postgres attach --postgres-app boomerbill-db --app boomerbill-api

# Verify connection
fly ssh console -C "cd /app/core && uv run python manage.py dbshell"
```

The `fly postgres attach` command automatically sets `DATABASE_URL` as a secret. You still need to set `DATABASE_SSL_REQUIRE=True`.

---

## 3) Required Environment Variables

### 3.1 Mandatory (app will not start without these)

| Variable | Description | Example |
|---|---|---|
| `DJANGO_SECRET_KEY` | Django secret, >= 32 chars, not a placeholder | `openssl rand -base64 48` |
| `DJANGO_DEBUG` | Must be `false` in production | `false` |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated hostnames | `boomerbill-api.fly.dev` |
| `DATABASE_URL` | Postgres connection string | `postgres://user:pass@host:5432/db` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated https origins | `https://boomerbill.net` |
| `CSRF_TRUSTED_ORIGINS` | Comma-separated https origins | `https://boomerbill.net` |

### 3.2 Strongly Recommended

| Variable | Description | Example |
|---|---|---|
| `DATABASE_SSL_REQUIRE` | Enforce SSL for Postgres | `true` |
| `SECURE_SSL_REDIRECT` | Redirect HTTP to HTTPS | `true` |
| `SECURE_HSTS_SECONDS` | HSTS header duration | `3600` |
| `FRONTEND_ORIGIN` | Frontend URL for CORS/email links | `https://boomerbill.net` |
| `PUBLIC_DOMAIN` | Public domain for email links | `boomerbill.net` |
| `SITE_NAME` | Site name in emails | `BoomerBill` |
| `PASSWORD_RESET_CONFIRM_URL` | Password reset URL template | `reset-password?uid={uid}&token={token}` |

### 3.3 Email (SMTP)

| Variable | Description | Example |
|---|---|---|
| `EMAIL_PROVIDER` | Set to `smtp` for production | `smtp` |
| `EMAIL_HOST` | SMTP server | `smtp.sendgrid.net` |
| `EMAIL_PORT` | SMTP port | `587` |
| `EMAIL_HOST_USER` | SMTP username | `apikey` |
| `EMAIL_HOST_PASSWORD` | SMTP password / API key | `SG.xxxxx` |
| `EMAIL_USE_TLS` | Enable TLS | `true` |
| `DEFAULT_FROM_EMAIL` | From address | `BoomerBill <noreply@boomerbill.net>` |

### 3.4 Auth Mode

| Variable | Description | Default |
|---|---|---|
| `AUTH_MODE` | `dual`, `jwt`, or `legacy` | `dual` |
| `ENABLE_JWT_AUTH` | Enable JWT endpoints | `true` |
| `ENABLE_LEGACY_TOKEN_AUTH` | Enable DRF token auth | `true` |

### 3.5 Setting Secrets on Fly

```bash
# All at once (from .env.production)
./scripts/fly-secrets-from-env.sh --env-file .env.production --app boomerbill-api

# Individual secrets
fly secrets set \
  DJANGO_SECRET_KEY="$(openssl rand -base64 48)" \
  DJANGO_DEBUG=false \
  DJANGO_ALLOWED_HOSTS="boomerbill-api.fly.dev" \
  DATABASE_URL="postgres://..." \
  DATABASE_SSL_REQUIRE=true \
  --app boomerbill-api
```

> **Warning**: `fly secrets set` triggers an automatic redeploy. Plan secret rotations during low-traffic windows.

---

## 4) Managed Postgres Connectivity & SSL

### 4.1 Connection String Format

```
postgresql://<user>:<password>@<host>:<port>/<dbname>?sslmode=require
```

Fly.io sets this automatically when you run `fly postgres attach`. For other providers:

| Provider | Connection Pattern | SSL Mode |
|---|---|---|
| **Fly Postgres** | `postgres://user:pass@host.flycast:5432/db` | `require` (via PgBouncer) |
| **Supabase** | `postgresql://postgres.<ref>:pass@aws-0-<region>.pooler.supabase.com:6543/postgres` | `require` |
| **Neon** | `postgresql://user:pass@ep-<id>.<region>.aws.neon.tech/db?sslmode=require` | `require` (built-in) |
| **Render** | `postgresql://user:pass@db-render-<id>:5432/db` | `require` |
| **DigitalOcean** | `postgresql://user:pass@db-<id>.db.ondigitalocean.com:25060/db?sslmode=require` | `require` |

### 4.2 SSL Configuration

The Django settings automatically apply `sslmode=require` when:
- Database engine is PostgreSQL
- `DATABASE_SSL_REQUIRE=True`

```python
# From settings.py (lines 114-118)
if (
    DATABASES["default"]["ENGINE"] == "django.db.backends.postgresql"
    and env.bool("DATABASE_SSL_REQUIRE", default=False)
):
    DATABASES["default"].setdefault("OPTIONS", {})["sslmode"] = "require"
```

### 4.3 Connection Pooling

Fly Postgres uses **PgBouncer** by default. Key considerations:

- **Port 5432**: Direct connection (use for migrations, admin tasks)
- **Port 6543**: PgBouncer pooler (use for app connections)
- The `DATABASE_URL` from `fly postgres attach` points to the pooler

For high-traffic scenarios, tune pooler settings:
```bash
fly pg config update --pooler-enabled=true --pooler-pool-size=25 --app boomerbill-db
```

### 4.4 Connection Troubleshooting

```bash
# Test connectivity from the container
fly ssh console -C "cd /app/core && uv run python -c \"
import os, dj_database_url
from django.conf import settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django; django.setup()
from django.db import connection
cursor = connection.cursor()
cursor.execute('SELECT version();')
print(cursor.fetchone())
\""

# Check PgBouncer stats (Fly Postgres)
fly ssh console --app boomerbill-db -C "psql -U fly-admin -c 'SHOW pools;'"

# View database logs
fly logs --app boomerbill-db
```

---

## 5) Health Checks Configuration

### 5.1 Fly.io Health Checks

The current `fly.toml` relies on Fly's default TCP health checks. For production, add explicit HTTP health checks:

```toml
[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 0
  processes = ['app']

  [[http_service.checks]]
    grace_period = "10s"
    interval = "15s"
    method = "GET"
    path = "/api/health/"
    protocol = "http"
    timeout = "5s"
    interval = "30s"

  [[http_service.checks]]
    grace_period = "30s"
    interval = "60s"
    method = "GET"
    path = "/api/health/db/"
    protocol = "http"
    timeout = "10s"
```

### 5.2 Health Check Endpoints

The application should expose these endpoints (verify they exist or add them):

| Endpoint | Purpose | Expected Response |
|---|---|---|
| `/api/health/` | Basic liveness | `200 OK` with `{"status": "ok"}` |
| `/api/health/db/` | Database connectivity | `200 OK` if DB reachable, `503` if not |
| `/api/health/ready/` | Readiness (migrations complete) | `200 OK` if ready, `503` if not |

### 5.3 Health Check Tuning

| Parameter | Recommended | Notes |
|---|---|---|
| `grace_period` | `10s` (liveness), `30s` (readiness) | Time before first check after boot |
| `interval` | `15s` (liveness), `60s` (readiness) | How often to check |
| `timeout` | `5s` (liveness), `10s` (readiness) | Max wait for response |
| `concurrency` | `1` | Number of concurrent checks |

### 5.4 Monitoring Deployments

```bash
# Watch deployment in real-time
fly deploy --app boomerbill-api --wait-timeout 300

# Check machine status
fly status --app boomerbill-api

# View recent events
fly events list --app boomerbill-api

# Stream logs during deploy
fly logs --app boomerbill-api
```

---

## 6) Rollback & Redeploy

### 6.1 Fly.io Rollback

```bash
# List recent deployments
fly releases --app boomerbill-api

# Rollback to a specific version
fly rollback --app boomerbill-api

# Rollback to the previous release
fly rollback --app boomerbill-api
```

### 6.2 Database Migration Considerations

**Golden rule**: Migrations must be backward-compatible.

```bash
# Before deploying new code, check pending migrations
fly ssh console -C "cd /app/core && uv run python manage.py showmigrations"

# If a migration has already run, you CANNOT rollback code that removes it.
# Instead, fix forward or use a migration that reverses the change.

# Manual migration rollback (use with extreme caution)
fly ssh console -C "cd /app/core && uv run python manage.py migrate <app> <previous_migration>"
```

### 6.3 Redeploy After Rollback

```bash
# 1. Roll back to previous version
fly rollback --app boomerbill-api

# 2. Verify the rollback
fly status --app boomerbill-api
curl -f https://boomerbill-api.fly.dev/api/health/

# 3. If secrets caused the issue, set corrected secrets
fly secrets set DJANGO_SECRET_KEY="new-value" --app boomerbill-api

# 4. Redeploy with fixes
fly deploy --app boomerbill-api
```

### 6.4 Emergency Procedures

```bash
# Stop all traffic (maintenance mode)
fly scale count 0 --app boomerbill-api

# Restore traffic
fly scale count 1 --app boomerbill-api

# Force restart without redeploy
fly machines restart <machine-id> --app boomerbill-api

# SSH into a running machine for debugging
fly ssh console --app boomerbill-api
```

---

## 7) Provider-Agnostic Deployment Checklist

Use this checklist regardless of your cloud provider.

### 7.1 Pre-Deployment

- [ ] Code is on the correct branch and all tests pass
- [ ] `DJANGO_SECRET_KEY` is generated and >= 32 characters
- [ ] `DJANGO_DEBUG=false` is set
- [ ] `DJANGO_ALLOWED_HOSTS` includes the deployment hostname
- [ ] `DATABASE_URL` points to managed Postgres with SSL
- [ ] `DATABASE_SSL_REQUIRE=true` is set
- [ ] `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` use `https://`
- [ ] Email SMTP credentials are configured (if `EMAIL_PROVIDER=smtp`)
- [ ] Container image builds locally: `docker build -t boomerbill-backend .`
- [ ] Health check endpoints are implemented and tested locally

### 7.2 Deployment

- [ ] Secrets are set in the provider's secret manager
- [ ] Container is deployed (or image is pushed and deployed)
- [ ] Database migrations run successfully (via entrypoint or manually)
- [ ] Health check returns `200 OK`
- [ ] Static files are served correctly (`/static/` returns assets)

### 7.3 Post-Deployment Verification

- [ ] `curl -f https://<host>/api/health/` returns `200`
- [ ] `curl -f https://<host>/api/public/messages/` returns `200`
- [ ] `curl -f https://<host>/api/public/wall/boomers/` returns `200`
- [ ] User signup works (POST to `/api/auth/users/`)
- [ ] User login works (POST to `/api/auth/token/login/` or `/api/auth/jwt/create/`)
- [ ] Password reset email is sent and link works
- [ ] CORS headers are correct for frontend origin
- [ ] HTTPS is enforced (HTTP redirects to HTTPS)

### 7.4 Monitoring Setup

- [ ] Application logs are accessible (provider dashboard or log aggregator)
- [ ] Error rate alerting is configured (threshold: > 1% 5xx errors)
- [ ] Response time alerting is configured (threshold: p95 > 500ms)
- [ ] Database connection monitoring is active
- [ ] Uptime monitoring is configured (external health check service)
- [ ] Deployment notifications are set up (Slack, email, etc.)

### 7.5 Security Verification

- [ ] `DJANGO_SECRET_KEY` is not logged or exposed in any output
- [ ] Database credentials are stored in provider's secret manager
- [ ] TLS/HTTPS is enforced end-to-end
- [ ] CORS does not allow `*` wildcard
- [ ] Security headers are present (HSTS, X-Content-Type-Options, etc.)
- [ ] `SECURE_SSL_REDIRECT=true` is active
- [ ] Session and CSRF cookies are marked `Secure`

---

## 8) Multi-Provider Quick Reference

### 8.1 Render

```yaml
# render.yaml
services:
  - type: web
    name: boomerbill-api
    env: docker
    region: oregon
    plan: starter
    healthCheckPath: /api/health/
    envVars:
      - key: DJANGO_SECRET_KEY
        generateValue: true
      - key: DJANGO_DEBUG
        value: false
      - key: DATABASE_URL
        fromDatabase:
          name: boomerbill-db
          property: connectionString
      - key: DATABASE_SSL_REQUIRE
        value: true

databases:
  - name: boomerbill-db
    region: oregon
    plan: starter
```

### 8.2 Railway

```bash
# Railway CLI
railway init --name boomerbill-api
railway link
railway up --detach

# Add Postgres
railway add --database postgres

# Set variables
railway variables set DJANGO_DEBUG=false
railway variables set DATABASE_SSL_REQUIRE=true
```

### 8.3 DigitalOcean App Platform

```yaml
# .do/app.yaml
name: boomerbill-api
services:
  - name: api
    github:
      repo: your-org/boomerbill
      branch: main
      deploy_on_push: true
    dockerfile_path: backend/Dockerfile
    http_port: 8000
    instance_size_slug: basic-xxs
    instance_count: 1
    health_check:
      http_path: /api/health/
      initial_delay_seconds: 10
      period_seconds: 15
      timeout_seconds: 5
      success_threshold: 1
      failure_threshold: 3
    envs:
      - key: DJANGO_DEBUG
        value: "false"
        scope: RUN_TIME
      - key: DATABASE_SSL_REQUIRE
        value: "true"
        scope: RUN_TIME
databases:
  - name: boomerbill-db
    engine: PG
    version: "15"
    production: true
```

---

## 9) Cost Estimation (Fly.io)

| Resource | Specification | Monthly Cost (approx.) |
|---|---|---|
| App VM | 1 CPU, 1 GB RAM | ~$5.70 (billed per second) |
| Postgres | 1x shared-cpu-1x, 1 GB | ~$2.94 |
| Bandwidth | First 160 GB free | $0 (within free tier) |
| **Total** | | **~$8.64/month** |

> Costs vary by region and usage. `auto_stop_machines = 'stop'` reduces compute costs during idle periods.

---

## 10) Troubleshooting

### Common Issues

| Symptom | Likely Cause | Fix |
|---|---|---|
| `ImproperlyConfigured: DJANGO_SECRET_KEY must be set` | Secret not set or placeholder value | `fly secrets set DJANGO_SECRET_KEY="real-secret"` |
| `ImproperlyConfigured: DJANGO_ALLOWED_HOSTS must be set` | Allowed hosts not configured | `fly secrets set DJANGO_ALLOWED_HOSTS="your-host.fly.dev"` |
| `connection refused` to database | Wrong DATABASE_URL or SSL not enabled | Verify URL, set `DATABASE_SSL_REQUIRE=true` |
| CORS errors in browser | Missing or incorrect CORS origins | Set `CORS_ALLOWED_ORIGINS=https://your-frontend.com` |
| Password reset emails not sent | SMTP not configured | Set `EMAIL_PROVIDER=smtp` and SMTP credentials |
| Cold start delays (> 5s) | `auto_stop_machines = 'stop'` | Set `min_machines_running = 1` |
| 502 Bad Gateway | App crashed or health check failing | `fly logs` to check errors, verify health endpoint |

### Debug Commands

```bash
# Check app status and machine health
fly status --app boomerbill-api

# View logs (last 100 lines)
fly logs --app boomerbill-api --tail

# SSH into running machine
fly ssh console --app boomerbill-api

# Run Django system checks
fly ssh console -C "cd /app/core && uv run python manage.py check --deploy"

# Check database connectivity
fly ssh console -C "cd /app/core && uv run python manage.py dbshell -c 'SELECT 1;'"

# View deployed secrets (keys only, not values)
fly secrets list --app boomerbill-api
```

---

## 11) Scripts Reference

| Script | Purpose | Usage |
|---|---|---|
| `scripts/fly-release.sh` | Full release pipeline | `./scripts/fly-release.sh --env-file .env.production --app boomerbill-api --api-url https://boomerbill-api.fly.dev` |
| `scripts/fly-secrets-from-env.sh` | Set secrets from .env file | `./scripts/fly-secrets-from-env.sh --env-file .env.production --app boomerbill-api` |
| `scripts/entrypoint.sh` | Container startup (migrations + Gunicorn) | Runs automatically in Docker |

---

*Last updated: 2026-05-21 | Closes #25*
