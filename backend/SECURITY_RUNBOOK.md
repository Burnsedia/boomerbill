# Security Runbook

## Secret Rotation Checklist

- Keep production secrets in an external secret manager (for Fly, use `fly secrets`).
- Generate a new value for each rotated secret (`DJANGO_SECRET_KEY`, SMTP credentials, API keys).
- Set new secrets in production and deploy.
- Verify app startup and key flows (`manage.py check`, login, password reset).
- Revoke old secret values after verification succeeds.
- Record rotation date, owner, and impacted environments.

## Password Reset Email Reliability & Safety Checklist

- Keep `EMAIL_PROVIDER=console` for local development; use `smtp` only with real provider credentials.
- Require `PASSWORD_RESET_CONFIRM_URL` to stay relative and include `{uid}` + `{token}` placeholders.
- Verify `PUBLIC_DOMAIN` points to your real frontend domain before enabling production reset emails.
- Enforce SMTP transport sanity: do not enable both `EMAIL_USE_TLS` and `EMAIL_USE_SSL`.
- Ensure SPF/DKIM/DMARC records are configured for the sender domain to improve inbox delivery.
- After deploy, run one password-reset test and verify:
  - provider logs show accepted delivery,
  - reset URL resolves to your expected frontend host,
  - token can be redeemed once and expires as expected.

## Incident Response Checklist (Secret Exposure)

- Contain immediately: remove exposed value from code, logs, and shared channels.
- Rotate affected secrets in production first, then staging/local copies.
- Redeploy services that consume rotated secrets.
- Invalidate active sessions/tokens if auth-related secrets were exposed.
- Review audit logs and deployment history to identify unauthorized access.
- Document timeline, remediation, and follow-up prevention actions.

## JWT Operations & Invalidation Strategy

### Secure defaults

- `AUTH_MODE=dual` during migration, with both `ENABLE_LEGACY_TOKEN_AUTH=True` and `ENABLE_JWT_AUTH=True`.
- Access token TTL defaults to 15 minutes.
- Refresh token TTL defaults to 7 days.
- Refresh token rotation is enabled by default.
- Blacklisting-after-rotation is enabled by default.

### Emergency token invalidation

1. **Contain**: switch to legacy-only mode if needed (`AUTH_MODE=legacy` or `ENABLE_JWT_AUTH=False`) and deploy.
2. **Force logout for JWT sessions**:
   - Rotate `DJANGO_SECRET_KEY` (invalidates all existing JWT signatures).
   - Keep `JWT_ROTATE_REFRESH_TOKENS=True` and `JWT_BLACKLIST_AFTER_ROTATION=True`.
   - Revoke compromised refresh tokens via blacklist table (if selective revocation is required).
3. **Force logout for legacy token sessions**:
   - Delete/revoke DRF authtokens for affected users (or all users for full invalidation).
4. **Recover**:
   - Return to `AUTH_MODE=dual` after verification, then resume migration.
   - Verify auth/login, refresh, and logout endpoints in each environment.

### Rollback-aware deployment notes

- JWT enable/disable is controlled by environment variables only (no code rollback required).
- Keep dual-mode until metrics show stable JWT adoption and low auth error rate.
- Remove legacy token mode only after explicit cutover approval.
