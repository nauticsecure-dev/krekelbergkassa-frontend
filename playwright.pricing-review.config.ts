import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser', testMatch: 'pricing-catalog-flow.spec.ts',
  timeout: 120_000, expect: { timeout: 30_000 }, workers: 1,
  outputDir: '../_audit/pricing-review-browser', reporter: 'list',
  use: { baseURL: 'http://localhost:3030', serviceWorkers: 'block', trace: 'retain-on-failure' },
});
