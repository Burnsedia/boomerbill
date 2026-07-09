# BoomerBill Go-Live Runbook (Fly + Netlify)

Use this checklist on launch day. Execute top to bottom.

## 0) Preconditions

- [ ] You are on the release commit/branch you want to deploy.
- [ ] Local tests and builds pass.
- [ ] You have Fly CLI + Netlify access.

## 1) Configure Backend Secrets (Fly)

Set core Django env:

```bash
fly secrets set \
DJANGO_SECRET_KEY="REPLACE_ME" \
DJANGO_DEBUG=false \
DJANGO_ALLOWED_HOSTS="api.boomerbill.net" \
FRONTEND_ORIGIN="https://boomerbill.net" \
PUBLIC_DOMAIN="boomerbill.net" \
PASSWORD_RESET_CONFIRM_URL="reset-password?uid={uid}&token={token}" \
DATABASE_URL="postgres://REPLACE_ME"
```

Set email (Brevo SMTP):

```bash
fly secrets set \
EMAIL_PROVIDER=smtp \
EMAIL_HOST="smtp-relay.brevo.com" \
EMAIL_PORT=587 \
EMAIL_HOST_USER="REPLACE_ME" \
EMAIL_HOST_PASSWORD="REPLACE_ME" \
EMAIL_USE_TLS=true \
DEFAULT_FROM_EMAIL="BoomerBill <noreply@boomerbill.net>"
```

## 2) Deploy Backend

```bash
fly deploy
```

Run migrations in production:

```bash
fly ssh console -C "cd /app && python manage.py migrate"
```

Verify migration state:

```bash
fly ssh console -C "cd /app && python manage.py showmigrations boomers community"
```

Expected: all migrations checked, including:

- `boomers.0002_boomer_cost`
- `boomers.0003_category_is_shared_category_normalized_name_and_more`
- `community.0001_initial`
- `community.0002_messagereply`

## 3) Configure Frontend Env (Netlify)

In Netlify site settings, set:

- `PUBLIC_API_BASE_URL=https://api.boomerbill.net`

Trigger deploy (UI or git push).

## 4) DNS + Deliverability

- [ ] `api.boomerbill.net` points to Fly app.
- [ ] Brevo domain verification completed.
- [ ] SPF + DKIM records are present in Netlify DNS.

## 5) Backend Smoke Tests

Public endpoints:

```bash
curl -i https://api.boomerbill.net/api/public/messages/
curl -i https://api.boomerbill.net/api/public/wall/boomers/
```

Auth + sync (replace credentials):

```bash
curl -i -X POST https://api.boomerbill.net/api/auth/token/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"REPLACE_ME","password":"REPLACE_ME"}'
```

Copy `auth_token` and test:

```bash
curl -i https://api.boomerbill.net/api/auth/users/me/ \
  -H "Authorization: Token REPLACE_ME"

curl -i https://api.boomerbill.net/api/sync/pull/ \
  -H "Authorization: Token REPLACE_ME"

curl -i -X POST https://api.boomerbill.net/api/sync/push/ \
  -H "Authorization: Token REPLACE_ME" \
  -H "Content-Type: application/json" \
  -d '{"boomers":[],"categories":[],"sessions":[]}'
```

## 6) Frontend Smoke Tests (Manual)

- [ ] Open `https://boomerbill.net/app`.
- [ ] Guest mode works.
- [ ] Signup works with `username + email + password`.
- [ ] Login works with `username + password`.
- [ ] Settings -> "Send password recovery email" works.
- [ ] Reset link lands on `/reset-password` and completes.
- [ ] Community post/reply/follow works.
- [ ] Category share/import works.
- [ ] Sync badge transitions (`Syncing...` -> `Synced`).

## 7) PWA Checks

- [ ] Hard refresh once after deploy.
- [ ] Service worker updated (no stale frontend build).
- [ ] Install CTA visible on mobile.
- [ ] iOS add-to-home-screen instructions shown.

## 8) Monitor First Hour

```bash
fly logs
```

Watch for:

- 500 errors on `/api/sync/*`
- 401 loops from stale tokens
- 404 on category share/import endpoints

## 9) Rollback Plan

If critical breakage occurs:

1. Roll back to previous backend release on Fly.
2. Keep DB migration posture in mind (prefer forward-fix if schema already migrated).
3. Redeploy previous frontend build on Netlify.
4. Announce temporary maintenance to users.

## 10) Post-Launch Tasks

- [ ] Enable daily DB backup + test restore.
- [ ] Add uptime + error alerting.
- [ ] Add a release checklist link in `README.md`.
