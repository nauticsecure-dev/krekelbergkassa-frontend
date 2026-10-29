import { defineConfig, devices } from '@playwright/test';

// Low-memory entity CRUD checks against the already-running local Next (3030).
// Application HTTP is intercepted; no second Next process is started.
const focus = process.env.ADMIN_CRUD_GREP || 'boat |supplier ';
export default defineConfig({
  testDir: './tests/browser',
  testMatch: ['admin-audit.spec.ts'],
  grep: new RegExp(focus),
  timeout: 180000,
  expect: { timeout: 45000 },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  outputDir: 'artifacts/admin-audit/entity-crud',
  reporter: [['list'], ['json', { outputFile: 'artifacts/admin-audit/entity-crud-results.json' }]],
  use: {
    baseURL: 'http://localhost:3030',
    trace: 'retain-on-failure',
    serviceWorkers: 'block',
    ...devices['Desktop Chrome'],
  },
});
