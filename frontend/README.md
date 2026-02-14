# BoomerBill

BoomerBill tracks unpaid tech-support time with a retro-inspired dashboard. The UI is rendered inside an Astro shell but the core experience is a Vue 3 single-page app (SPA) that persists data in the browser. Use it to log support sessions, inspect text-based stats, and review trend analytics without needing a backend.

## Tech Stack
- **Astro 5** for the static shell and routing into `App.vue`
- **Vue 3 + `<script setup>`** for all interactive views
- **Pinia** store in `src/components/vue/store/boomerbills.ts` for global state/persistence
- **Tailwind CSS + DaisyUI** for styling and theming (`darksynthwave` by default)
- **Chart.js + vue-chartjs** for optional analytics visualizations
- **Vitest + @vue/test-utils** for component/unit tests; Playwright scaffolded for e2e

## Application Architecture
- `src/layouts/Layout.astro` hosts the drawer layout, top nav, and sidebar slot where the Vue SPA teleports the navigation component.
- `src/pages/app.astro` mounts `src/components/vue/App.vue` with `client:load`, bootstrapping a single Pinia instance that every component shares.
- `App.vue` holds the view switcher (`session`, `dashboard`, `charts`, `settings`) and teleports `Navigation.vue` into the drawer slot so the SPA feels native inside Astro.
- Navigation + core pages live under `src/components/vue/` and are grouped by domain (`session/`, `dashboard/`, `charts/`, `settings/`). Each folder contains focused components so the layout stays consistent while functionality varies.

## State Management & Data Flow
- The Pinia store models Boomers, Categories, and Sessions while exposing derived stats (today/week/month/year totals, leaderboards, trends, duration buckets, etc.).
- Actions: `start`, `stop`, `addSession`, `addBoomer`, `addCategory`, filters, and CSV export helpers.
- Persistence: `load()` / `persist()` read/write browser `localStorage` keys (`bb_*`) so the SPA survives refreshes with no backend.
- Components import the store directly: session controls mutate state, dashboards consume computed stats, and charts bind to computed datasets.

## Core Features
1. **Session Tracker (`session/` folder)**
   - `BoomerSelect`, `CategoryGrid`, and `ActiveSession` coordinate who you are helping and what you are fixing.
   - Users can start/stop a live timer or add preset "quick sessions" that write to the store instantly.
2. **Dashboard (`dashboard/Dashboard.vue`)**
   - Text-first cards show current period stats, historical totals, and leaderboards via `TimeStatCard`, `LeaderboardTabs`, `BoomerLeaderboard`, and `CategoryLeaderboard`.
3. **Analytics (`charts/ChartsPage.vue`)**
   - Optional visualizations (time-series, pattern analysis, efficiency, distribution, comparison) with filters for date range, boomers, and categories. The chart components all register the Chart.js modules they need and read precomputed datasets from the store.
4. **Settings (`settings/SettingsPage.vue`)**
   - `RateInput`, `BoomerManager`, and `CategoryManager` let you configure hourly rate, manage boomers, and add/remove custom categories.

## Project Structure Highlights
```
src/
  assets/            Tailwind entry + global styles
  components/
    vue/
      App.vue       SPA host + view switcher
      layout/       Drawer navigation component
      session/      Tracking workflow components
      dashboard/    Text-based dashboard + leaderboards
      charts/       Analytics views + chart wrappers
      settings/     Rate & entity management UI
      store/        Pinia store (boomerbills.ts)
  layouts/          Astro layout shell
  pages/            Astro entry points (app/index)
```

## Development Workflow
- Install deps: `npm install`
- Run dev server: `npm run dev` (Astro hosts the Vue SPA at `http://localhost:4321`)
- Build for production: `npm run build`
- Preview the build: `npm run preview`
- Unit tests: `npm run test`

## Testing & Quality Notes
- Vue component tests live under `src/components/vue/**/__tests__` (Vitest + jsdom).
- Store tests live alongside the Pinia store.
- Playwright config exists under `e2e/` for future end-to-end coverage.

## Future Considerations
- A text-only dashboard variant can reuse the existing cards/leaderboards; hide charts by default and link to the analytics page for visuals.
- Settings already manage rates and reference data; extend it for exporting/importing data or toggling chart visibility if needed.
