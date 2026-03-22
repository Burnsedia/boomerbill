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

### Verify reset flow

1. Create a user with email.
2. Trigger password reset from app settings or `/api/auth/users/reset_password/`.
3. Confirm SendGrid activity shows sent mail.
4. Open reset link and complete `/reset-password` flow.

### DNS for deliverability (Netlify DNS)

In SendGrid domain authentication, add SPF and DKIM records for `boomerbill.net`. Without these, reset emails may go to spam.
