import { test as base, expect } from '@playwright/test';

export const test = base.extend<{ browserEvidence: void }>({
  browserEvidence: [async ({ browser, browserName, context }, use, info) => {
    // Cold Next development compilation can trigger a full-page HMR reload
    // during navigation. It is unrelated to the user workflow being tested.
    await context.routeWebSocket('**/_next/webpack-hmr', socket => socket.close());
    await info.attach('browser-environment.json', {
      contentType: 'application/json',
      body: JSON.stringify({ project: info.project.name, engine: browserName, version: browser.version(),
        channel: info.project.use.channel ?? null, hostPlatform: process.platform, hostArchitecture: process.arch }),
    });
    await use();
  }, { auto: true }],
});
export { expect };
