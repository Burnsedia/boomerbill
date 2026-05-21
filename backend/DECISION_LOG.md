# Decision Log

## 2026-05-21 - Exclude generated artifacts from source control

- Decision: Treat Python bytecode, local sqlite databases, frontend build output, and dependency folders as untracked local artifacts.
- Context: Issues 18 and 32 address noisy diffs, slower reviews, and unstable build/deploy contexts caused by generated files.
- Change:
  - Add root, backend, frontend, and backend Docker ignore rules for generated artifacts.
  - Remove tracked backend bytecode and local sqlite artifacts from the git index without deleting local files.
  - Keep frontend dependency and build output folders out of normal git workflows.
- Rationale: Reviews, CI, and deploy contexts should focus on source/configuration changes rather than machine-generated artifacts.
- Impact: Running backend commands/tests or frontend install/build workflows should no longer create review noise from generated files.

## 2026-05-21 - Add HTTP/TLS security hardening baseline

- Decision: Enable a Django HTTP/TLS hardening baseline by default when `DJANGO_DEBUG=False` while keeping each deployment-sensitive control configurable by environment.
- Context: Issue 45 requires production deployments to enforce secure transport and browser security headers without breaking local development.
- Change:
  - Add `SECURE_SSL_REDIRECT` with a production default of `True`.
  - Add HSTS controls: `SECURE_HSTS_SECONDS`, `SECURE_HSTS_INCLUDE_SUBDOMAINS`, and `SECURE_HSTS_PRELOAD`.
  - Add `SECURE_CONTENT_TYPE_NOSNIFF` and `SECURE_REFERRER_POLICY` defaults.
  - Document the new knobs in `.env.example` and backend production security requirements.
- Rationale: Transport security depends on predictable Django defaults plus explicit operator control for proxy/TLS and HSTS rollout readiness.
- Impact:
  - Production defaults redirect HTTP to HTTPS and emit baseline browser security headers.
  - Local development keeps HSTS disabled and avoids HTTPS redirect unless explicitly enabled.
  - Operators must confirm TLS-terminating proxy behavior before enabling strict production settings.
- Rollback plan: override `SECURE_SSL_REDIRECT=False` and `SECURE_HSTS_SECONDS=0` while correcting deployment TLS/proxy configuration.

## 2026-05-21 - Adopt dual-mode auth migration (legacy token + JWT)

- Decision: Run a phased migration using dual-mode auth as the default (`AUTH_MODE=dual`).
- Context: Issue 43 requires stronger token handling without disrupting existing clients that still use DRF authtoken endpoints.
- Change:
  - Introduce `AUTH_MODE`, `ENABLE_LEGACY_TOKEN_AUTH`, and `ENABLE_JWT_AUTH` in settings.
  - Gate auth URLs so legacy and JWT endpoints can coexist or be toggled independently.
  - Add fail-fast config validation for invalid mode combinations.
- Rationale: Dual-mode supports zero-downtime client transitions and allows rollback without reverting code.
- Impact:
  - Existing clients remain functional on token auth.
  - New clients can authenticate with JWT immediately.
  - Operations can switch modes per environment using env-only changes.
- Migration plan:
  1. Deploy with `AUTH_MODE=dual`.
  2. Monitor login failures and JWT adoption.
  3. Move to `AUTH_MODE=jwt` only after explicit cutover approval.
- Rollback plan: set `AUTH_MODE=legacy_token` (or `ENABLE_JWT_AUTH=False`) and redeploy.

## 2026-05-21 - Normalize frontend auth handling around scheme-aware session state

- Decision: Store auth as a structured session (`scheme + access token + optional refresh`) and pass full authorization header values through sync APIs.
- Context: Frontend previously assumed token-only auth and prepended `Token` in several call sites, which blocks clean JWT adoption.
- Change:
  - Add `AuthSession` with scheme-aware header generation.
  - Persist active auth session in `sessionStorage`, with fallback migration from legacy `localStorage` token key.
  - Update boomer sync/category methods to accept full auth headers.
- Rationale: Reduces branching across call sites and keeps store interfaces compatible with either `Token` or `Bearer` semantics.
- Impact:
  - Dual-mode login and API calls work without duplicating token-format logic.
  - Legacy sessions can still hydrate during transition.
  - Logout behavior can target token logout or JWT blacklist appropriately.

## 2026-05-21 - Treat JWT invalidation as an operational control surface

- Decision: Make JWT revocation/rollback procedures explicit in runbooks and enforce safe defaults in config.
- Context: Migrating auth increases incident-response complexity unless token invalidation strategy is documented and tested.
- Change:
  - Document secure defaults (short access TTL, refresh rotation, blacklist-after-rotation).
  - Add explicit emergency invalidation procedure in `SECURITY_RUNBOOK.md`.
  - Enforce `JWT_BLACKLIST_AFTER_ROTATION=True` requires `JWT_ROTATE_REFRESH_TOKENS=True`.
- Rationale: Security posture depends on predictable operational behavior, not only code paths.
- Impact:
  - Faster response during auth incidents.
  - Lower risk of misconfigured JWT settings in production.
  - Clear path to temporarily disable JWT while preserving user access via legacy mode.

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
