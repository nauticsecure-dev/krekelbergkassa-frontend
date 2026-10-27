import { resolve } from 'node:path';
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser', testMatch: 'erp-navigation.spec.ts', timeout: 120_000,
  expect: { timeout: 30_000 }, workers: 1, retries: 0, reporter: 'list',
  outputDir: 'test-results/erp',
  use: { baseURL: 'http://127.0.0.1:3051', trace: 'retain-on-failure', serviceWorkers: 'block' },
  webServer: {
    command: 'node scripts/isolated-next-server.cjs 3051',
    url: 'http://127.0.0.1:3051/en/diensten', reuseExistingServer: true, timeout: 240_000,
    env: { NEXT_DIST_DIR: '.next-erp', NEXT_PUBLIC_API_URL: '/api',
      NEXT_FONT_GOOGLE_MOCKED_RESPONSES: resolve('tests/fixtures/journey-fonts.cjs') },
  },
});
