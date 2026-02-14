
# BoomerBill

**BoomerBill** is a small, local-first web app for tracking unpaid tech support time — the minutes, hours, and money quietly lost helping friends, family, or coworkers with “quick questions.”

> “It’ll only take a second”
> — Famous last words

---

## What BoomerBill Does

BoomerBill lets you:

- Track time spent on unpaid tech support sessions
- Convert lost time into money using an hourly rate
- See totals and averages (daily / weekly / yearly)
- Build awareness of invisible labor
- Keep everything local (no accounts, no backend)

This is **not** an invoicing app.  
It’s a visibility app.

---

## Features

### Core
- Start / stop time tracking sessions
- Aggregate total minutes spent
- Calculate money lost based on a configurable hourly rate
- Persistent local storage

### Dashboard
- Average time lost per day
- Average time lost per week
- Average time lost per year
- Cost breakdowns alongside time

### UI
- Simple card-based layout
- Dark Synthwave theme (DaisyUI)
- Mobile-friendly

---

## Tech Stack

- Vue 3 (Composition API)
- Pinia for state management
- Astro for dev/build
- Vitest for unit testing
- DaisyUI + Tailwind CSS for styling
- LocalStorage (no server, no SSR)

---

## Project Philosophy

BoomerBill is intentionally:

- Small
- Understandable
- Local-first
- No accounts
- No backend
- No tracking
- No analytics

If the app breaks, you own it.  
If the data disappears, you know why.

---

## Development

Install dependencies:

npm install

Run dev server:

npm run dev

Run tests:

npx vitest

---

## State Management

All app state lives in a single Pinia store:

src/components/vue/store/boomerbills.ts

This includes:
- Sessions
- Totals
- Averages
- Hourly rate
- Derived values

If something looks wrong in the UI, check the store first.

---

## Testing

BoomerBill includes unit tests for:

- Session start/stop logic
- Total minute calculation
- Money calculation
- Daily / weekly / yearly averages

Tests are written to catch math drift and time logic bugs, not UI issues.

---

## Non-Goals (On Purpose)

BoomerBill will not:

- Sync to the cloud
- Send invoices
- Track people
- Shame anyone
- Replace boundaries (that part is on you)

---

## Why This Exists

Unpaid technical labor is real labor.

BoomerBill exists to answer one question:

“How much time am I actually giving away?”

Once you see the number, you can decide what to do next.

---

## License

AGPL-3.0-or-later

This project is licensed under the GNU Affero General Public License v3.0 or later.
If you run a modified version of this app as a network service, you must provide the source code to users.
