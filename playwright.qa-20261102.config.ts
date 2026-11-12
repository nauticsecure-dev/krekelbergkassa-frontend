import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const baseURL = 'http://localhost:3072';
export default defineConfig({
  testDir: './tests/browser',
  testMatch: ['contact-settings.spec.ts', 'contact-routing.spec.ts', 'hiswa-card.spec.ts', 'cms-media.spec.ts', 'cms-persistence.spec.ts', 'cms-session-safety.spec.ts', 'admin-audit.spec.ts', 'admin-review.spec.ts'],
  timeout: 120000,
  expect: { timeout: 20000 },
  workers: 1,
  retries: 0,
  outputDir: '../_audit/qa-20261102/browser',
  reporter: [['list'], ['json', { outputFile: '../_audit/qa-20261102/browser.json' }]],
  use: { baseURL, trace: 'retain-on-failure', serviceWorkers: 'block' },
  projects: [{ name: 'chromium-qa', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node --max-old-space-size=2048 node_modules/next/dist/bin/next dev -p 3072',
    env: { NEXT_DIST_DIR: '.next-qa-20261102', NEXT_PUBLIC_API_URL: '/api', API_PROXY_TARGET: 'http://127.0.0.1:9', E2E_LOW_MEMORY: '1', NEXT_FONT_GOOGLE_MOCKED_RESPONSES: path.resolve('tests/fixtures/journey-fonts.cjs') },
    url: baseURL + '/en',
    reuseExistingServer: false,
    timeout: 240000,
  },
});
