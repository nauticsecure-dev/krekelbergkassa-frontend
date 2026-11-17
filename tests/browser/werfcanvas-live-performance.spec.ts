import { devices, expect, test, type Request } from '@playwright/test';

const target = process.env.WERFCANVAS_PERF_URL;
const storageState = process.env.WERFCANVAS_PERF_STORAGE_STATE;
const minBoats = 250;
const minBoatImages = 50;
const photoSelector = 'image[data-perf-loaded="true"]';

test.skip(!target || !storageState, 'Set WERFCANVAS_PERF_URL and WERFCANVAS_PERF_STORAGE_STATE for a live run.');
test.use({ storageState, trace: 'off' });

async function timings(request: Request) {
  const response = await request.response();
  expect(response?.ok(), 'map resource returned a successful HTTP response').toBe(true);
  const { requestStart, responseStart, responseEnd } = request.timing();
  expect(requestStart, 'network request has timing data').toBeGreaterThanOrEqual(0);
  expect(responseStart, 'response has a first-byte time').toBeGreaterThanOrEqual(requestStart);
  expect(responseEnd, 'response completed').toBeGreaterThanOrEqual(responseStart);
  return {
    timeToFirstByteMs: responseStart - requestStart,
    durationMs: responseEnd - requestStart,
    responseBytes: (await request.sizes()).responseBodySize,
  };
}

for (const profile of ['desktop', 'mobile emulation']) {
  test.describe(profile, () => {
    const mobile = profile === 'mobile emulation';
    const { viewport, deviceScaleFactor, userAgent, isMobile, hasTouch } = devices['Pixel 7'];
    test.use(mobile ? { viewport, deviceScaleFactor, userAgent, isMobile, hasTouch } : { viewport: { width: 1680, height: 1000 } });

    test('measures the live Werfcanvas API, photography and zoom controls', async ({ page }) => {
      test.setTimeout(240_000);
      const url = new URL('/nl/admin/stalling/werfcanvas', target);
      const session = await page.context().newCDPSession(page);
      await session.send('Network.enable');
      await session.send('Network.setCacheDisabled', { cacheDisabled: true });
      await page.addInitScript(() => {
        document.addEventListener('load', event => {
          if (event.target instanceof SVGImageElement) event.target.dataset.perfLoaded = 'true';
        }, true);
      });

      const completed: Request[] = [];
      page.on('requestfinished', request => completed.push(request));
      const firstPage = page.waitForResponse(response => {
        const url = new URL(response.url());
        return url.pathname.endsWith('/yard-canvas') && url.searchParams.get('placed') === '1'
          && Number(url.searchParams.get('page') ?? 1) === 1;
      }, { timeout: 60_000 });
      await page.goto(url.href, { waitUntil: 'domcontentloaded' });
      const response = await firstPage;
      expect(response.ok(), 'placed inventory API').toBe(true);
      const { boats, background } = await response.json();
      expect(boats.total, 'representative placed inventory').toBeGreaterThanOrEqual(minBoats);
      expect(background?.calibration_current, 'published aerial photograph').toBe(true);

      const map = page.getByLabel('Interactieve werfkaart', { exact: true });
      await expect(map.getByRole('button')).toHaveCount(boats.total, { timeout: 60_000 });
      const aerial = map.locator(':scope > g > image');
      const boatImages = map.locator('g[role="button"] image');
      await expect(aerial).toHaveAttribute('data-perf-loaded', 'true', { timeout: 60_000 });
      const boatImageCount = await boatImages.count();
      expect(boatImageCount, 'boats with photographs').toBeGreaterThanOrEqual(minBoatImages);
      await expect(map.locator(photoSelector)).toHaveCount(boatImageCount + 1, { timeout: 150_000 });
      const readyMs = await page.evaluate(() => new Promise<number>(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now())))));

      const boatImageUrls = new Set(await boatImages.evaluateAll(images =>
        images.map(image => new URL(image.getAttribute('href')!, document.baseURI).href)));
      const inventory = completed.filter(request => {
        const url = new URL(request.url());
        return url.pathname.endsWith('/yard-canvas') && url.searchParams.get('placed') === '1';
      });
      const pageNumber = (request: Request) => Number(new URL(request.url()).searchParams.get('page') ?? 1);
      expect([...new Set(inventory.map(pageNumber))].sort((a, b) => a - b))
        .toEqual(Array.from({ length: boats.last_page }, (_, index) => index + 1));
      const backgroundRequest = completed.find(request =>
        new URL(request.url()).pathname.endsWith(`/yard-canvas/background/${background.version}`));
      expect(backgroundRequest, 'authenticated background download').toBeDefined();
      const photoRequests = completed.filter(request => boatImageUrls.has(request.url()) && request.resourceType() === 'image');
      expect(new Set(photoRequests.map(request => request.url())).size).toBe(boatImageUrls.size);
      const storage = await Promise.all(photoRequests.map(async request => {
        let final = request;
        while (final.redirectedTo()) final = final.redirectedTo()!;
        return { origin: new URL(final.url()).origin, ...(await timings(final)) };
      }));

      const toolbar = page.getByRole('group', { name: 'Werfcanvas werkbalk' });
      if (mobile) {
        await toolbar.locator('summary[title="Meer filters en kaartbediening"]').tap({ timeout: 10_000 });
        await toolbar.locator('summary[title="Kaartacties"]:visible').tap({ timeout: 10_000 });
      }
      const zoomSamples = [];
      for (const name of ['Inzoomen', 'Uitzoomen', 'Inzoomen', 'Uitzoomen', 'Inzoomen', 'Uitzoomen']) {
        const button = toolbar.getByRole('button', { name, exact: true });
        await expect(button).toBeVisible({ timeout: 10_000 });
        const measurement = await button.evaluateHandle(element => {
          const layer = document.querySelector('svg[aria-label="Interactieve werfkaart"] > g')!;
          const sample = new Promise<number>((resolve, reject) => {
            element.addEventListener('click', () => {
              const previous = layer.getAttribute('transform');
              const start = performance.now();
              const observe = () => {
                const elapsed = performance.now() - start;
                if (layer.getAttribute('transform') !== previous) resolve(elapsed);
                else if (elapsed >= 2_000) reject(new Error('Zoom control did not update the map.'));
                else requestAnimationFrame(observe);
              };
              requestAnimationFrame(observe);
            }, { once: true });
          });
          return { sample };
        });
        await (mobile ? button.tap({ timeout: 10_000 }) : button.click({ timeout: 10_000 }));
        zoomSamples.push(await measurement.evaluate(({ sample }) => Promise.race([
          sample,
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Zoom control did not complete a measured click.')), 3_000);
          }),
        ])));
        await measurement.dispose();
      }

      await test.info().attach('werfcanvas-live-performance.json', {
        contentType: 'application/json',
        body: JSON.stringify({
          target: url.origin, profile, browser: await page.evaluate(() => navigator.userAgent),
          viewport: page.viewportSize(), boats: boats.total, boatImageCount, readyMs,
          inventory: await Promise.all(inventory.map(async request => ({ page: pageNumber(request), ...(await timings(request)) }))),
          background: await timings(backgroundRequest!),
          boatImages: storage,
          zoomClickToObservedFrameMs: zoomSamples,
        }, null, 2),
      });
    });
  });
}
