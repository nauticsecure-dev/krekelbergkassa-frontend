import { defineConfig } from '@playwright/test';
import { browserProjects } from './tests/helpers/browser-projects';
import { resolve } from 'node:path';

const reportDir = process.env.WERFCANVAS_LIVE_REPORT_DIR ?? 'test-results/werfcanvas-live';

export default defineConfig({
  testDir: './tests/browser', testMatch: ['werfcanvas-live-*.spec.ts'],
  timeout: 180_000, expect: { timeout: 30000 }, workers: 1,
  reporter: [['list'], ['json', { outputFile: resolve(reportDir, 'results.json') }]], outputDir: resolve(reportDir, 'artifacts'),
  use: { trace: 'off', serviceWorkers: 'block' },
  projects: browserProjects().map(project => ({ ...project,
    // The API race is browser-independent; each engine gets its own real UI save.
    ...(project.name !== 'chromium' ? { testIgnore: 'werfcanvas-live-concurrent.spec.ts' } : {}),
  })),
});
