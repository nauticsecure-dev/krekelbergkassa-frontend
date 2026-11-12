import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';

const dictionaries = Object.fromEntries(['nl', 'en', 'de', 'fr'].map((locale) => [locale,
  JSON.parse(fs.readFileSync(`src/i18n/messages/${locale}.json`, 'utf8'))]));
function text(locale: string, key: string) {
  const value = key.split('.').reduce((value, part) => value?.[part], dictionaries[locale]);
  if (typeof value !== 'string') throw new Error(`Missing test label ${locale}:${key}`);
  return value;
}

async function isolatedSession(page: Page, role = 'super_admin', permissions = ['*']) {
  const baseURL = test.info().project.use.baseURL!;
  await page.context().addCookies([{ name: 'krek_session', value: 'browser-fixture', url: baseURL }]);
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== baseURL) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: {
      id: 'review-user', name: 'Audit Reviewer', email: 'review@example.test', role, permissions,
    } });
    if (url.pathname.endsWith('/admin/calendar')) return route.fulfill({ json: { regular_hours: [], exceptions: [], lunch_block: null } });
    if (url.pathname.endsWith('/customers')) return route.fulfill({ json: { data: [{ id: 'customer-1', name: 'Hans Müller', email: 'hans@example.test' }] } });
    if (url.pathname.endsWith('/products')) return route.fulfill({ json: { data: [] } });
    // Shell notifications and telemetry are local fixtures as well. Nothing reaches a provider.
    return route.fulfill({ json: { data: [], items: [], meta: { total: 0, current_page: 1, last_page: 1 }, cards: [] } });
  });
}

async function posCheckoutFixture(page: Page) {
  await isolatedSession(page);
  const boat = { id: 'boat-pos', name: 'Harbor Star', registration_number: 'STAR-1135', length_cm: 1135, photo_url: '/pos-boat-fixture.svg',
    width_cm: 380, weight_kg: 4200, customer_id: 'customer-1', customer: { id: 'customer-1', name: 'Hans Müller' } };
  const secondBoat = { ...boat, id: 'boat-pos-two', name: 'Harbor Moon', photo_url: '/pos-boat-moon.svg', registration_number: 'MOON-920', length_cm: 920, width_cm: 310, weight_kg: 2900 };
  const product = { id: 'lift-pos', code: 'LIFT-POS', name: 'Harbor lift', active: true, show_in_kassa: true,
    pricing_type: 'length_range', price_excl_vat: 0, price_incl_vat: 0 };
  await page.route('**/api/v1/products**', async route => {
    if (route.request().method() !== 'GET') return route.fulfill({ json: {} });
    return route.fulfill({ json: { data: new URL(route.request().url()).pathname.endsWith('/products') ? [product] : [] } });
  });
  await page.route('**/api/v1/boats?**', route => route.fulfill({ json: { data: [boat, secondBoat] } }));
  await page.route('**/pos-boat-*.svg', route => route.fulfill({ contentType: 'image/svg+xml',
    body: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#17334d"/><text x="40" y="180" fill="white" font-size="36">${route.request().url().includes('moon') ? 'Harbor Moon' : 'Harbor Star'}</text></svg>` }));
  await page.route('**/api/v1/kassa/payment-methods', route => route.fulfill({ json: { pos: ['cash', 'invoice'], online: ['creditcard', 'ideal'] } }));
  await page.route('**/api/v1/kassa/quote', route => {
    const request = route.request().postDataJSON();
    const selected = request.items[0].metadata.boat_id === secondBoat.id ? secondBoat : boat;
    expect(request).toMatchObject({ customer_id: 'customer-1', items: [{ product_id: product.id,
      metadata: { boat_id: selected.id, length_cm: selected.length_cm, width_cm: selected.width_cm, weight_kg: selected.weight_kg } }] });
    const subtotal = selected.id === boat.id ? 13500 : 10000;
    const vat = Math.round(subtotal * 0.21);
    return route.fulfill({ json: { total_cents: subtotal + vat, subtotal_cents: subtotal, vat_amount_cents: vat,
      lines: [{ unit_price: subtotal, vat_rate: 21, vat_amount: vat, line_total: subtotal + vat, included_services: { wash: 1 } }] } });
  });
}

async function addPricedPosService(page: Page) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/en/admin/kassa');
  await page.getByRole('searchbox', { name: /search boats/i }).fill('STAR-1135');
  await page.getByRole('button', { name: /Harbor Star.*STAR-1135/ }).click();
  await expect(page.getByRole('img', { name: 'Harbor Star', exact: true })).toHaveJSProperty('naturalWidth', 640);
  await page.getByRole('button', { name: /Harbor lift.*Calculate price/ }).click();
  await expect(page.getByRole('dialog').getByRole('spinbutton', { name: /Length/ })).toHaveValue('1135');
  await page.getByRole('dialog').getByRole('button', { name: 'Calculate price', exact: true }).click();
  await expect(page.locator('#cart')).toContainText('Package includes');
  await expect(page.locator('#cart')).toContainText('€163.35');
}

test('POS changes boat context only after an explicit recalculation with canonical dimensions', async ({ page }, testInfo) => {
  await posCheckoutFixture(page);
  await addPricedPosService(page);
  await page.getByRole('searchbox', { name: /search boats/i }).fill('MOON-920');
  await page.getByRole('button', { name: /Harbor Moon.*MOON-920/ }).click();
  await expect(page.getByRole('img', { name: 'Harbor Moon', exact: true })).toHaveJSProperty('naturalWidth', 640);
  const basket = page.locator('#cart');
  await expect(basket.getByRole('button', { name: /^Check out / })).toBeDisabled();
  await basket.getByRole('button', { name: 'Use selected boat and recalculate' }).click();
  await expect(basket).toContainText('920 cm');
  await expect(basket).toContainText('€121.00');
  await expect(basket.getByRole('button', { name: /^Check out / })).toBeEnabled();
  await basket.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('spinbutton', { name: /Length/ })).toHaveValue('920');
  await page.getByRole('dialog').getByRole('button', { name: 'Calculate price', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 900 });
  await page.getByRole('button', { name: /^Cart/ }).click();
  await expect(basket).toContainText('Harbor Moon');
  await expect.poll(() => page.locator('main').evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath('pos-mobile-repriced-basket.png') });
});

test('POS accepts a reviewed boat service, saves a quotation, recovers checkout and opens receipt actions', async ({ page }, testInfo) => {
  await posCheckoutFixture(page);
  const attempts: Record<string, unknown>[] = [];
  let paymentStatus = 'pending';
  const invoice = 'pos-fixture-invoice';
  const checkoutUrl = 'https://www.mollie.com/checkout/fixture';
  await page.route('**/api/v1/kassa/quotations', route => {
    expect(route.request().postDataJSON()).toMatchObject({ customer_id: 'customer-1', expected_total_cents: 16335,
      items: [{ metadata: { line_note: 'Dockside access' } }] });
    return route.fulfill({ status: 201, json: { id: 'pos-fixture-quotation', reference: 'OFF-POS-001' } });
  });
  await page.route('**/api/v1/kassa/checkout', route => {
    attempts.push(route.request().postDataJSON());
    if (attempts.length === 1) return route.fulfill({ status: 503, json: { message: 'Payment setup unconfirmed' } });
    return route.fulfill({ status: 201, json: { invoice_id: invoice, invoice_number: 'INV-POS-001', total_amount_cents: 16335,
      payment_status: 'open', pending_payments: [{ id: 'payment-1', method: 'creditcard', checkout_url: checkoutUrl, amount_cents: 16335 }] } });
  });
  await page.route(`**/api/v1/kassa/sales/${invoice}**`, route => {
    if (new URL(route.request().url()).searchParams.get('verify')) paymentStatus = 'paid';
    return route.fulfill({ json: { invoice_id: invoice, status: paymentStatus === 'paid' ? 'paid' : 'open',
      payment_status: paymentStatus === 'paid' ? 'paid' : 'open', payments: [{ id: 'payment-1', provider: 'mollie',
        method: 'creditcard', status: paymentStatus, amount: 16335, checkout_url: checkoutUrl }] } });
  });
  await page.route(`**/api/v1/invoices/${invoice}/pdf`, route => route.fulfill({ json: { status: 'ready', signed_url: '/receipt-fixture.pdf' } }));
  await page.route(`**/api/v1/invoices/${invoice}/email`, route => route.fulfill({ json: { queued: true } }));

  await addPricedPosService(page);
  await page.locator('#cart').getByText('Line note', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Line note' }).fill('Dockside access');
  await page.getByRole('textbox', { name: 'Line note' }).blur();
  await page.locator('#cart').getByRole('button', { name: 'Add note', exact: true }).click();
  await page.getByRole('dialog').getByRole('textbox').fill('Collect from dock reception');
  await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('pos-canonical-basket.png') });
  await page.locator('#cart').getByRole('button', { name: 'Clear cart', exact: true }).press('F8');
  await expect(page.getByRole('dialog')).toContainText('Remove every item');
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.locator('#cart').getByRole('button', { name: /^Check out / }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Card terminal', exact: true })).toHaveCount(0);
  await page.getByRole('dialog').getByRole('button', { name: 'Save quotation', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('OFF-POS-001');
  await expect(page.getByRole('link', { name: 'Open quotation' })).toHaveAttribute('href', '/en/admin/facturen/pos-fixture-quotation');
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).last().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Credit card', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Checkout', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(text('en', 'adminNew.kassa.confirmCheckoutTitle'));
  await page.getByRole('dialog').getByRole('button', { name: 'Checkout', exact: true }).click();
  await expect.poll(() => attempts.length).toBe(1);
  expect(attempts[0]).toMatchObject({ expected_total_cents: 16335, payment_method: 'creditcard', idempotency_key: expect.any(String), sale_note: 'Collect from dock reception',
    items: [{ metadata: { boat_id: 'boat-pos', length_cm: 1135, line_note: 'Dockside access' } }] });
  await page.reload();
  await page.locator('#cart').getByRole('button', { name: 'Check sale status again' }).click();
  await expect.poll(() => attempts.length).toBe(2);
  expect(attempts[1]).toEqual(attempts[0]);
  await expect(page.getByRole('dialog')).toContainText('Payment pending');
  // Recover a tab that closed after saving the sale but before clearing its request.
  await page.evaluate(payload => sessionStorage.setItem('kassa.checkout.review-user', JSON.stringify(payload)), attempts[0]);
  await page.reload();
  const receipt = page.getByRole('dialog');
  await expect(receipt).toContainText('INV-POS-001');
  await expect(receipt.getByRole('button', { name: 'New sale' })).toBeDisabled();
  await receipt.getByRole('button', { name: 'Check payment', exact: true }).click();
  await expect(receipt).toContainText('Payment complete');
  await receipt.getByRole('button', { name: 'Print receipt' }).click();
  await expect(receipt.getByRole('link', { name: 'Open printable receipt' })).toHaveAttribute('href', '/receipt-fixture.pdf');
  await receipt.getByRole('button', { name: 'Email receipt' }).click();
  await expect(receipt).toContainText('The email is queued.');
  await expect(receipt.getByRole('link', { name: 'View invoice' })).toHaveAttribute('href', `/en/admin/facturen/${invoice}`);
  await page.screenshot({ path: testInfo.outputPath('pos-settled-receipt.png') });
  await receipt.getByRole('button', { name: 'New sale' }).click();
  await expect(receipt).toHaveCount(0);
  await expect(page.locator('#cart')).toContainText('Add products');
  expect(await page.evaluate(() => sessionStorage.getItem('kassa.checkout.review-user'))).toBeNull();
  expect(attempts).toHaveLength(2);
});

test('POS QR resumes the same session after an uncertain response and a failed poll', async ({ page }) => {
  await posCheckoutFixture(page);
  const attempts: Record<string, unknown>[] = [];
  let polls = 0;
  await page.route('**/api/v1/kassa/qr-sessions', route => {
    const payload = route.request().postDataJSON();
    attempts.push(payload);
    if (attempts.length === 1) return route.fulfill({ status: 503, json: { message: 'QR setup unconfirmed' } });
    return route.fulfill({ status: 201, json: { session_id: payload.session_id, status: 'pending',
      amount_cents: 16335, checkout_url: 'https://www.mollie.com/checkout/qr-fixture' } });
  });
  await page.route('**/api/v1/kassa/qr-sessions/*', route => {
    polls++;
    if (polls === 1) return route.fulfill({ status: 503, json: { message: 'Temporary lookup failure' } });
    return route.fulfill({ json: { session_id: attempts[0].session_id, status: 'paid', amount_cents: 16335,
      invoice_id: 'qr-pos-invoice', invoice_number: 'INV-POS-QR' } });
  });
  await addPricedPosService(page);
  await page.locator('#cart').getByRole('button', { name: /^Check out / }).click();
  await page.getByRole('dialog').getByRole('button', { name: text('en', 'adminNew.kassa.qrPayment'), exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Checkout', exact: true }).click();
  await expect.poll(() => attempts.length).toBe(1);
  await page.reload();
  await page.locator('#cart').getByRole('button', { name: 'View Mollie payment' }).click();
  await expect.poll(() => attempts.length).toBe(2);
  expect(attempts[0]).toEqual(attempts[1]);
  await expect(page.getByRole('dialog')).toContainText(text('en', 'adminNew.kassa.qrPayment'));
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toContainText('INV-POS-QR');
  await expect(page.getByRole('dialog')).toContainText('Payment complete');
  expect(polls).toBeGreaterThanOrEqual(2);
});

for (const locale of ['nl', 'en', 'de', 'fr']) {
  test(`${locale}: manual invoice fields remain inside the viewport at mobile and desktop widths`, async ({ page }, testInfo) => {
    await isolatedSession(page);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/${locale}/admin/facturen/nieuw/handmatig`);
    await expect(page.locator('form')).toBeVisible();
    await expect(page.getByRole('textbox', { name: text(locale, 'adminNew.invoices.lineDescription'), exact: true })).toBeVisible();
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const field of await page.locator('form input').all()) {
        const box = await field.boundingBox();
        if (box) {
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
        }
      }
      await page.screenshot({ path: testInfo.outputPath(`${locale}-${width}.png`), fullPage: true });
    await test.info().attach('layout-evidence', { path: testInfo.outputPath(`${locale}-${width}.png`), contentType: 'image/png' });
    }
    expect(errors).toEqual([]);
  });
}

for (const route of ['kassa', 'kalender', 'audit']) {
  test(`${route}: empty page renders without overflow or JavaScript errors`, async ({ page }, testInfo) => {
    await isolatedSession(page);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/nl/admin/${route}`);
    await expect(page.locator('main h1')).toBeVisible();
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const main = page.locator('main');
      await expect.poll(() => main.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: testInfo.outputPath(`${route}-${width}.png`), fullPage: true });
    await test.info().attach('layout-evidence', { path: testInfo.outputPath(`${route}-${width}.png`), contentType: 'image/png' });
    }
    expect(errors).toEqual([]);
  });
}

test('manual invoice retains entered data when save fails, and submits cents once', async ({ page }) => {
  await isolatedSession(page);
  let submissions = 0;
  let payload: Record<string, any> = {};
  await page.route('**/api/v1/invoices', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    submissions += 1;
    payload = route.request().postDataJSON();
    await route.fulfill({ status: 503, json: { message: 'Simulated invoice service unavailable' } });
  });
  await page.goto('/nl/admin/facturen/nieuw/handmatig');
  await page.getByPlaceholder(text('nl', 'adminNew.invoices.customerSearchHint')).fill('Hans');
  await page.getByRole('button', { name: /Hans Müller/ }).click();
  await page.getByRole('textbox', { name: text('nl', 'adminNew.invoices.lineDescription'), exact: true }).fill('Winterberging');
  await page.getByRole('spinbutton', { name: text('nl', 'adminNew.invoices.quantity'), exact: true }).fill('2');
  await page.getByRole('spinbutton', { name: text('nl', 'adminNew.invoices.unitPriceExVat'), exact: true }).fill('100.50');
  await page.getByRole('button', { name: text('nl', 'adminNew.invoices.saveDraft'), exact: true }).click();
  await expect(page.getByText(/Simulated invoice service unavailable/)).toBeVisible();
  expect(submissions).toBe(1);
  expect(payload.customer_id).toBe('customer-1');
  expect(payload.lines[0]).toMatchObject({ description: 'Winterberging', quantity: 2, unit_price: 10050, vat_rate: 21 });
  await expect(page.getByRole('textbox', { name: text('nl', 'adminNew.invoices.lineDescription'), exact: true })).toHaveValue('Winterberging');
});

test('an admin cannot open the super-admin audit page directly', async ({ page }) => {
  await isolatedSession(page, 'admin');
  await page.goto('/nl/admin/audit');
  await expect(page.getByText(text('nl', 'adminModules.hubs.management.superAdminDenied'), { exact: true })).toBeVisible();
  await expect(page.locator('main')).toHaveCount(0);
});

test('an invoice viewer cannot open the create form through a deep link', async ({ page }) => {
  await isolatedSession(page, 'admin', ['invoice.view']);
  await page.goto('/nl/admin/facturen/nieuw/handmatig');
  await expect(page.getByText(text('nl', 'adminNew.common.permissionDenied'), { exact: true })).toBeVisible();
  await expect(page.locator('form')).toHaveCount(0);
});

test('calendar empty state and provider error with retry render in the browser', async ({ page }) => {
  await isolatedSession(page);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let broken = false;
  await page.route('**/api/v1/admin/calendar', (route) => route.fulfill(broken
    ? { status: 503, json: { message: 'Simulated calendar unavailable' } }
    : { json: { regular_hours: [], exceptions: [], lunch_block: null } }));
  await page.goto('/nl/admin/kalender');
  await expect(page.getByText(text('nl', 'adminNew.calendar.noRegular'), { exact: true })).toBeVisible();
  broken = true;
  await page.reload();
  await expect(page.getByText(/Simulated calendar unavailable/)).toBeVisible();
  await page.getByRole('button', { name: text('nl', 'adminNew.states.retry'), exact: true }).click();
  await expect(page.getByText(/Simulated calendar unavailable/)).toBeVisible();
  broken = false;
  await page.getByRole('button', { name: text('nl', 'adminNew.states.retry'), exact: true }).click();
  await expect(page.getByText(text('nl', 'adminNew.calendar.noRegular'), { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

const LONG = 'Superlange-Winterstalling-Klantnaam-Met-Extra-Segmenten-Voor-Overflow-Controle';
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

async function assertNoPageOverflow(page: Page) {
  await expect.poll(() => page.locator('main').evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
}

async function setSidebar(page: Page, state: 'expanded' | 'collapsed') {
  await page.setViewportSize({ width: 1280, height: 1000 });
  const toggle = page.locator('aside button[aria-expanded]');
  await expect(toggle).toBeVisible();
  if (await toggle.getAttribute('aria-expanded') !== String(state === 'expanded')) await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', String(state === 'expanded'));
}

async function captureWidths(page: Page, testInfo: { outputPath: (name: string) => string }, prefix: string, widths = [390, 1280, 1536]) {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 1000 });
    await assertNoPageOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`${prefix}-${width}.png`), fullPage: true });
    await test.info().attach('layout-evidence', { path: testInfo.outputPath(`${prefix}-${width}.png`), contentType: 'image/png' });
  }
}

for (const sidebar of ['expanded', 'collapsed'] as const) {
test(`populated kassa POS, analytics charts and address grids stay inside the viewport [sidebar ${sidebar}]`, async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await isolatedSession(page);
  const product = {
    id: 'prod-long',
    name: `${LONG} Producttegel`,
    code: 'LONG-PROD-001',
    price_incl_vat: 24200,
    price_excl_vat: 20000,
    active: true,
    is_favorite: true,
  };
  const services = ['Kranen uit het water', 'Romp afspuiten', 'Weekje op wal', 'Winterstalling', 'Zomerstalling', 'Onderhoud']
    .map((name, index) => ({
      ...product, id: 'service-' + index, code: 'SERVICE-' + index, name,
      category: index < 3 ? 'Werfdiensten' : index < 5 ? 'Stalling' : 'Onderhoud',
      price_excl_vat: 0, price_incl_vat: 0, pricing_type: 'length_range',
    }));
  await page.route('**/api/v1/products**', (route) => {
    if (route.request().method() !== 'GET') return route.fulfill({ status: 201, json: {} });
    return route.fulfill({ json: { data: [...services, product], meta: { total: 7, current_page: 1, last_page: 1 } } });
  });
  await page.route('**/api/v1/boats?**', (route) => route.fulfill({
    json: { data: [{ id: 'boat-1', name: 'Bavaria 37', customer_id: 'customer-1',
      length_cm: 1135, width_cm: 380, draft_cm: 190, registration_number: 'BAV-037',
      customer: { id: 'customer-1', name: 'Hans Müller' } }] },
  }));
  await page.route('**/api/v1/kassa/analytics**', (route) => route.fulfill({
    json: {
      totals: { turnover_cents: 1284500, transaction_count: 42, avg_ticket_cents: 30583, refund_count: 2 },
      series: [
        { label: 'ma 27', value_cents: 180000 },
        { label: 'di 28', value_cents: 245000 },
        { label: 'wo 29', value_cents: 312500 },
        { label: 'do 30', value_cents: 278000 },
        { label: 'vr 31', value_cents: 269000 },
      ],
      by_payment_method: [
        { method: `Bancontact-via-Mollie-met-zeer-lange-labelnaam-${LONG}`, count: 18, amount_cents: 720000 },
        { method: 'Contant-kassalade-secundaire-locatie-havenkantoor', count: 11, amount_cents: 312500 },
        { method: 'Creditcard-American-Express-Corporate-Fleet', count: 8, amount_cents: 252000 },
      ],
      period: 'today',
    },
  }));
  await page.route('**/api/v1/kassa/recent-sales**', (route) => route.fulfill({
    json: {
      data: [{
        id: 'sale-1',
        invoice_number: 'FAC-2026-LONG-OVERFLOW-001',
        customer_name: LONG,
        total_amount_cents: 24200,
        created_at: '2026-10-28T10:00:00Z',
      }],
    },
  }));

  await page.route('**/api/v1/kassa/quote', (route) => {
    const items = route.request().postDataJSON().items as Array<{ metadata?: { length_cm?: number } }>;
    if (items[0]?.metadata) expect(items[0].metadata.length_cm).toBe(1135);
    return route.fulfill({
      json: { subtotal_cents: 20000 * items.length, vat_amount_cents: 4200 * items.length, total_cents: 24200 * items.length,
        lines: items.map(() => ({ unit_price: 20000, vat_rate: 21, vat_amount: 4200, line_total: 24200 })) },
    });
  });
  await page.route('**/api/v1/kassa/payment-methods', (route) => route.fulfill({
    json: { pos: ['cash', 'pin', 'invoice'], online: [] },
  }));
  await page.goto('/nl/admin/kassa');
  await setSidebar(page, sidebar);
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.getByText(/Bancontact-via-Mollie/)).toHaveCount(0);
  await page.getByRole('searchbox', { name: text('nl', 'adminNew.kassa.pos.search') }).fill('BAV-037');
  await page.getByRole('button', { name: /Bavaria 37.*BAV-037/ }).click();
  await page.getByRole('button', { name: /Kranen uit het water.*Prijs berekenen/ }).click();
  await expect(page.getByRole('spinbutton', { name: /Lengte/ })).toHaveValue('1135');
  await page.getByRole('dialog').getByRole('button', { name: text('nl', 'adminNew.kassa.pos.calculate'), exact: true }).click();
  await expect(page.locator('#cart')).toContainText(/242,00/);
  await page.locator('main').getByRole('button', { name: new RegExp(product.name) }).first().click();
  await expect(page.locator('#cart')).toContainText(/484,00/);

  for (const width of [390, 1280, 1536]) {
    await page.setViewportSize({ width, height: 1000 });
    await assertNoPageOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`kassa-pos-${width}.png`), fullPage: true });
    await test.info().attach('layout-evidence', { path: testInfo.outputPath(`kassa-pos-${width}.png`), contentType: 'image/png' });
  }
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.getByRole('button', { name: new RegExp(text('nl', 'adminNew.kassa.cart')) }).click();
  await page.getByRole('button', { name: new RegExp(text('nl', 'adminNew.kassa.payNow')) }).click();
  await expect(page.getByRole('dialog')).toContainText(text('nl', 'adminNew.kassa.pos.manualPin'));
  await page.keyboard.press('Escape');
  await page.locator('#cart').getByRole('button', { name: text('nl', 'adminNew.common.close') }).click({ timeout: 8000 });

  await page.getByRole('button', { name: text('nl', 'adminNew.kassa.selectCustomer'), exact: true }).click();
  await page.getByRole('button', { name: text('nl', 'adminNew.kassa.newCustomer'), exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel(text('nl', 'adminNew.common.name'), { exact: false }).first().fill(LONG);
  await dialog.getByLabel(text('nl', 'adminNew.kassa.street'), { exact: true }).fill(`Zeerlange-Havenstraatnaam-Zonder-Spaties-${LONG}`);
  await dialog.getByLabel(text('nl', 'adminNew.kassa.houseNumber'), { exact: true }).fill('123A');
  await dialog.getByLabel(text('nl', 'adminNew.kassa.postalCode'), { exact: true }).fill('1234AB');
  await dialog.getByLabel(text('nl', 'adminNew.kassa.city'), { exact: true }).fill(`Gemeente-naam-met-extra-lange-toevoeging-${LONG}`);
  for (const width of [390, 1280, 1536]) {
    await page.setViewportSize({ width, height: 1000 });
    const box = await dialog.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    for (const field of await dialog.locator('input').all()) {
      const fieldBox = await field.boundingBox();
      if (!fieldBox) continue;
      expect(fieldBox.x).toBeGreaterThanOrEqual(0);
      expect(fieldBox.x + fieldBox.width).toBeLessThanOrEqual(width + 1);
    }
    await page.screenshot({ path: testInfo.outputPath(`kassa-address-grids-${width}.png`), fullPage: true });
    await test.info().attach('layout-evidence', { path: testInfo.outputPath(`kassa-address-grids-${width}.png`), contentType: 'image/png' });
  }
  await page.keyboard.press('Escape');

  await page.goto('/nl/admin/kassa/analytics');
  await setSidebar(page, sidebar);
  await expect(page.getByText(/Bancontact-via-Mollie/)).toBeVisible();
  for (const width of [390, 1280, 1536]) {
    await page.setViewportSize({ width, height: 1000 });
    await assertNoPageOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`kassa-populated-analytics-${width}.png`), fullPage: true });
    await test.info().attach('layout-evidence', { path: testInfo.outputPath(`kassa-populated-analytics-${width}.png`), contentType: 'image/png' });
  }
  expect(errors).toEqual([]);
});

test(`AdminSplitLayout start sidebar (cash close) holds populated history at lg and xl [sidebar ${sidebar}]`, async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await isolatedSession(page);
  await page.route('**/api/v1/kassa/analytics**', (route) => route.fulfill({
    json: {
      payment_methods: [{ method: 'cash', total_cents: 87550, count: 9 }],
    },
  }));
  await page.route('**/api/v1/kassa/cash-closures**', (route) => {
    if (route.request().method() !== 'GET') return route.fulfill({ status: 201, json: { id: 'closure-new' } });
    return route.fulfill({
      json: Array.from({ length: 6 }, (_, i) => ({
        id: `closure-${i}`,
        business_date: `2026-10-${String(20 + i).padStart(2, '0')}`,
        expected_cash_cents: 120000 + i * 1500,
        counted_cash_cents: 119500 + i * 1400,
        difference_cents: -500 - i * 100,
        note: `${LONG} kasverschil-notitie-${i}`,
      })),
    });
  });
  await page.goto('/nl/admin/kassa/dagafsluiting');
  await setSidebar(page, sidebar);
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(6);
  await captureWidths(page, testInfo, 'cash-close-split-start');
  expect(errors).toEqual([]);
});

test(`DocumentZoneEditor loaded zones and drag stay inside the viewport [sidebar ${sidebar}]`, async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await isolatedSession(page);
  await page.route('**/fixture-doc.png', (route) => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: PNG_1X1,
  }));
  await page.route('**/api/v1/invoice-extraction-templates/tpl-populated**', (route) => route.fulfill({
    json: {
      id: 'tpl-populated',
      name: `OCR sjabloon ${LONG}`,
      vendor_name: `Leverancier ${LONG}`,
      document_type: 'purchase_invoice',
      field_zones: [
        { field: 'invoice_number', x: 0.08, y: 0.1, w: 0.35, h: 0.08 },
        { field: 'supplier_name', x: 0.08, y: 0.22, w: 0.5, h: 0.1 },
        { field: 'total', x: 0.55, y: 0.75, w: 0.35, h: 0.08 },
      ],
    },
  }));
  await page.route('**/api/v1/invoice-imports/imp-populated/source-pdf**', (route) => route.fulfill({
    json: {
      filename: 'populated-invoice.png',
      mime_type: 'image/png',
      signed_url: `${test.info().project.use.baseURL}/fixture-doc.png`,
    },
  }));
  await page.route('**/api/v1/invoice-extraction-templates/tpl-populated/metrics**', (route) => route.fulfill({
    json: { used_count: 12, success_rate: 0.91, average_confidence: 0.88 },
  }));

  await page.goto('/nl/admin/facturen/templates/editor?id=tpl-populated&importId=imp-populated&mode=extraction');
  await setSidebar(page, sidebar);
  await expect(page.locator('main')).toContainText(text('nl', 'adminNew.templates.zonesTitle'));
  await expect(page.locator('main')).toContainText(/3/);
  const surface = page.locator('.touch-none').first();
  await expect(surface).toBeVisible();
  const box = await surface.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box!.x + box!.width * 0.2, box!.y + box!.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * 0.45, box!.y + box!.height * 0.35);
  await page.mouse.up();
  await captureWidths(page, testInfo, 'document-zone-editor');
  expect(errors).toEqual([]);
});

test(`audit detail modal wraps long before/after values without page overflow [sidebar ${sidebar}]`, async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await isolatedSession(page);
  const before = `{"email":"oud-${LONG}@example.test","notes":"${LONG.repeat(3)}","iban":"NL91ABNA0417164300-EXTRA-LANG-SEGMENT"}`;
  const after = `{"email":"nieuw-${LONG}@example.test","notes":"${LONG.repeat(3)}-bijgewerkt","iban":"NL20INGB0001234567-EXTRA-LANG-SEGMENT"}`;
  await page.route('**/api/v1/admin/audit-logs**', (route) => route.fulfill({
    json: {
      data: [{
        id: 'audit-long-1',
        action: 'customer.updated',
        title: `Klant bijgewerkt ${LONG}`,
        entity_type: 'customer',
        entity_name: LONG,
        entity_id: 'cust-1',
        category: 'customers',
        severity: 'info',
        created_at: '2026-10-28T12:00:00Z',
        user: { name: `Medewerker ${LONG}` },
        changes: [
          { field_name: 'email_address_with_unusually_long_field_key', old_value: before, new_value: after },
          { field_name: 'internal_crm_synchronisation_payload', old_value: before.repeat(2), new_value: after.repeat(2) },
        ],
        can_view_details: true,
      }],
      meta: { total: 1, current_page: 1, last_page: 1, per_page: 20 },
      counters: { total: 1 },
    },
  }));

  await page.goto('/nl/admin/audit');
  await setSidebar(page, sidebar);
  await expect(page.locator('main h1')).toBeVisible();
  await page.getByRole('button', { name: `Klant bijgewerkt ${LONG}`, exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(before.slice(0, 40));
  await expect(dialog).toContainText(after.slice(0, 40));
  for (const width of [390, 1280, 1536]) {
    await page.setViewportSize({ width, height: 1000 });
    const box = await dialog.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`audit-diff-modal-${width}.png`), fullPage: true });
    await test.info().attach('layout-evidence', { path: testInfo.outputPath(`audit-diff-modal-${width}.png`), contentType: 'image/png' });
  }
  expect(errors).toEqual([]);
});

}

for (const locale of ['nl', 'en', 'de', 'fr']) {
  test(locale + ': audit loading empty error recovery and technical dialog copy', async ({ page }, info) => {
    await isolatedSession(page);
    let phase = 'empty';
    let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    let waiting = true;
    await page.route('**/api/v1/admin/audit-logs**', async route => {
      if (waiting) await held;
      if (phase === 'error') return route.fulfill({ status: 503, json: { message: 'Audit service unavailable' } });
      return route.fulfill({ json: {
        data: phase === 'populated' ? [{ id:'locale-audit', action:'customer.updated', title:'Locale audit record', entity_type:'customer', entity_name:LONG, severity:'info', created_at:'2026-10-28T12:00:00Z', can_view_details:true, request_id:LONG, changes:[{field_name:'email',old_value:'old@example.test',new_value:'new@example.test'}] }] : [],
        meta:{total:phase === 'populated' ? 1 : 0,current_page:1,last_page:1,per_page:20}, counters:{total:1}
      } });
    });
    await page.goto('/' + locale + '/admin/audit');
    await expect(page.getByText(text(locale,'adminNew.audit.loading'), {exact:true})).toBeVisible();
    waiting = false; release();
    await expect(page.getByText(text(locale,'adminNew.audit.empty'), {exact:true})).toBeVisible();
    phase = 'error'; await page.reload();
    await expect(page.locator('main')).toContainText('Audit service unavailable');
    phase = 'populated';
    await page.locator('main .overflow-x-auto').filter({hasText:'Audit service unavailable'}).getByRole('button',{name:text(locale,'adminNew.states.retry'),exact:true}).click();
    await page.getByRole('button',{name:'Locale audit record',exact:true}).click();
    const dialog=page.getByRole('dialog');
    await dialog.getByRole('button',{name:text(locale,'adminNew.audit.technicalDetails'),exact:true}).click();
    for(const key of ['event','id','entityId','requestId','correlationId','ip','endpoint','method','browser']) {
      await expect(dialog.locator('dt').filter({hasText:new RegExp('^'+text(locale,'adminNew.audit.technical.'+key)+'$')})).toHaveCount(1);
    }
    await captureWidths(page, info, locale+'-audit-technical');
    expect((await dialog.innerText()).match(/\b(?:adminNew|adminModules)\.[A-Za-z][\w.]+/g) ?? []).toEqual([]);
  });
}
