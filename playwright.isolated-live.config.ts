import { defineConfig, devices } from '@playwright/test';

if (!process.env.ISOLATED_BASE_URL || !process.env.ISOLATED_TEST_RESULTS) {
  throw new Error('Run node scripts/test-isolated-live.mjs to provision isolated dummy data first.');
}

export default defineConfig({
  testDir: './tests/browser',
  testMatch: 'pricing-live.spec.ts',
  workers: 1,
  retries: 0,
  // The single-process PHP fixture server serializes dashboard API requests.
  expect: { timeout: Number(process.env.E2E_EXPECT_TIMEOUT ?? 30_000) },
  outputDir: process.env.ISOLATED_TEST_RESULTS,
  reporter: [['list'], ['json', { outputFile: `${process.env.ISOLATED_TEST_RESULTS}.json` }]],
  use: { baseURL: process.env.ISOLATED_BASE_URL, ...devices['Desktop Chrome'], trace: 'retain-on-failure' },
});
