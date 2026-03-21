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

## Brevo SMTP on Fly

BoomerBill uses Django + Djoser for password recovery emails. You do not need an email API SDK; Django SMTP is enough.

### Required Fly secrets

```bash
fly secrets set \
EMAIL_PROVIDER=smtp \
EMAIL_HOST=smtp-relay.brevo.com \
EMAIL_PORT=587 \
EMAIL_HOST_USER="YOUR_BREVO_SMTP_USER" \
EMAIL_HOST_PASSWORD="YOUR_BREVO_SMTP_PASSWORD" \
EMAIL_USE_TLS=true \
DEFAULT_FROM_EMAIL="BoomerBill <noreply@boomerbill.net>" \
PUBLIC_DOMAIN=boomerbill.net \
PASSWORD_RESET_CONFIRM_URL="reset-password?uid={uid}&token={token}"
```

### Also set core app secrets

```bash
fly secrets set \
DJANGO_SECRET_KEY="REPLACE_ME" \
DJANGO_DEBUG=false \
DJANGO_ALLOWED_HOSTS="api.boomerbill.net" \
FRONTEND_ORIGIN="https://boomerbill.net" \
DATABASE_URL="postgres://..."
```

### Verify reset flow

1. Create a user with email.
2. Trigger password reset from app settings or `/api/auth/users/reset_password/`.
3. Confirm Brevo logs show sent mail.
4. Open reset link and complete `/reset-password` flow.

### DNS for deliverability (Netlify DNS)

In Brevo domain setup, add provided SPF and DKIM records for `boomerbill.net`. Without these, reset emails may go to spam.
