import { defineConfig } from '@playwright/test';

// Mocked browser integration: deployed persistence needs a separate real API check.
export default defineConfig({
  testDir: './tests/browser',
  testMatch: /(?:cms-editing|hiswa-card)\.spec\.ts/,
  grep: /certification badge|HISWA/,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  workers: 1,
  reporter: [['list']],
  outputDir: '../_audit/certification-results',
  use: { baseURL: 'http://127.0.0.1:3056', serviceWorkers: 'block', trace: 'retain-on-failure' },
  webServer: {
    command: 'node scripts/isolated-next-server.cjs 3056',
    env: { NEXT_DIST_DIR: '.next-certification', NEXT_PUBLIC_API_URL: '/api' },
    url: 'http://127.0.0.1:3056/nl',
    timeout: 240_000,
    reuseExistingServer: false,
  },
});
