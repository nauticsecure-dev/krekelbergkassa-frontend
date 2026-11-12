import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser', testMatch: ['smart-services.spec.ts', 'pricing-permissions.spec.ts', 'pricing-catalog-flow.spec.ts'], workers: 1,
  timeout: 120000, expect: { timeout: 20000 },
  outputDir: '../_audit/smart-services-browser', reporter: [['list']],
  use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:3049', trace: 'retain-on-failure', serviceWorkers: 'block' },
  webServer: {
    command: 'node node_modules/next/dist/bin/next dev -p 3049',
    env: { NEXT_DIST_DIR: '.next-smart-services', NEXT_PUBLIC_API_URL: '/api' },
    url: 'http://localhost:3049/nl/diensten', reuseExistingServer: false, timeout: 240000,
  },
});
