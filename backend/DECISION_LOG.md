# Decision Log

## 2026-05-21 - Enforce safe password-reset and SMTP guardrails

- Decision: Fail startup for unsafe reset-link config and contradictory SMTP transport settings.
- Context: Password reset reliability depends on correct domain/link composition and deterministic SMTP behavior.
- Change:
  - Require `PASSWORD_RESET_CONFIRM_URL` to include `{uid}` and `{token}` and remain relative (no scheme/host).
  - Block `EMAIL_USE_TLS=True` with `EMAIL_USE_SSL=True`.
  - Validate `DEFAULT_FROM_EMAIL` has mailbox format in production.
- Rationale: Prevent misrouted reset links, reduce phishing/open-redirect risk, and avoid silent SMTP delivery failures.
- Impact:
  - Misconfigurations are caught at startup instead of during incident response.
  - Local dev flow remains compatible with Djoser defaults.

## 2026-05-21 - Standardize password reset URL contract and deployment setup

- Decision: Keep Djoser password reset confirmation URL configurable via `PASSWORD_RESET_CONFIRM_URL`, with a safe default of `reset-password?uid={uid}&token={token}`.
- Context: Password reset requires backend-generated links to match the frontend route contract across local and production environments.
- Change:
  - Backend setting uses `env("PASSWORD_RESET_CONFIRM_URL", default="reset-password?uid={uid}&token={token}")`.
  - Deployment/runbook docs require setting `PASSWORD_RESET_CONFIRM_URL` in Fly secrets.
  - Reset flow is documented against Djoser endpoints:
    - `POST /api/auth/users/reset_password/`
    - `POST /api/auth/users/reset_password_confirm/`
- Rationale: A documented default with environment override prevents broken reset links while keeping routing flexible per environment.
- Impact:
  - Local environments work without extra reset URL configuration.
  - Production can pin reset links to the exact frontend route shape.
  - Password reset setup is explicit in ops docs and easier to verify.

## 2026-05-21 - Standardize local frontend↔backend connectivity defaults

- Decision: Keep frontend local API default as `http://localhost:8000` and explicitly document per-environment API base URL overrides.
- Context: Local development repeatedly failed with backend connectivity/auth errors when frontend and backend origins did not match expected values.
- Change:
  - Frontend API helper resolves to `PUBLIC_API_BASE_URL` first, then falls back to local backend (`localhost:8000`).
  - Deployment config keeps production API base pinned to Fly (`https://boomerbill-api.fly.dev`).
- Rationale: A deterministic local default removes onboarding friction while preserving explicit production routing.
- Impact:
  - Local auth/login requests target the expected backend without extra setup.
  - Fewer false CORS/auth failures caused by accidental API host drift.
  - Environment switching remains config-only (`PUBLIC_API_BASE_URL`).
- Local setup note: run backend on port `8000` or set `PUBLIC_API_BASE_URL` to your backend origin before starting frontend.

## 2026-05-21 - Enforce explicit CORS/CSRF policy for auth-capable cross-origin calls

- Decision: Fail fast on unsafe or incomplete CORS settings and require explicit trusted origins for state-changing auth flows.
- Context: Cross-origin login/session flows can fail silently (or become unsafe) when credential/CORS settings are permissive or mismatched.
- Change:
  - Block wildcard `*` in `CORS_ALLOWED_ORIGINS`.
  - Require explicit `CORS_ALLOWED_ORIGINS` in non-debug environments when `CORS_ALLOW_CREDENTIALS=True`.
  - Maintain explicit `CSRF_TRUSTED_ORIGINS` configuration.
- Rationale: Security-sensitive auth paths need strict, predictable origin policy in both local and deployed environments.
- Impact:
  - Startup catches invalid CORS config before runtime incidents.
  - Cross-origin auth behavior is reproducible across environments.
  - Misconfiguration risk drops for local/prod parity.
- Rollback note: temporarily disable credentialed CORS (`CORS_ALLOW_CREDENTIALS=False`) to unblock non-cookie flows while correcting origin lists.

## 2026-05-21 - Preserve PWA manifest/service-worker delivery via hosting headers

- Decision: Ship explicit hosting headers for `manifest.webmanifest`, `sw.js`, and `registerSW.js`.
- Context: Manifest 404/mime mismatches and stale service worker caching degrade installability and can mask frontend update fixes.
- Change:
  - Set `Content-Type: application/manifest+json` for `/manifest.webmanifest`.
  - Set no-store/no-cache headers for service worker scripts.
  - Keep manifest link anchored at `/manifest.webmanifest` in app layout.
- Rationale: Correct content type + caching behavior is required for reliable PWA install/update flows.
- Impact:
  - Eliminates manifest delivery ambiguity on Netlify.
  - Reduces stale SW behavior after deploy.
  - Improves reliability of install prompts and app metadata loading.
- Rollback note: if PWA rollout needs to pause, remove SW registration script first, then relax SW headers in hosting config.

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
