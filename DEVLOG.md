# Devlog for BoomerBill

## 2026-05-21

### Security hardening baseline

- Worked issue `#45` on a dedicated branch to make production HTTP/TLS behavior explicit in Django settings.
- Added environment-configurable controls for HTTPS redirect, HSTS, MIME-sniffing protection, and referrer policy.
- Kept HSTS subdomain and preload settings opt-in because they depend on deployment-wide HTTPS readiness.
- Updated backend decision and changelog docs so deployment operators can see the rollout and rollback path.

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
