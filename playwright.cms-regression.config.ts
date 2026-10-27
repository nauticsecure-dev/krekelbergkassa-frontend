import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: 'cms-page-regression.spec.ts',
  timeout: 180_000,
  expect: { timeout: 20_000 },
  workers: 1,
  retries: 0,
  outputDir: '../_audit/cms-page-regression-results',
  reporter: [['list'], ['json', { outputFile: process.env.CMS_TEST_REPORT ?? '../_audit/cms-page-regression-results.json' }]],
  use: { baseURL: 'http://localhost:3042', trace: 'retain-on-failure', serviceWorkers: 'block' },
  webServer: {
    cwd: process.env.CMS_TEST_APP_DIR ?? process.cwd(),
    command: 'node node_modules/next/dist/bin/next dev -p 3042',
    env: { NEXT_DIST_DIR: '.next-cms-regression', NEXT_PUBLIC_API_URL: '/api' },
    url: 'http://localhost:3042/en/verkoop',
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
