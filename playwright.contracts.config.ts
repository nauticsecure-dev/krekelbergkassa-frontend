import { defineConfig } from '@playwright/test';

// Pure permission contracts. No browser, backend, credentials or provider required.
export default defineConfig({ testDir: './tests/contracts', reporter: 'list' });
