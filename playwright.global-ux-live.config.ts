import { defineConfig, devices } from '@playwright/test';
if (!process.env.GLOBAL_UX_LIVE || !process.env.ISOLATED_BASE_URL || !process.env.E2E_GLOBAL_RUNTIME) throw new Error('Run node scripts/test-global-ux-live.mjs to provision the isolated real backend.');
export default defineConfig({ testDir: './tests/browser', testMatch: 'global-ux-live.spec.ts', workers: 1, retries: 0,
  timeout: 240_000, expect: { timeout: 45_000 }, outputDir: process.env.E2E_GLOBAL_RUNTIME + '/browser-results',
  reporter: [['list'], ['json', { outputFile: process.env.E2E_GLOBAL_RUNTIME + '/browser-results.json' }]],
  use: { ...devices['Desktop Chrome'], baseURL: process.env.ISOLATED_BASE_URL, trace: 'retain-on-failure', serviceWorkers: 'block' } });
