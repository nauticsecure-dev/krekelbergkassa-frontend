import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
const baseURL = 'http://localhost:3049';
const outputDir = process.env.ALL_TEST_RESULTS_DIR ?? '../_audit/all-browser-results';
process.env.CMS_TEST_BASE_URL = baseURL;
process.env.JOURNEY_TEST_URL = baseURL;
export default defineConfig({
  testDir: './tests',
  timeout: 180000,
  expect: { timeout: 20000 },
  workers: 1,
  retries: 0,
  outputDir,
  reporter: [['list'], ['json', { outputFile: `${outputDir}.json` }]],
  use: { baseURL, trace: 'retain-on-failure', serviceWorkers: 'block' },
  projects: [{ name: 'chromium-all', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node node_modules/next/dist/bin/next dev -p 3049',
    env: { NEXT_DIST_DIR: '.next-all-tests', NEXT_PUBLIC_API_URL: '/api', NEXT_FONT_GOOGLE_MOCKED_RESPONSES: path.resolve('tests/fixtures/journey-fonts.cjs') },
    url: baseURL + '/en',
    reuseExistingServer: process.env.ALL_TEST_REUSE_SERVER === '1',
    timeout: 300000,
  },
});
