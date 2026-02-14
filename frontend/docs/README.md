# BoomerBill Codebase Overview

BoomerBill is an Astro-hosted Vue 3 single-page application that tracks unpaid tech-support sessions. Astro provides the layout shell and routing entry point, while all interactive experiences live under the Vue SPA and persist in-browser through Pinia. Use the summary below to understand how the current branch is structured and how data flows between the major features.

## Application Architecture
- **Astro shell** – `src/layouts/Layout.astro` renders the drawer layout, navbar, footer, and `#navigation-sidebar` slot.
- **SPA entry** – `src/pages/app.astro` mounts `App.vue` via `client:load`, keeping the experience client-side once the shell loads.
- **App host** – `src/components/vue/App.vue` initializes Pinia, loads persisted data, teleports the navigation component into the Astro slot, and switches among `session`, `dashboard`, `charts`, and `settings` views.
- **Styling** – Tailwind + DaisyUI (theme `darksynthwave`) power the retro cards, grids, and buttons. Global styles live in `src/assets/app.css`.

## State Management & Persistence
- `src/components/vue/store/boomerbills.ts` defines the Pinia store for boomers, categories, and sessions.
- Derived state covers period totals (today/week/month/year), historical stats, leaderboards, time-series buckets, and export helpers.
- Actions encapsulate session control (`start`, `stop`, `addSession`), entity management (`addBoomer`, `removeBoomer`, `addCategory`, `removeCategory`), filters, and CSV export.
- `load()` / `persist()` read and write browser `localStorage` keys (`bb_rate`, `bb_sessions`, etc.) so the SPA works offline with no backend.

## Feature Areas
1. **Session Tracking (`src/components/vue/session/`)**
   - `SessionTracker.vue` coordinates boomer/category selection, a live timer, quick-add presets, and optional notes.
   - `BoomerSelect.vue`, `CategoryGrid.vue`, and `ActiveSession.vue` encapsulate the supporting UI for choosing who and what you are helping.
2. **Text Dashboard (`src/components/vue/dashboard/`)**
   - `Dashboard.vue` arranges text-only stat cards (`TimeStatCard.vue`) for current/historical periods and uses `LeaderboardTabs.vue` + leaderboard components to rank boomers and categories.
3. **Analytics (`src/components/vue/charts/`)**
   - `ChartsPage.vue` adds filters (date range, boomer/category multi-select) and renders optional chart sections (time series, usage patterns, cost efficiency, duration distribution, comparisons). Each chart component registers the needed Chart.js modules locally and binds to the corresponding computed dataset from the store.
4. **Settings (`src/components/vue/settings/`)**
   - `SettingsPage.vue` gathers `RateInput.vue`, `BoomerManager.vue`, and `CategoryManager.vue` in one place for rate configuration and entity management. These components mutate the store directly and rely on Pinia persistence.

## Data Flow Summary
```
User action → Session components dispatch store actions → store updates sessions/boomers/categories →
computed stats/leaderboards update → dashboard + analytics + settings automatically reflect changes →
store persists to localStorage for reload safety
```

## Development & Testing
- Install dependencies: `npm install`
- Run dev server: `npm run dev` (Astro serves the SPA at `http://localhost:4321`)
- Build for production: `npm run build`; preview with `npm run preview`
- Unit tests: `npm run test` (Vitest + @vue/test-utils). Component tests live under `src/components/vue/**/__tests__`, and Pinia tests sit next to the store.
- E2E scaffold: Playwright config under `e2e/` for future use.

## Future Notes
- A text-only dashboard variant can continue using the existing cards/leaderboards, while the analytics route retains the optional Chart.js visualizations.
- Settings already control hourly rate and reference data; extend it for import/export, chart toggles, or additional automation.
- The Pinia store is the single source of truth—any new feature should read/write through it to benefit from persistence and shared derivations.
