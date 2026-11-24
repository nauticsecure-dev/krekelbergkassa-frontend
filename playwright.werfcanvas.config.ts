import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import { browserProjects } from './tests/helpers/browser-projects';

const baseURL = process.env.WERFCANVAS_BROWSER_BASE_URL ?? 'http://127.0.0.1:3053';
export default defineConfig({
  testDir: './tests/browser', testMatch: 'werfcanvas-daily.spec.ts',
  timeout: 120_000, expect: { timeout: 20_000 }, workers: 1,
  outputDir: 'test-results/werfcanvas', reporter: 'list',
  use: { baseURL, serviceWorkers: 'block', trace: 'retain-on-failure' },
  projects: browserProjects(),
  webServer: process.env.WERFCANVAS_BROWSER_BASE_URL ? undefined : {
    command: 'node scripts/isolated-next-server.cjs 3053', url: baseURL + '/sw.js',
    timeout: 240_000, reuseExistingServer: false,
    env: { NEXT_DIST_DIR: '.next-werfcanvas', NEXT_PUBLIC_API_URL: '/api',
      NEXT_FONT_GOOGLE_MOCKED_RESPONSES: resolve('tests/fixtures/journey-fonts.cjs') },
  },
});
