import { defineConfig } from '@playwright/test';

// Pure contracts. No browser, backend, credentials or provider required.
export default defineConfig({ testDir: './tests/contracts', outputDir: './test-results/contracts', reporter: 'list' });
