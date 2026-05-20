# Decision Log

## 2026-05-19 - Database engine behavior by environment

- Decision: Use sqlite in development by default and Postgres in production when `DATABASE_URL` is set.
- Context: The project uses `django-environ` and a mixed local/prod deployment model.
- Change: Keep `env.db("DATABASE_URL", default=sqlite...)` and apply `sslmode=require` only when the resolved engine is PostgreSQL and `DATABASE_SSL_REQUIRE=True`.
- Rationale: Prevents Postgres-only SSL options from being applied to sqlite while preserving strict SSL in production.
- Impact: Local development works without Postgres setup; production keeps secure DB transport settings.

## 2026-05-19 - Production host validation defaults

- Decision: Require explicit `DJANGO_ALLOWED_HOSTS` when `DJANGO_DEBUG=False`.
- Context: Static local host defaults are safe in development but should not silently satisfy production host policy.
- Change: Apply local host defaults only when `DJANGO_DEBUG=True`; production defaults to an empty host list unless provided via env.
- Rationale: Enforces fail-fast behavior for missing production host configuration.
- Impact: Production startup now fails early when host policy is not explicitly configured.
