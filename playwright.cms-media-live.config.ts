import { defineConfig } from '@playwright/test';
import isolated from './playwright.isolated-live.config';
export default defineConfig({...isolated, testMatch:'cms-media-live.spec.ts', timeout:240_000});
