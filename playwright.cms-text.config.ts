import { defineConfig } from '@playwright/test';
import { browserProjects } from './tests/helpers/browser-projects';
import { resolve } from 'node:path';

export default defineConfig({
  testDir: './tests/browser', testMatch: ['cms-text-coverage.spec.ts', 'cms-site-pages.spec.ts'],
  timeout: 120_000, expect: { timeout: 20_000 }, workers: 2,
  projects: browserProjects(),
  outputDir: process.env.CMS_TEXT_REPORT_DIR ? resolve(process.env.CMS_TEXT_REPORT_DIR, 'artifacts') : '../_audit/cms-text-results',
  reporter: [['list'], ['json', { outputFile: process.env.CMS_TEXT_REPORT_DIR ? resolve(process.env.CMS_TEXT_REPORT_DIR, 'results.json') : '../_audit/cms-text-results.json' }]],
  use: { baseURL: process.env.CMS_TEXT_BASE_URL ?? 'http://127.0.0.1:3051', serviceWorkers: 'block', trace: 'retain-on-failure' },
  webServer: process.env.CMS_TEXT_BASE_URL ? undefined : {
    command: 'node scripts/isolated-next-server.cjs 3051',
    env: { NEXT_DIST_DIR: '.next-cms-text', NEXT_PUBLIC_API_URL: '/api' },
    url: 'http://127.0.0.1:3051/nl', timeout: 240_000, reuseExistingServer: false,
  },
});
