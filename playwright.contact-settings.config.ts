import { defineConfig } from '@playwright/test';
import ui from './playwright.ui.config';

export default defineConfig({
  ...ui,
  testMatch: ['**/contact-settings.spec.ts', '**/contact-routing.spec.ts'],
  timeout: 180_000,
  reporter: [['list']],
  outputDir: 'artifacts/contact-settings',
  use: { ...ui.use, baseURL: 'http://localhost:3063' },
  webServer: {
    command: 'node node_modules/next/dist/bin/next dev -p 3063',
    env: { NEXT_DIST_DIR: '.next-contact-settings', NEXT_PUBLIC_API_URL: '/api' },
    url: 'http://localhost:3063/en/contact',
    reuseExistingServer: process.env.CONTACT_TEST_REUSE_SERVER === '1',
    timeout: 240_000,
  },
});
