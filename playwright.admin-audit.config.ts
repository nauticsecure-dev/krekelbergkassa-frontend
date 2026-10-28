import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
if (fs.existsSync('artifacts/admin-audit/stop')) throw new Error('Admin verification stopped to release host memory.');
const outputDir = process.env.ADMIN_AUDIT_OUTPUT ?? 'artifacts/admin-audit/browser';
export default defineConfig({
  testDir: './tests/browser',
  testMatch: ['admin-audit.spec.ts', 'admin-review.spec.ts', 'pricing-permissions.spec.ts'],
  timeout: 180000,
  expect: { timeout: 45000 },
  workers: 1,
  fullyParallel: true,
  retries: 0,
  outputDir,
  reporter: [['list'], ['json', { outputFile: `${outputDir}-results.json` }]],
  use: { baseURL: 'http://localhost:3047', trace: 'retain-on-failure', serviceWorkers: 'block' },
  projects: [{ name: 'admin-audit', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node --v8-pool-size=1 scripts/admin-audit-server.cjs',
    env: { NEXT_DIST_DIR: '.next-admin-audit', NEXT_PUBLIC_API_URL: '/api', API_PROXY_TARGET: 'http://127.0.0.1:9', RAYON_NUM_THREADS: '1', NEXT_FONT_GOOGLE_MOCKED_RESPONSES: path.resolve('tests/fixtures/journey-fonts.cjs') },
    url: 'http://localhost:3047/sw.js',
    timeout: 300000,
    reuseExistingServer: false,
  },
});
