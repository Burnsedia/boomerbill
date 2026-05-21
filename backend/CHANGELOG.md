# Changelog

## 2026-05-21 (Password reset setup documentation)

### Changed
- Documented password reset setup using the existing backend/frontend implementation:
  - Djoser reset endpoints in use:
    - `POST /api/auth/users/reset_password/`
    - `POST /api/auth/users/reset_password_confirm/`
  - Configurable reset confirmation route via `PASSWORD_RESET_CONFIRM_URL` with default `reset-password?uid={uid}&token={token}` in backend settings.
  - Fly secret/runbook setup includes `PASSWORD_RESET_CONFIRM_URL` so production reset links resolve to the frontend route.

### Why
- Password reset depends on a correct backend-to-frontend URL contract.
- Explicit configuration and verification steps reduce reset-link failures during deploys.

### Verification Notes
- Trigger reset request and complete confirmation flow using the documented endpoints.
- Confirm reset mail activity in configured SMTP provider and validate link lands on `/reset-password` route.

## 2026-05-21 (Connectivity/Auth/PWA issue review)

### Confirmed Fixes
- **Manifest 404 / manifest delivery**
  - Netlify headers now explicitly serve `/manifest.webmanifest` as `application/manifest+json`.
  - Service worker assets (`/sw.js`, `/registerSW.js`) now use no-cache/no-store headers to reduce stale-client behavior after deploys.
  - Frontend layout keeps a stable manifest link target at `/manifest.webmanifest`.
- **Local auth/CORS/backend connectivity**
  - Frontend API base now defaults to local backend (`http://localhost:8000`) when `PUBLIC_API_BASE_URL` is not set.
  - Backend enforces explicit CORS/CSRF policy for auth-capable cross-origin requests:
    - wildcard `*` blocked for `CORS_ALLOWED_ORIGINS`,
    - explicit origins required when `CORS_ALLOW_CREDENTIALS=True` and `DJANGO_DEBUG=False`.
  - Existing dual-mode auth rollout controls remain in place for legacy-token/JWT transitions.

### Local Setup Notes
- Run backend on `http://localhost:8000` for zero-config frontend connectivity.
- If backend runs elsewhere, set `PUBLIC_API_BASE_URL=<backend-origin>` before running the frontend.
- For cross-origin local auth testing, set matching `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` in backend env.

### Rollback Notes
- PWA/manifest rollback: remove SW registration first, then revert manifest/SW header rules.
- Auth connectivity rollback: set `AUTH_MODE=legacy_token` (or disable JWT) while preserving explicit CORS origin lists.

## 2026-05-21

### Changed
- Added dual-mode authentication controls in `backend/core/core/settings.py` and `backend/core/core/urls.py` for Issue 43 migration:
  - `AUTH_MODE` support (`dual`, `jwt`, `legacy_token`) with explicit feature flags.
  - Conditional enabling of legacy Djoser token endpoints and JWT endpoints.
  - JWT settings for access/refresh TTL, refresh rotation, and blacklist-after-rotation.
  - Runtime validation to prevent invalid auth configurations (both auth modes disabled, blacklist without rotation).
- Added `djangorestframework-simplejwt` dependency in `backend/pyproject.toml` and synced `backend/uv.lock`.
- Hardened CORS/auth cookie defaults in `backend/core/core/settings.py` and documented matching environment variables in `backend/.env.example`.
- Updated frontend auth flow to support legacy token and JWT sessions in `frontend/src/components/vue/store/auth.ts`:
  - login fallback from legacy endpoint to JWT when legacy endpoint is absent,
  - session-based auth persistence with scheme-aware authorization headers,
  - JWT logout via blacklist endpoint with refresh token payload,
  - backward-compatible hydration from legacy local-storage token.
- Updated cloud sync/category API calls in `frontend/src/components/vue/store/boomerbills.ts` to accept full auth headers (`Token` or `Bearer`).
- Expanded tests:
  - backend API migration coverage in `backend/core/users/tests.py`,
  - frontend dual-mode auth fallback coverage in `frontend/src/components/vue/store/__tests__/auth.spec.ts`,
  - updated auth header expectation in `frontend/src/components/vue/store/__tests__/boomerbills.spec.ts`.
- Added root-level `AGENT_LAUNCH_PLAYBOOK.md` and linked it from `README.md` for Issue 43 coordination workflow.
- Extended backend operations docs in `backend/README.md` and `backend/SECURITY_RUNBOOK.md` with migration and incident-response guidance.

### Why
- Enable a low-risk, rollback-friendly migration from legacy DRF token auth to JWT without breaking active clients.
- Keep auth changes deployable in phases using environment toggles instead of code rollbacks.
- Standardize frontend/backend auth header handling across both schemes.

### Migration Notes
- Default rollout mode is `AUTH_MODE=dual` with both auth systems enabled.
- JWT-only rollout path: set `AUTH_MODE=jwt` (or `ENABLE_LEGACY_TOKEN_AUTH=False`, `ENABLE_JWT_AUTH=True`).
- Legacy-only rollback path: set `AUTH_MODE=legacy_token` (or `ENABLE_JWT_AUTH=False`) and redeploy.
- If enabling JWT blacklist, keep `JWT_ROTATE_REFRESH_TOKENS=True`.

### Rollback Notes
- Fast rollback is configuration-only: disable JWT via env, redeploy, and keep legacy token endpoints active.
- For JWT compromise response, rotate `DJANGO_SECRET_KEY` and follow `SECURITY_RUNBOOK.md` invalidation checklist.

### Testing Summary
- Backend: added API tests that validate token login compatibility, JWT create/refresh flow, coexistence of both login endpoints, and malformed auth rejection.
- Frontend: added auth-store test ensuring fallback from legacy login endpoint to JWT endpoint and Bearer-header usage.
- Frontend: existing store test updated to require explicit `Token` header string for category deletion API call.

## 2026-05-19

### Changed
- Updated DB SSL logic in `backend/core/core/settings.py` to apply `sslmode=require` only when the active engine is PostgreSQL.
- Clarified DB configuration in `backend/.env.example` to document sqlite fallback for local development and Postgres usage in production.
- Added `backend/DECISION_LOG.md` documenting the database environment strategy and rationale.
- Updated `ALLOWED_HOSTS` defaults to require explicit production host configuration while preserving local development defaults.
- Documented production runtime security requirements and validation commands in `backend/README.md`.
