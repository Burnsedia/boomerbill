# Security Runbook

## Secret Rotation Checklist

- Keep production secrets in an external secret manager (for Fly, use `fly secrets`).
- Generate a new value for each rotated secret (`DJANGO_SECRET_KEY`, SMTP credentials, API keys).
- Set new secrets in production and deploy.
- Verify app startup and key flows (`manage.py check`, login, password reset).
- Revoke old secret values after verification succeeds.
- Record rotation date, owner, and impacted environments.

## Incident Response Checklist (Secret Exposure)

- Contain immediately: remove exposed value from code, logs, and shared channels.
- Rotate affected secrets in production first, then staging/local copies.
- Redeploy services that consume rotated secrets.
- Invalidate active sessions/tokens if auth-related secrets were exposed.
- Review audit logs and deployment history to identify unauthorized access.
- Document timeline, remediation, and follow-up prevention actions.
