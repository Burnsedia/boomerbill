import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4321',
    headless: true
  },
  webServer: {
    command: 'npm run dev -- --host 0.0.0.0 --port 4321',
    url: 'http://localhost:4321',
    reuseExistingServer: true,
    timeout: 120_000
  }
})
