# Devlog for BoomerBill

## 2026-05-21 23:10

### docs/build-mode

- Reviewed issue scope and implemented fixes across frontend hosting + backend auth/connectivity:
  - manifest 404/delivery path,
  - local auth + CORS policy,
  - frontend → backend local base URL behavior.
- Added decision records in `backend/DECISION_LOG.md` for:
  - local API base URL defaults,
  - strict CORS/CSRF enforcement strategy,
  - PWA manifest/service-worker hosting header policy.
- Added actionable changelog entry in `backend/CHANGELOG.md` with:
  - confirmed fix summary,
  - local setup steps,
  - rollback options.
- Outcome: docs now capture what changed, why it changed, and how to operate/migrate/rollback safely without code archaeology.

## 05/03/2026

- **Feat:** setup basic auth with djoser with default abstract user model
- **Feat:** got all of the CRUD done

## 2026-03-08 06:46

### thoughts

> I am working on my new features.
> I am thinking about adding a boomer leader board
> I am thinking about members only fourm and a safe place to shit post about boomers
> this could advertise itself by making a shitposting bot that shames a boomer for some reason
> this a professional tool for tech support people to send invoces to clients
> maybe a job board and freelance platform to help the boomers
> maybe a leader board for the fixers?

### plans feats

- get boomer CRUD
- get store states serverside
- get auth done, maybe settup PAT

### Define done

- Auth Works
- Boomer List view
- boomer detail page
- boomer states ?
- Sessions API working ?

## 2026-03-20 22:25

####
