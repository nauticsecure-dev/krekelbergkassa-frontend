import { defineConfig } from '@playwright/test';
import ui from './playwright.ui.config';

const port = Number(process.env.CMS_TEST_PORT ?? 3058);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  ...ui,
  testMatch: ['**/cms-media.spec.ts', '**/cms-persistence.spec.ts', '**/cms-session-safety.spec.ts'],
  outputDir: 'artifacts/cms-media',
  reporter: [['list']],
  use: { ...ui.use, baseURL },
  webServer: {
    command: `node --max-old-space-size=1536 scripts/isolated-next-server.cjs ${port}`,
    env: { NEXT_DIST_DIR: process.env.CMS_TEST_PORT ? `.next-cms-media-${port}` : '.next-cms-media', NEXT_PUBLIC_API_URL: '/api', NEXT_FONT_GOOGLE_MOCKED_RESPONSES:process.cwd()+'/tests/fixtures/journey-fonts.cjs', E2E_LOW_MEMORY: '0' },
    url: `${baseURL}/en`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
