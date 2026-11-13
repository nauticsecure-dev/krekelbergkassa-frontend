import { expect, test, type Page, type APIRequestContext } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { frenchCreateLabels } from '../../src/i18n/phase1-overlays';

test.skip(process.env.GLOBAL_UX_LIVE !== '1', 'Requires the isolated real Laravel/Next runner.');
const records = process.env.GLOBAL_UX_LIVE === '1'
  ? JSON.parse(fs.readFileSync(process.env.E2E_GLOBAL_FIXTURES!, 'utf8'))
  : {};
const dictionaries = Object.fromEntries(['nl', 'en', 'de', 'fr'].map(locale => [locale, JSON.parse(fs.readFileSync('src/i18n/messages/' + locale + '.json', 'utf8'))]));
Object.assign(dictionaries.fr.adminModules.create, frenchCreateLabels);
const label = (locale: string, key: string): string => key.split('.').reduce((value, key) => value[key], dictionaries[locale]);
const tokens: Record<string, string> = {};
const backend = path.resolve('../krekelbergkassa-backend');
async function token(request: APIRequestContext, role = 'admin') {
  if (!tokens[role]) {
    const response = await request.post('/api/v1/auth/login', { data: { email: role + '@global-ux.example.test', password: process.env.E2E_GLOBAL_PASSWORD, device_name: 'Global UX live verification' } });
    expect(response.ok(), await response.text()).toBe(true);
    tokens[role] = (await response.json()).token;
    expect(tokens[role]).toBeTruthy();
  }
  return tokens[role];
}
async function session(page: Page, request: APIRequestContext, role = 'admin') {
  const value = await token(request, role);
  await page.context().addCookies([{ name: 'krek_session', value: encodeURIComponent(value), url: String(test.info().project.use.baseURL) }]);
  // Application requests always reach Laravel. Only unrelated external origins are blocked.
  await page.route('**/*', route => new URL(route.request().url()).origin === test.info().project.use.baseURL ? route.continue() : route.abort());
  return { Authorization: 'Bearer ' + value, Accept: 'application/json' };
}
function unwrap(body: any) { return body.data ?? body; }
function php(code: string) {
  const boot = 'require "vendor/autoload.php"; $app=require "bootstrap/app.php"; $app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap(); ';
  return JSON.parse(execFileSync(process.env.E2E_PHP_BIN!, ['-d', 'xdebug.mode=off', '-r', boot + code], { cwd: backend, encoding: 'utf8' }));
}

test('real password login resolves the administrator role', async ({ page }) => {
  await page.goto('/en/login?role=manager');
  await page.locator('#email').fill('admin@global-ux.example.test');
  await page.locator('#password').fill(process.env.E2E_GLOBAL_PASSWORD!);
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/en\/admin\/?$/);
  await expect(page.locator('main h1')).toHaveText(label('en', 'adminNew.dashboard.heroTitle'));
});

const creation = [
  ['customer', '/admin/klanten?new=1', 'modal'], ['boat', '/admin/boten?new=1', 'modal'],
  ['appointment', '/admin/afspraken?create=1', 'modal'], ['stalling', '/admin/stalling?new=1', 'modal'],
  ['invoice', '/admin/facturen?create=1', 'invoice'], ['supplier', '/admin/leveranciers?new=1', 'modal'],
  ['service', '/admin/producten/nieuw', 'page'], ['brokerage', '/admin/verkopen', 'page'],
] as const;
for (const locale of ['nl', 'en', 'de', 'fr']) {
  test(locale + ': global creation links reach the real authorized destination', async ({ page, request }) => {
    test.setTimeout(480_000);
    await session(page, request);
    for (const [key, route, kind] of creation) {
      await page.goto('/' + locale + '/admin');
      await expect(page.locator('main h1')).toBeVisible();
      await page.locator('button[aria-haspopup="menu"]').first().click();
      const entry = page.getByRole('menuitem', { name: label(locale, 'adminModules.create.' + key), exact: true });
      await expect(entry).toHaveAttribute('href', '/' + locale + route);
      await entry.click();
      await expect(page).toHaveURL(new RegExp('/' + locale + route.split('?')[0]));
      if (kind === 'modal') await expect(page.getByRole('dialog')).toBeVisible();
      if (kind === 'invoice') {
        await expect(page).toHaveURL(new RegExp('/' + locale + '/admin/facturen/nieuw$'));
        await expect(page.locator('main a[href="/' + locale + '/admin/facturen/nieuw/handmatig"]')).toBeVisible();
      }
      await expect(page.locator('body')).not.toContainText('Application error:');
    }
  });
}

test('customer creation persists and the generated readable link opens the created record', async ({ page, request }, info) => {
  const headers = await session(page, request);
  await page.goto('/en/admin/klanten?new=1');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox', { name: label('en', 'adminNew.common.name'), exact: true }).fill('Created Through Live Browser');
  await dialog.getByRole('textbox', { name: label('en', 'adminNew.common.email'), exact: true }).fill('created@global-ux.example.test');
  const saved = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/customers' && response.request().method() === 'POST');
  await dialog.getByRole('button', { name: label('en', 'adminNew.common.save'), exact: true }).click();
  const response = await saved;
  expect(response.ok(), await response.text()).toBe(true);
  const customer = unwrap(await response.json());
  await expect(dialog).toHaveCount(0);
  await page.reload();
  const row = page.locator('tbody tr').filter({ hasText: 'Created Through Live Browser' });
  const href = '/en/admin/klanten/' + customer.public_id + '/' + customer.slug;
  await expect(row.locator('a[href="' + href + '"]')).toBeVisible();
  await row.locator('a[href="' + href + '"]').click();
  await expect(page).toHaveURL(href);
  await expect(page.locator('main')).toContainText('Created Through Live Browser');
  const fetched = await request.get('/api/v1/customers/' + customer.public_id, { headers });
  expect(unwrap(await fetched.json()).id).toBe(customer.id);
  const stored = php('echo json_encode(App\\Models\\Customer::where("email", "created@global-ux.example.test")->firstOrFail(["id", "name", "email"]));');
  expect(stored).toMatchObject({ id: customer.id, name: 'Created Through Live Browser', email: 'created@global-ux.example.test' });
  await info.attach('database-persistence', { body: JSON.stringify({ engine: 'isolated SQLite file', browserReload: true, apiReadback: true, databaseReadback: true, customerId: stored.id }), contentType: 'application/json' });
});

test('supplier mapping enforces write permission and persists SKU and keyword after reload', async ({ page, browser, request }, info) => {
  const supplier = records.leveranciers;
  const product = records.producten;
  const endpoint = '/api/v1/suppliers/' + supplier.id + '/mappings';
  const detail = '/admin/leveranciers/' + supplier.public_id + '/' + supplier.slug;
  const sku = 'LIVE-MAPPING-SKU';
  const keyword = 'Live supplier line item';
  const reader = await browser.newPage({ baseURL: String(info.project.use.baseURL) });
  try {
    const headers = await session(reader, request, 'reader');
    await reader.goto('/en' + detail);
    await expect(reader.locator('main h1')).toHaveText(supplier.name);
    await expect(reader.getByText('No mappings', { exact: true })).toBeVisible();
    await expect(reader.getByRole('button', { name: 'Add mapping', exact: true })).toHaveCount(0);
    await expect(reader.getByRole('dialog')).toHaveCount(0);
    const denied = await request.post(endpoint, { headers, data: { product_id: product.id, supplier_sku: sku, keyword } });
    expect(denied.status()).toBe(403);
    expect(await (await request.get(endpoint, { headers })).json()).toEqual([]);
  } finally {
    await reader.close();
  }

  const headers = await session(page, request);
  const postMapping = (response: import('@playwright/test').Response) =>
    new URL(response.url()).pathname.endsWith('/mappings') && response.request().method() === 'POST';
  for (const [locale, add, empty, required] of [
    ['nl', 'Koppeling toevoegen', 'Geen koppelingen', 'Kies een optie.'],
    ['de', 'Zuordnung hinzufügen', 'Keine Zuordnungen', 'Wählen Sie eine Option.'],
    ['fr', 'Ajouter une correspondance', 'Aucune correspondance', 'Choisissez une option.'],
    ['en', 'Add mapping', 'No mappings', 'Choose an option.'],
  ]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/' + locale + detail);
    await expect(page.locator('main h1')).toHaveText(supplier.name);
    await expect(page.getByText(empty, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: add, exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: add, exact: true })).toBeVisible();
    const skuField = dialog.getByRole('textbox', { name: label(locale, 'adminNew.suppliers.mapColumns.sku'), exact: true });
    await skuField.fill(sku);
    await dialog.getByRole('button', { name: label(locale, 'adminNew.common.save'), exact: true }).click();
    await expect(dialog.getByText(required, { exact: true })).toBeVisible();
    await expect(skuField).toHaveValue(sku);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }

  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Supplier description', exact: true }).fill(keyword);
  await dialog.getByRole('button', { name: 'Product', exact: true }).click();
  await page.getByRole('option', { name: product.name, exact: true }).click();
  const saved = page.waitForResponse(postMapping);
  await dialog.getByRole('button', { name: label('en', 'adminNew.common.save'), exact: true }).click();
  const response = await saved;
  expect(response.status(), await response.text()).toBe(201);
  const mapping = await response.json();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  const row = page.getByRole('row').filter({ hasText: sku });
  await expect(row).toContainText(keyword);
  await expect(row).toContainText(product.name);
  for (const width of [390, 1280, 1536]) {
    await page.setViewportSize({ width, height: 900 });
    if (width > 390) {
      await page.getByRole('button', { name: label('en', 'adminNew.shell.collapseSidebar'), exact: true }).click();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.getByRole('button', { name: label('en', 'adminNew.shell.expandSidebar'), exact: true }).click();
    }
    await expect(row).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  const fetched = await request.get(endpoint, { headers });
  expect(fetched.ok(), await fetched.text()).toBe(true);
  expect(await fetched.json()).toEqual([expect.objectContaining({ id: mapping.id, supplier_sku: sku, keyword, product_id: product.id })]);
  const stored = php('echo json_encode(App\\Models\\SupplierProductMapping::where("supplier_sku", "LIVE-MAPPING-SKU")->firstOrFail());');
  expect(stored).toMatchObject({ id: mapping.id, supplier_id: supplier.id, product_id: product.id, supplier_sku: sku, keyword });
  await info.attach('database-persistence', { body: JSON.stringify({ engine: 'isolated SQLite file', browserReload: true, apiReadback: true, databaseReadback: true, mappingId: stored.id }), contentType: 'application/json' });
});

test('all five readable routes and legacy UUIDs resolve against the actual API', async ({ page, request }) => {
  const headers = await session(page, request);
  const routes: Record<string, string> = { producten: 'products', klanten: 'customers', boten: 'boats', stalling: 'stalling', leveranciers: 'suppliers' };
  for (const [section, record] of Object.entries(records) as [string, any][]) {
    for (const id of [record.id, record.public_id]) {
      const response = await request.get('/api/v1/' + routes[section] + '/' + id, { headers });
      expect(response.ok(), await response.text()).toBe(true);
      expect(unwrap(await response.json()).id).toBe(record.id);
    }
    const href = '/de/admin/' + section + '/' + record.public_id + '/' + record.slug;
    await page.goto(href);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('main')).toContainText(record.name || record.contract_number);
    await expect(page).toHaveURL(href);
    await expect(page.locator('body')).not.toContainText('Application error:');
  }
});

test('language switching preserves the readable path, query parameters and hash', async ({ page, request }) => {
  await session(page, request);
  const record = records.boten;
  const suffix = '/admin/boten/' + record.public_id + '/' + record.slug + '?tab=storage&from=live#evidence';
  await page.goto('/en' + suffix);
  await expect(page.locator('main h1')).toBeVisible();
  await page.locator('button[aria-haspopup="listbox"]').filter({ hasText: /^en$/i }).first().click();
  await page.getByRole('option').filter({ hasText: 'Français' }).click();
  await expect(page).toHaveURL('/fr' + suffix);
});

test('shortcut edits, ordering, role filters and intentionally empty configuration persist in the database', async ({ page, request }) => {
  const headers = await session(page, request);
  await page.goto('/en/admin/beheer/dashboard-shortcuts');
  const row = (key: string) => page.locator('form').filter({ has: page.locator('input[value="' + key + '"]') });
  await expect(row('live-kassa')).toBeVisible();
  await row('live-kassa').getByLabel(label('en', 'adminNew.shortcuts.label') + ' (en)', { exact: true }).fill('Live register');
  let saved = page.waitForResponse(response => response.url().includes('/dashboard-shortcuts/') && response.request().method() === 'PATCH');
  await row('live-kassa').getByRole('button', { name: label('en', 'adminNew.shortcuts.save'), exact: true }).click();
  expect((await saved).ok()).toBe(true);
  await row('live-invoices').getByRole('checkbox', { name: 'finance', exact: true }).check();
  saved = page.waitForResponse(response => response.url().includes('/dashboard-shortcuts/') && response.request().method() === 'PATCH');
  await row('live-invoices').getByRole('button', { name: label('en', 'adminNew.shortcuts.save'), exact: true }).click();
  expect((await saved).ok()).toBe(true);
  const moved = page.waitForResponse(response => response.url().endsWith('/dashboard-shortcuts/reorder'));
  await row('live-invoices').getByRole('button', { name: label('en', 'adminNew.shortcuts.moveUp'), exact: true }).click();
  expect((await moved).ok()).toBe(true);
  await page.reload();
  await expect(page.locator('form').first().getByLabel(label('en', 'adminNew.shortcuts.key'), { exact: true })).toHaveValue('live-invoices');
  await expect(row('live-kassa').getByLabel(label('en', 'adminNew.shortcuts.label') + ' (en)', { exact: true })).toHaveValue('Live register');
  const stored = php('echo json_encode(App\\Models\\DashboardShortcut::orderBy("sort_order")->get(["key","labels","role_names"]));');
  expect(stored[0]).toMatchObject({ key: 'live-invoices', role_names: ['finance'] });
  expect(stored[1].labels.en).toBe('Live register');
  for (const [role, expected] of [['employee', ['live-kassa']], ['finance', ['live-invoices']]] as const) {
    const response = await request.get('/api/v1/dashboard-shortcuts', { headers: { Authorization: 'Bearer ' + await token(request, role) } });
    expect(response.ok()).toBe(true);
    expect((await response.json()).data.map((row: any) => row.key)).toEqual(expected);
  }
  const manage = await request.get('/api/v1/dashboard-shortcuts/manage', { headers });
  for (const shortcut of (await manage.json()).data) {
    expect((await request.delete('/api/v1/dashboard-shortcuts/' + shortcut.id, { headers })).ok()).toBe(true);
  }
  for (let reload = 0; reload < 2; reload++) {
    await page.goto('/en/admin');
    await expect(page.getByRole('link', { name: 'Live register', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Follow up stalling', exact: true })).toHaveCount(0);
    expect((await (await request.get('/api/v1/dashboard-shortcuts', { headers })).json()).data).toEqual([]);
  }
  expect(php('echo json_encode(App\\Models\\DashboardShortcut::count());')).toBe(0);
});

test('real employee, finance, read-only and technical-admin sessions enforce UI and API access', async ({ browser, request }) => {
  for (const role of ['employee', 'finance', 'reader', 'super_admin']) {
    const context = await browser.newContext({ baseURL: String(test.info().project.use.baseURL) });
    const page = await context.newPage();
    try {
      const headers = await session(page, request, role);
      const me = await request.get('/api/v1/auth/me', { headers });
      expect(me.ok()).toBe(true);
      expect(unwrap((await me.json()).user ?? await me.json()).role).toBe(role === 'reader' ? 'employee' : role);
      const manage = await request.get('/api/v1/dashboard-shortcuts/manage', { headers });
      expect(manage.status()).toBe(role === 'super_admin' ? 200 : 403);
      const technical = await request.get('/api/v1/admin/api-credentials', { headers });
      expect(technical.status()).toBe(role === 'super_admin' ? 200 : 403);
      if (role === 'super_admin') {
        await page.goto('/en/admin/systeem');
        await expect(page.locator('main h1')).toBeVisible();
      } else {
        const denied = await request.post('/api/v1/products', { headers, data: { code: 'FORBIDDEN', name: 'Forbidden' } });
        expect(denied.status()).toBe(403);
        await page.goto('/en/admin/producten/nieuw');
        await expect(page).toHaveURL(/\/en\/admin$/);
      }
      if (role === 'reader') {
        expect((await request.post('/api/v1/customers', { headers, data: { name: 'Forbidden reader customer' } })).status()).toBe(403);
        await page.goto('/en/admin/klanten?new=1');
        await expect(page.locator('main h1')).toBeVisible();
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await page.locator('button[aria-haspopup="menu"]').first().click();
        await expect(page.getByRole('menuitem')).toHaveCount(0);
        expect((await request.post('/api/v1/invoices', { headers, data: {} })).status()).toBe(403);
        await page.goto('/en/admin/facturen/nieuw');
        await expect(page).toHaveURL(/\/en\/admin$/);
      }
      if (role === 'finance') {
        await page.goto('/en/admin/kassa');
        await expect(page).toHaveURL(/\/en\/admin$/);
        expect((await request.get('/api/v1/kassa/recent-sales', { headers })).status()).toBe(403);
      }
      if (role === 'employee') {
        await page.goto('/en/admin/calculator/pricing');
        await expect(page.locator('main h1')).toBeVisible();
        await expect(page.locator('main').getByRole('button', { name: label('en', 'adminNew.common.new'), exact: true })).toBeVisible();
      }
    } finally { await context.close(); }
  }
});
