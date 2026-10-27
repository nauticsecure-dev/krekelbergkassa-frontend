import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';

const nl = JSON.parse(fs.readFileSync('src/i18n/messages/nl.json', 'utf8'));
const origin = process.env.JOURNEY_TEST_URL ?? 'http://localhost:3030';
type Event = { event: string; event_id?: string; request_id?: string; session_id?: string; anonymous_session_id?: string;
  http_status?: number; metadata?: Record<string, unknown> };

async function bookingFixture(page: Page, status = 201, options: { photosFail?: boolean; trackingFails?: boolean; networkFails?: boolean; slotsFail?: boolean; googleScript?: string } = {}) {
  const events: Event[] = [];
  const requests: Array<{ id?: string; body: Record<string, unknown> }> = [];
  const photoRequests: string[] = [];
  const batches: Event[][] = [];
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname === 'maps.googleapis.com' && options.googleScript) {
      return route.fulfill({ contentType: 'application/javascript', body: options.googleScript });
    }
    if (url.origin !== origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname.endsWith('/track-event')) {
      const batch = request.postDataJSON().events as Event[];
      batches.push(batch);
      if (options.trackingFails && batches.length === 1) return route.fulfill({ status: 503, json: { tracked: 0 } });
      events.push(...batch);
      return route.fulfill({ status: 201, json: { tracked: batch.length, accepted: batch.length } });
    }
    if (url.pathname.endsWith('/service-catalog/services')) return route.fulfill({ json: { services: [{ code: 'afspuiten', service_code: 'afspuiten',
      visibility: { booking: true }, tariffs: [{ range_from_cm: 0, range_to_cm: 3000, price_incl_vat_euros: 45, duration_minutes: 30, is_on_request: false }] }] } });
    if (url.pathname.endsWith('/booking/preview')) {
      const codes = request.postDataJSON().service_codes as string[];
      return route.fulfill({ json: {
        total_incl_vat: codes.length * 4500, total_duration_minutes: codes.length * 30,
        requires_manual_price: false, requires_on_request: false,
        services: codes.map(service_code => ({ service_code, price_incl_vat: 4500,
          duration_minutes: 30, is_manual: false, is_on_request: false })),
      } });
    }
    if (url.pathname.endsWith('/booking/calendar')) {
      const from = url.searchParams.get('from')!;
      const to = url.searchParams.get('to')!;
      const days = [];
      for (let day = new Date(from); day <= new Date(to); day.setDate(day.getDate() + 1)) days.push({ date: day.toISOString().slice(0, 10), is_open: true });
      return route.fulfill({ json: { days } });
    }
    if (url.pathname.endsWith('/booking/slots')) return route.fulfill({ status: options.slotsFail ? 503 : 200, json: options.slotsFail
      ? { message: 'Availability fixture unavailable' } : { is_open: true, slots: ['09:00', '10:00'], duration_minutes: 30 } });
    if (url.pathname.endsWith('/booking/appointment-fixture/photos')) {
      photoRequests.push(url.pathname);
      return route.fulfill({ status: options.photosFail && photoRequests.length === 1 ? 500 : 200, json: { uploaded: 1 } });
    }
    if (url.pathname.endsWith('/booking')) {
      requests.push({ id: request.headers()['x-request-id'], body: request.postDataJSON() });
      if (options.networkFails) return route.abort('failed');
      return route.fulfill({ status, headers: { 'X-Request-Id': request.headers()['x-request-id'] }, json: status === 201
        ? { appointment_id: 'appointment-fixture', status: 'pending' }
        : { message: 'Booking fixture unavailable', ...(status === 422 ? { errors: { email: ['Email is invalid'] } } : {}) } });
    }
    return route.fulfill({ json: { data: [], items: [], blocks: [], settings: {} } });
  });
  await page.goto('/nl/kraanafspraak', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: nl.crane.title, exact: true })).toBeVisible();
  // The heading is server-rendered; wait for the client tracker to mount so
  // a fast first click cannot race hydration on the development server.
  await expect.poll(() => batches.length).toBeGreaterThan(0);
  return { events, requests, photoRequests, batches };
}

test('address fields are large, stacked and editable after Google billing failure', async ({ page }) => {
  await bookingFixture(page, 201, { googleScript: `
    window.google = { maps: { places: { Autocomplete: function(input) {
      this.addListener = function() {};
      setTimeout(function() {
        if (window.gm_authFailure) window.gm_authFailure();
        setTimeout(function() { input.disabled = true; input.value = 'Google error'; }, 100);
      }, 100);
    } }, event: { clearInstanceListeners: function() {} } } };
  ` });
  await expect(page.locator('#address-manual-hint')).toBeVisible();
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    let previousBottom = 0;
    for (const id of ['street', 'house_number', 'postal_code', 'city']) {
      const field = page.locator(`#${id}`);
      await expect(field).toBeEditable();
      await field.fill(id === 'street' ? 'Hertenerweg' : '12');
      const box = await field.evaluate(el => {
        const rect = el.getBoundingClientRect();
        return { width: rect.width, height: rect.height, y: rect.top + window.scrollY };
      });
      expect(box.width).toBeGreaterThan(240);
      expect(box.height).toBeGreaterThanOrEqual(56);
      expect(box.y).toBeGreaterThan(previousBottom);
      previousBottom = box.y + box.height;
      expect(await field.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(18);
    }
  }
  await expect(page.locator('#street')).toHaveValue('Hertenerweg');
});

test('Google address selection fills four fields and clears details from a previous address', async ({ page }) => {
  await bookingFixture(page, 201, { googleScript: `
    window.google = { maps: { places: { Autocomplete: function(input) {
      var components = [];
      var handler;
      this.getPlace = function() { return { address_components: components }; };
      this.addListener = function(event, callback) { handler = callback; };
      window.selectTestAddress = function(parts) {
        components = Object.entries(parts).map(function(entry) { return { types: [entry[0]], long_name: entry[1] }; });
        handler();
      };
    } }, event: { clearInstanceListeners: function() {} } } };
  ` });
  await expect.poll(() => page.evaluate(() => typeof (window as any).selectTestAddress)).toBe('function');
  await page.evaluate(() => (window as any).selectTestAddress({ route: 'Hertenerweg', street_number: '2', postal_code: '6049aa', locality: 'Herten' }));
  await expect(page.locator('#street')).toHaveValue('Hertenerweg');
  await expect(page.locator('#house_number')).toHaveValue('2');
  await expect(page.locator('#postal_code')).toHaveValue('6049 AA');
  await expect(page.locator('#city')).toHaveValue('Herten');
  await page.evaluate(() => (window as any).selectTestAddress({ route: 'Havenstraat', locality: 'Roermond' }));
  await expect(page.locator('#street')).toHaveValue('Havenstraat');
  await expect(page.locator('#house_number')).toHaveValue('');
  await expect(page.locator('#postal_code')).toHaveValue('');
  await expect(page.locator('#city')).toHaveValue('Roermond');
});

async function completeForm(page: Page) {
  await page.getByPlaceholder('Jan', { exact: true }).fill('PrivateFirstName');
  await page.getByPlaceholder('jan@voorbeeld.nl').fill('private@example.test');
  await page.locator('#street').fill('Private Street');
  await page.locator('#house_number').fill('12 A');
  await page.locator('#postal_code').fill('6041 AB');
  await page.locator('#city').fill('Roermond');
  await page.getByPlaceholder('890', { exact: true }).fill('890');
  await page.locator('button.aspect-square:enabled').first().click();
  await page.getByRole('button', { name: '09:00', exact: true }).click();
}

async function submit(page: Page) {
  await page.getByRole('button', { name: nl.crane.submit, exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: nl.crane.submit, exact: true }).click();
}

test('blocked booking is visible, correlated, and sends no booking request or form values', async ({ page }) => {
  const fixture = await bookingFixture(page);
  await page.getByRole('button', { name: nl.crane.submit, exact: true }).click();
  await expect.poll(() => fixture.events.some((event) => event.event === 'booking_submit_blocked')).toBe(true);
  const blocked = fixture.events.find((event) => event.event === 'booking_submit_blocked')!;
  expect(blocked.request_id).toMatch(/^req_/);
  expect(fixture.events).toContainEqual(expect.objectContaining({ event: 'frontend_error_shown', request_id: blocked.request_id }));
  expect(fixture.requests).toHaveLength(0);
  await expect(page.getByRole('alert').first()).toBeVisible();
});

for (const status of [422, 500]) {
  test(`HTTP ${status}: click, API failure and shown error use the same request and session`, async ({ page }) => {
    const fixture = await bookingFixture(page, status);
    await completeForm(page);
    await submit(page);
    await expect.poll(() => fixture.events.some((event) => event.event === 'booking_failed')).toBe(true);
    expect(fixture.requests).toHaveLength(1);
    const requestId = fixture.requests[0].id;
    for (const event of ['booking_submit_clicked', 'api_requested', 'booking_failed', 'frontend_error_shown']) {
      expect(fixture.events).toContainEqual(expect.objectContaining({ event, request_id: requestId }));
    }
    const correlated = fixture.events.filter((event) => event.request_id === requestId);
    expect(new Set(correlated.map((event) => event.session_id)).size).toBe(1);
    expect(correlated[0].anonymous_session_id).toMatch(/^anon_/);
    expect(JSON.stringify(fixture.events)).not.toMatch(/PrivateFirstName|private@example\.test|Private Street/);
    await expect(page.getByPlaceholder('Jan', { exact: true })).toHaveValue('PrivateFirstName');
    await expect(page.getByRole('alert').first()).toBeVisible();
  });
}

test('photo retry preserves the successful appointment and tracking retries reuse event IDs', async ({ page }) => {
  const fixture = await bookingFixture(page, 201, { photosFail: true, trackingFails: true });
  await completeForm(page);
  await page.locator('input[type=file]').setInputFiles({ name: 'boat.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1T0AAAAASUVORK5CYII=', 'base64') });
  await submit(page);
  await expect(page.getByRole('heading', { name: 'Uw aanvraag is verzonden' })).toBeVisible();
  await expect(page.getByText(nl.crane.photosFailed)).toBeVisible();
  await page.getByRole('button', { name: nl.crane.retryPhotos }).click();
  await expect(page.getByText(nl.crane.photosFailed)).toHaveCount(0);
  await expect.poll(() => fixture.events.some((event) => event.event === 'photo_upload_succeeded')).toBe(true);
  expect(fixture.requests).toHaveLength(1);
  expect(fixture.photoRequests).toHaveLength(2);
  expect(new Set(fixture.photoRequests).size).toBe(1);
  expect(fixture.events).toContainEqual(expect.objectContaining({ event: 'booking_succeeded', request_id: fixture.requests[0].id, http_status: 201 }));
  await expect.poll(() => fixture.batches.slice(1).flat().some((event) => event.event_id === fixture.batches[0][0].event_id)).toBe(true);
});

test('network failure retains correlation and never sends HTTP status zero to tracking', async ({ page }) => {
  const fixture = await bookingFixture(page, 201, { networkFails: true });
  await completeForm(page);
  await submit(page);
  await expect.poll(() => fixture.events.some((event) => event.event === 'booking_failed')).toBe(true);
  expect(fixture.events).toContainEqual(expect.objectContaining({ event: 'booking_failed', request_id: fixture.requests[0].id }));
  expect(fixture.events.find((event) => event.event === 'booking_failed')?.http_status).toBeUndefined();
});

test('failed availability is visible and correlated before a customer can submit', async ({ page }) => {
  const fixture = await bookingFixture(page, 201, { slotsFail: true });
  await page.getByPlaceholder('890', { exact: true }).fill('890');
  await page.locator('button.aspect-square:enabled').first().click();
  await expect(page.getByRole('alert').filter({ hasText: 'Availability fixture unavailable' })).toBeVisible();
  await expect.poll(() => fixture.events.some((event) => event.event === 'api_failed' && event.http_status === 503)).toBe(true);
  const failed = fixture.events.find((event) => event.event === 'api_failed' && event.http_status === 503)!;
  expect(fixture.events).toContainEqual(expect.objectContaining({ event: 'frontend_error_shown', request_id: failed.request_id }));
  expect(fixture.requests).toHaveLength(0);
});

test('admin journey shows grouped failures, intent and funnels without viewport overflow', async ({ page }, testInfo) => {
  await page.context().addCookies([{ name: 'krek_session', value: 'journey-admin-fixture', url: origin }]);
  const requestId = 'req_browser_admin_123';
  const events = ['booking_submit_clicked', 'booking_failed', 'frontend_error_shown'].map((event, index) => ({
    id: `evt-${index}`, action: `frontend.${event}`, title: event, created_at: '2026-10-25T09:00:00Z',
    request_id: requestId, url: '/nl/kraanafspraak', api_method: 'POST', api_endpoint: '/v1/booking', http_status: index ? 500 : undefined,
  }));
  const queries: string[] = [];
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { id: 'admin-fixture', name: 'Journey Admin', email: 'journey-admin@example.test', role: 'super_admin', permissions: ['*'] } });
    if (url.pathname.endsWith('/audit-logs/journeys')) {
      queries.push(url.search);
      return route.fulfill({ json: {
        data: [{ request_id: requestId, outcome: 'failed', frontend_error_shown: true, suspected_silent_failure: false, events }],
        meta: { current_page: 1, last_page: 1, total: 1 },
        activity: { data: events, current_page: 1, last_page: 1, total: 3 },
        summary: { funnel: { visited: 5, started: 4, service_selected: 3, photos_selected: 2, submitted: 2, created: 1 }, conversion: 0.2,
          failed_requests: 1, abandoned_sessions: 1, abandoned: [], likely_intent: { intent: 'crane_booking', confidence: 'high', basis: 'submitted' } },
      } });
    }
    if (url.pathname.endsWith('/track-event')) return route.fulfill({ status: 201, json: { accepted: route.request().postDataJSON().events.length, tracked: 1 } });
    return route.fulfill({ json: { data: [], items: [], meta: { total: 0, current_page: 1, last_page: 1 }, counters: { event_types: 0, entity_types: 0 } } });
  });
  await page.goto('/nl/admin/audit', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: nl.journey.title, exact: true })).toBeVisible();
  await page.locator('summary').filter({ hasText: requestId }).click();
  await expect(page.locator('details').getByText(nl.journey.events.booking_failed, { exact: false })).toBeVisible();
  await page.getByLabel(nl.journey.status, { exact: true }).fill('400');
  await expect.poll(() => queries.some((query) => query.includes('http_status_min=400'))).toBe(true);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.locator('main').evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`journey-${width}.png`), fullPage: true });
  }
});
