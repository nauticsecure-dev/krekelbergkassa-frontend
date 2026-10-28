import { resolve } from 'node:path';
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', testMatch: 'global-ux.spec.ts', timeout: 180_000,
  expect: { timeout: 30_000 }, workers: 1, retries: 0,
  outputDir: '../_audit/global-ux/browser-results', reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3048', trace: 'retain-on-failure', serviceWorkers: 'block' },
  webServer: { command: 'node scripts/isolated-next-server.cjs 3048',
    url: 'http://127.0.0.1:3048/en/diensten', reuseExistingServer: false, timeout: 240_000,
    env: { NEXT_DIST_DIR: '.next-global-ux', NEXT_PUBLIC_API_URL: '/api', NEXT_FONT_GOOGLE_MOCKED_RESPONSES: resolve('tests/fixtures/journey-fonts.cjs') } },
});
