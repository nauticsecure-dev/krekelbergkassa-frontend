import { defineConfig, devices } from '@playwright/test';

// Browser integration tests use mocked HTTP. They do not prove persistence or providers.
export default defineConfig({
  testDir: './tests/browser',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/ui', open: 'never' }]],
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3030', trace: 'retain-on-failure', serviceWorkers: 'block' },
  projects: [{ name: 'chromium-ui', use: { ...devices['Desktop Chrome'] } }],
});
