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

async function captureWidths(page: Page, testInfo: { outputPath: (name: string) => string }, prefix: string, widths = [390, 1280, 1536]) {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 1000 });
    await assertNoPageOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`${prefix}-${width}.png`), fullPage: true });
  }
}

test('populated kassa POS, analytics charts and address grids stay inside the viewport', async ({ page }, testInfo) => {
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
  await page.route('**/api/v1/products**', (route) => {
    if (route.request().method() !== 'GET') return route.fulfill({ status: 201, json: {} });
    return route.fulfill({ json: { data: [product], meta: { total: 1, current_page: 1, last_page: 1, per_page: 200 } } });
  });
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

  await page.goto('/nl/admin/kassa');
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.getByText(text('nl', 'adminNew.kassa.analytics.title'), { exact: true })).toBeVisible();
  await expect(page.getByText(/Bancontact-via-Mollie/)).toBeVisible();

  await page.locator('main').getByRole('button', { name: new RegExp(product.name) }).first().click();
  await expect(page.getByRole('button', { name: new RegExp(text('nl', 'adminNew.kassa.payNow')) })).toBeVisible();
  await page.getByLabel(text('nl', 'adminNew.kassa.adjustTotal')).check();
  await page.getByLabel(text('nl', 'adminNew.kassa.adjustReason')).fill(`Loyaliteitskorting voor ${LONG} met uitgebreide toelichting`);

  await page.setViewportSize({ width: 390, height: 1000 });
  await assertNoPageOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('kassa-populated-pos-390.png'), fullPage: true });

  await page.getByRole('button', { name: text('nl', 'adminNew.kassa.newCustomer'), exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel(text('nl', 'adminNew.common.name'), { exact: false }).first().fill(LONG);
  await dialog.getByLabel(text('nl', 'adminNew.kassa.street'), { exact: true }).fill(`Zeerlange-Havenstraatnaam-Zonder-Spaties-${LONG}`);
  await dialog.getByLabel(text('nl', 'adminNew.kassa.houseNumber'), { exact: true }).fill('123A');
  await dialog.getByLabel(text('nl', 'adminNew.kassa.postalCode'), { exact: true }).fill('1234AB');
  await dialog.getByLabel(text('nl', 'adminNew.kassa.city'), { exact: true }).fill(`Gemeente-naam-met-extra-lange-toevoeging-${LONG}`);
  for (const width of [390, 1280]) {
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
  }
  await page.keyboard.press('Escape');

  for (const width of [1280, 1536]) {
    await page.setViewportSize({ width, height: 1000 });
    await assertNoPageOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`kassa-populated-analytics-${width}.png`), fullPage: true });
  }
  expect(errors).toEqual([]);
});

test('AdminSplitLayout start sidebar (cash close) holds populated history at lg and xl', async ({ page }, testInfo) => {
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
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(6);
  await captureWidths(page, testInfo, 'cash-close-split-start');
  expect(errors).toEqual([]);
});

test('DocumentZoneEditor loaded zones and drag stay inside the viewport', async ({ page }, testInfo) => {
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

test('audit detail modal wraps long before/after values without page overflow', async ({ page }, testInfo) => {
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
  }
  expect(errors).toEqual([]);
});
