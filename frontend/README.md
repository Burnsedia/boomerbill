# BoomerBill

BoomerBill is a tiny Astro application that hosts a Vue 3 + Pinia experience for tracking how much unpaid tech support you provide. The UI focuses on a single-page dashboard (`/app`) that lets you time sessions, log quick incidents, and review cumulative "damage" metrics.

## Feature Highlights
- Astro shell with Tailwind/DaisyUI powered theming and a synthwave-inspired layout
- Vue application bootstrapped as an island inside `/app` with client-side hydration
- Pinia store that tracks sessions, derived statistics, persistence, and CSV export helpers
- PWA configuration via `@vite-pwa/astro` so the tracker can be installed on devices
- Vitest + Vue Test Utils suite covering store logic and interactive components

## Tech Stack
- [Astro 5](https://astro.build/) for routing and static shell rendering
- [Vue 3](https://vuejs.org/) + [Pinia 3](https://pinia.vuejs.org/) for the reactive application
- [Tailwind CSS 4](https://tailwindcss.com/) with [daisyUI](https://daisyui.com/) components for styling
- [@vite-pwa/astro](https://vite-pwa-org.netlify.app/frameworks/astro/) for manifest/service worker scaffolding
- [Vitest](https://vitest.dev/) and [@vue/test-utils](https://test-utils.vuejs.org/) for unit/component tests

## Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
   Astro serves the site at `http://localhost:4321`.
3. Run the production build:
   ```bash
   npm run build
   npm run preview # optional local preview
   ```
4. Execute the unit test suite:
   ```bash
   npm run test
   ```

## Project Structure
```
public/
  favicon.*
src/
  assets/            Global CSS + media (`app.css`, background SVGs)
  components/
    Welcome.astro    Static landing hero
    vue/             Vue SPA mounted under /app
      App.vue        Root orchestrator registering Pinia + layout cards
      RateInput.vue  Hourly rate control
      Timer.vue      Session timer w/ presets + live cost display
      Totals.vue     Lifetime incident count + weekly summary
      Dashboard.vue  Average per day/week/year stats
      Leaderboard.vueSorted session leaderboard + severity labels
      share.vue      Clipboard helpers for summary/CSV export
      store/
        boomerbills.ts     Pinia store (state, actions, derived metrics)
        __tests__/...      Store-level unit tests
      __tests__/...        Component tests (Dashboard, Leaderboard, RateInput, Timer, Totals)
  layouts/
    Layout.astro     Global HTML shell (theme, header/footer)
  pages/
    index.astro      Intro screen embedding `Welcome`
    app.astro        Mounts the Vue experience
  test/setup.ts      Vitest global config (Pinia + browser mocks)
astro.config.mjs     Astro/Vite integrations (Vue, Tailwind, PWA)
```

## Routing & Layout
- `src/layouts/Layout.astro` defines the shared HTML structure, imports `app.css`, and provides the navbar/footer used by both pages.
- `src/pages/index.astro` renders the default Astro welcome component for `/`.
- `src/pages/app.astro` is the primary entry point that hydrates the Vue `App.vue` component via `client:load`, enabling SPA behavior inside Astro's shell.

## Vue Application Architecture
`src/components/vue/App.vue` creates a single Pinia instance, installs it on the current Vue app, and loads persisted data on mount. The template arranges a grid of cards:
- **Session card** for `RateInput` + `Timer`
- **Lifetime damage** card for `Totals`
- **Damage Dashboard** for high-level averages
- **Leaderboard** for top costly incidents

Each child component consumes the shared Pinia store, so they remain in sync without prop drilling.

## Pinia Store (`src/components/vue/store/boomerbills.ts`)
- **State**: hourly `rate`, `sessions` array, active `startTime`, and incremental `nextId`.
- **Derived state**: `isRunning`, aggregate totals, sorted sessions, rolling weekly summaries, and averages per day/week/year.
- **Actions**: `start`, `stop`, `addSession`, `clearAll`, and `load`/`persist` for localStorage-backed sessions.
- **Helpers**: `severity` labels incidents, `currentDurationMs` supports the live timer, and `exportCSV` prepares a downloadable log.

LocalStorage keys (`bb_rate`, `bb_sessions`, `bb_next_id`) ensure data survives reloads on the client. All persistence calls guard against SSR by checking `window`.

## Sharing & Export Utilities
`src/components/vue/share.vue` exposes "Copy Summary" and "Export CSV" buttons wired to the store helpers. Clipboard access is mocked in tests to keep assertions deterministic.

## Testing Setup
- `src/test/setup.ts` configures Vue Test Utils to inject Pinia, mocks `localStorage`, and stubs `navigator.clipboard` for component tests.
- Component specs live under `src/components/vue/__tests__/` and assert UI/behavior for Dashboard, Leaderboard, RateInput, Timer, and Totals.
- Store-specific tests reside in `src/components/vue/store/__tests__/boomerbills.spec.ts`.
- Tests run with `npm run test` (alias for `vitest run`).

## Configuration & Tooling
- `astro.config.mjs` enables the Vue integration, Tailwind (via the Vite plugin), and configures the PWA manifest (name, start URL `/app`, standalone display, theme colors).
- Tailwind utilities plus daisyUI classes drive styling from `src/assets/app.css`.
- TypeScript support is enabled through `tsconfig.json`, and Vitest is configured via `vitest.config.ts`.

With this structure you can add new views by creating Astro pages, wire more Vue components into `App.vue`, or extend the Pinia store for new metrics. Feel free to iterate on the dashboard and ship BoomerBill as a lightweight PWA.
