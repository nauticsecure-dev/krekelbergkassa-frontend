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
