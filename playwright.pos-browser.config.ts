import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const runtime = process.env.POS_BROWSER_RUNTIME;
if (!runtime || !process.env.FRONTEND_URL || !process.env.POS_BROWSER_FIXTURES) {
  throw new Error('Run node scripts/test-pos-browser.mjs to provision the isolated POS.');
}

export default defineConfig({
  testDir: './tests/browser',
  testMatch: 'pos-backend.spec.ts',
  timeout: 180_000,
  expect: { timeout: 25_000 },
  workers: 1,
  retries: 0,
  outputDir: path.join(runtime, 'test-results'),
  reporter: [['list'], ['json', { outputFile: path.join(runtime, 'playwright.json') }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.FRONTEND_URL,
    actionTimeout: 30_000,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
});
