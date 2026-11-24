import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import { browserProjects } from './tests/helpers/browser-projects';

const baseURL = process.env.CROSS_BROWSER_BASE_URL ?? 'http://127.0.0.1:3060';
const reportDir = process.env.CROSS_BROWSER_REPORT_DIR ?? 'test-results/cross-browser';
export default defineConfig({
  testDir: './tests/browser',
  testMatch: ['cms-text-coverage.spec.ts', 'cms-session-safety.spec.ts', 'werfcanvas-daily.spec.ts'],
  timeout: 180000, expect: { timeout: 30000 }, workers: 1, retries: 0,
  outputDir: resolve(reportDir, 'artifacts'),
  reporter: [['list'], ['json', { outputFile: resolve(reportDir, 'results.json') }],
    ['html', { outputFolder: resolve(reportDir, 'html'), open: 'never' }]],
  use: { baseURL, serviceWorkers: 'block', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: browserProjects(process.env.CROSS_BROWSER_CHANNELS !== '0'),
  metadata: { hostPlatform: process.platform, hostArchitecture: process.arch,
    safariCoverage: 'Playwright WebKit engine; branded Safari requires native Safari validation' },
  webServer: process.env.CROSS_BROWSER_BASE_URL ? undefined : {
    command: 'node scripts/isolated-next-server.cjs 3060', url: baseURL + '/sw.js',
    timeout: 240000, reuseExistingServer: false,
    env: { NEXT_DIST_DIR: '.next-cross-browser', NEXT_PUBLIC_API_URL: '/api', E2E_DEV_LOW_MEMORY: '1',
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --max-old-space-size=512`.trim(),
      NEXT_FONT_GOOGLE_MOCKED_RESPONSES: resolve('tests/fixtures/journey-fonts.cjs') },
  },
});
