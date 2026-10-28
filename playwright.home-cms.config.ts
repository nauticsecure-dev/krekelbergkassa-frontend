import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: /home-(cms|cta)\.spec\.ts/,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  workers: 1,
  retries: 0,
  outputDir: '../_audit/home-cms-results',
  reporter: [['list'], ['json', { outputFile: '../_audit/home-cms-results.json' }]],
  use: { baseURL: 'http://127.0.0.1:3046', trace: 'retain-on-failure', serviceWorkers: 'block' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', viewport: { width: 390, height: 844 } } },
    { name: 'tablet', use: { ...devices['iPad Mini'], defaultBrowserType: 'chromium', viewport: { width: 768, height: 1024 } } },
  ],
  webServer: {
    command: 'node scripts/isolated-next-server.cjs 3046',
    env: { NEXT_DIST_DIR: '.next-home-cms', NEXT_PUBLIC_API_URL: '/api' },
    url: 'http://127.0.0.1:3046/nl',
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
