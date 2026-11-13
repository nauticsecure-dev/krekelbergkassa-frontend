import { defineConfig, devices } from '@playwright/test';
import { join } from 'node:path';

const runtime = process.env.PORTAL_LIVE_RUNTIME;
const baseURL = process.env.FRONTEND_URL;
if (!runtime || !baseURL || new URL(baseURL).hostname !== '127.0.0.1') {
  throw new Error('Run node scripts/test-customer-portal-live.mjs to start the isolated portal.');
}

export default defineConfig({
  testDir: './tests/browser',
  testMatch: 'customer-portal-live.spec.ts',
  timeout: 150_000,
  expect: { timeout: 30_000 },
  workers: 1,
  outputDir: join(runtime, 'test-results'),
  use: { ...devices['Desktop Chrome'], baseURL, serviceWorkers: 'block' },
});
