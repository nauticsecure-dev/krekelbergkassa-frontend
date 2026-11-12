import {defineConfig} from '@playwright/test';
import isolated from './playwright.isolated-live.config';

// The runner owns the server lifecycle; Playwright does not spawn another Next server.
export default defineConfig({...isolated, workers:1, timeout:240000,
  testMatch:['cms-media.spec.ts','cms-persistence.spec.ts','cms-session-safety.spec.ts'],
  grep:process.env.CMS_MEDIA_PREFLIGHT === '1' ? /media controls wait|media controls keep generated|media controls restore saved/
    : /media controls|image adjustments preview|every inline media|image draft\/crop|expired image/,
});
