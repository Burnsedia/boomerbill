# Changelog

## 2026-05-19

### Changed
- Updated DB SSL logic in `backend/core/core/settings.py` to apply `sslmode=require` only when the active engine is PostgreSQL.
- Clarified DB configuration in `backend/.env.example` to document sqlite fallback for local development and Postgres usage in production.
- Added `backend/DECISION_LOG.md` documenting the database environment strategy and rationale.
- Updated `ALLOWED_HOSTS` defaults to require explicit production host configuration while preserving local development defaults.
- Documented production runtime security requirements and validation commands in `backend/README.md`.
