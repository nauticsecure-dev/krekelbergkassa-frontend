import { defineConfig } from '@playwright/test';
import isolated from './playwright.isolated-live.config';
export default defineConfig({...isolated, workers:process.env.CMS_MEDIA_COMPLETE === '1' ? 2 : 1, grep:process.env.CMS_MEDIA_GREP ? new RegExp(process.env.CMS_MEDIA_GREP) : undefined, testMatch:process.env.CMS_MEDIA_COMPLETE === '1' ? 'cms-media-complete.spec.ts' : 'cms-media-live.spec.ts', timeout:240_000});
