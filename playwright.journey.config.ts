import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

// Keep compilation and the server separate from a developer's running app.
process.env.JOURNEY_TEST_URL = 'http://localhost:3035';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: 'booking-journey.spec.ts',
  outputDir: './journey-test-results',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: { baseURL: process.env.JOURNEY_TEST_URL, trace: 'retain-on-failure', serviceWorkers: 'block' },
  projects: [{ name: 'journey-chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node node_modules/next/dist/bin/next dev -p 3035',
    url: `${process.env.JOURNEY_TEST_URL}/nl/kraanafspraak`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_DIST_DIR: '.next-journey-tests',
      NEXT_FONT_GOOGLE_MOCKED_RESPONSES: path.resolve('tests/fixtures/journey-fonts.cjs'),
    },
  },
});
