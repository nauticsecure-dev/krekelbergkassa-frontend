import { defineConfig } from '@playwright/test';
import ui from './playwright.ui.config';

export default defineConfig({ ...ui,
  testMatch: '**/cms-persistence.spec.ts',
  use: { ...ui.use, baseURL: process.env.CMS_TEST_BASE_URL ?? 'http://localhost:3030' },
});
