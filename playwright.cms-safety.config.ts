import { defineConfig } from '@playwright/test';
import ui from './playwright.ui.config';

export default defineConfig({
  ...ui,
  testMatch: ['**/cms-session-safety.spec.ts', '**/cms-editing.spec.ts'],
  timeout: 180_000,
  outputDir: 'artifacts/cms-session-safety',
  reporter: [['list']],
  use: { ...ui.use, baseURL: 'http://localhost:3057' },
  webServer: {
    command: 'node --max-old-space-size=768 node_modules/next/dist/bin/next dev -p 3057',
    env: { NEXT_DIST_DIR: '.next-cms-session-safety', NEXT_PUBLIC_API_URL: '/api' },
    url: 'http://localhost:3057/en',
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
