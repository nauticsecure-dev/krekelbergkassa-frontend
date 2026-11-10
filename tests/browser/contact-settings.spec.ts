import { expect, test, type Page } from '@playwright/test';
import nl from '../../src/i18n/messages/nl.json';

async function fixture(page: Page, authenticated = true) {
  const origin = new URL(test.info().project.use.baseURL!).origin;
  const company = { name: 'Yard', email: 'roermond@schepenkring.nl', phone: '+31 (0)475 31 56 61' as string | null,
    address: { street: 'Hertenerweg 2', postal_code: '6049AA', city: 'Herten', country: 'NL' } };
  const writes: unknown[] = [];
  if (authenticated) await page.context().addCookies([{ name: 'krek_session', value: 'contact-editor', url: origin }]);
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ status: authenticated ? 200 : 401, json: authenticated
      ? { id: 'editor', name: 'Editor', role: 'super_admin', email: 'editor@example.test', permissions: ['cms.manage'] }
      : { message: 'Unauthenticated' } });
    if (url.pathname.endsWith('/contact-settings')) {
      expect(route.request().method()).toBe('PATCH');
      const payload = route.request().postDataJSON();
      writes.push(payload); Object.assign(company, payload);
      return route.fulfill({ json: { company } });
    }
    if (url.pathname.endsWith('/content/contact')) return route.fulfill({ json: { company, show_chat: false } });
    if (url.pathname.endsWith('/content/faq')) return route.fulfill({ json: { faq: { questions: [] }, contact: { company, show_chat: false } } });
    return route.fulfill({ json: { content_blocks: [], media_blocks: [], settings: {}, items: [], data: [] } });
  });
  return { company, writes };
}

test('Quality Center regression: save contact values, refresh and link consistently across pages', async ({ page }) => {
  const state = await fixture(page);
  await page.goto('/nl/contact');
  await expect(page.locator('[data-contact-value=email]').first()).toHaveText('roermond@schepenkring.nl');
  await expect(page.getByRole('link', { name: 'Mail ons', exact: true }).first()).toHaveAttribute('href', 'mailto:roermond@schepenkring.nl');
  const edit = async (field: string, values: Record<string, string>) => {
    await page.getByRole('button', { name: nl.cms.enterEdit, exact: true }).click();
    await page.locator(`[data-contact-value=${field}]`).first().getByRole('button').click();
    const dialog = page.getByRole('dialog');
    for (const [label, value] of Object.entries(values)) await dialog.getByLabel(label, { exact: true }).fill(value);
    await dialog.getByRole('button', { name: nl.cms.save, exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('a [data-contact-value] button')).toHaveCount(0);
    for (const value of Object.values(values)) {
      await expect(page.locator(`[data-contact-value=${field}]`).first()).toContainText(value);
    }
    await page.getByRole('button', { name: nl.cms.exitEdit, exact: true }).click();
  };
  await edit('email', { 'E-mailadres': 'changed@example.test' });
  await expect(page.locator('a[href="mailto:changed@example.test"]')).toHaveCount(3);
  await edit('phone', { 'Telefoonnummer': '+31 (0)475 99 88 77' });
  await expect(page.locator('a[href="tel:+31475998877"]')).toHaveCount(3);
  await edit('address', { 'Straat en huisnummer': 'Nieuweweg 42A', 'Postcode': '1234 AB', 'Plaats': 'Roermond' });
  await expect(page.locator('iframe')).toHaveAttribute('src', /Nieuweweg%2042A/);
  expect(state.writes).toHaveLength(3);
  expect(state.company.email).toBe('changed@example.test');
  await page.reload();
  await expect(page.locator('[data-contact-value=email]').first()).toHaveText('changed@example.test');
  await expect(page.locator('[data-contact-value=phone]').first()).toHaveText('+31 (0)475 99 88 77');
  await expect(page.locator('[data-contact-value=address]').first()).toHaveText('Nieuweweg 42A, 1234 AB, Roermond');
  await page.screenshot({ path: test.info().outputPath('contact-values.png'), fullPage: true });
  for (const path of ['/en/over-ons', '/de/faq', '/fr', '/nl/diensten']) {
    await page.goto(path);
    await expect(page.locator('footer a[href="mailto:changed@example.test"]')).toHaveText('changed@example.test');
    await expect(page.locator('footer a[href="tel:+31475998877"]')).toHaveText('+31 (0)475 99 88 77');
    await expect(page.locator('footer [data-contact-value=address]')).toHaveText('Nieuweweg 42A, 1234 AB, Roermond');
    for (const field of ['address', 'phone', 'email']) {
      await expect(page.locator(`footer [data-cms-key="company.${field}"]`)).toHaveAttribute('translate', 'no');
    }
    await expect(page.getByText('info@krekelberg-nautic.nl', { exact: true })).toHaveCount(0);
    await expect(page.getByText('marketing@answer24.nl', { exact: true })).toHaveCount(0);
    await expect(page.locator('main [data-contact-value=phone]').first()).toHaveText('+31 (0)475 99 88 77');
    if (path.endsWith('/faq') || path.endsWith('/over-ons')) {
      await expect(page.locator('main a[href="mailto:changed@example.test"]').first()).toHaveText('changed@example.test');
    }
  }
});

test('failed contact saves keep the draft open and leave shared values unchanged', async ({ page }) => {
  const state = await fixture(page);
  await page.route('**/contact-settings', route => route.fulfill({
    status: 422, json: { message: 'Contact settings could not be saved.' },
  }));
  await page.goto('/nl/contact');
  await expect(page.locator('[data-contact-value=email]').first()).toHaveText(state.company.email);
  await page.getByRole('button', { name: nl.cms.enterEdit, exact: true }).click();
  await page.locator('[data-contact-value=email]').first().getByRole('button').click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('E-mailadres', { exact: true }).fill('unsaved@example.test');
  await dialog.getByRole('button', { name: nl.cms.save, exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Contact settings could not be saved.');
  await expect(dialog.getByLabel('E-mailadres', { exact: true })).toHaveValue('unsaved@example.test');
  await expect(page.locator('footer [data-contact-value=email]')).toHaveText(state.company.email);
  await dialog.getByRole('button', { name: nl.cms.cancel, exact: true }).click();
  await page.getByRole('button', { name: nl.cms.exitEdit, exact: true }).click();
  await expect(page.locator('footer a[href="mailto:roermond@schepenkring.nl"]')).toHaveText(state.company.email);
  expect(state.writes).toHaveLength(0);
});

test('a contact response captured before saving cannot overwrite the saved values', async ({ page }) => {
  const state = await fixture(page);
  await page.goto('/nl/contact');
  await expect(page.locator('[data-contact-value=email]').first()).toHaveText(state.company.email);
  const oldCompany = structuredClone(state.company);
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let reads = 0;
  await page.route('**/content/contact', async route => {
    if (++reads !== 1) return route.fallback();
    await held;
    await route.fulfill({ json: { company: oldCompany, show_chat: false } });
  });
  const started = page.waitForRequest(req => req.url().endsWith('/content/contact'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await started;
  await page.getByRole('button', { name: nl.cms.enterEdit, exact: true }).click();
  await page.locator('[data-contact-value=email]').first().getByRole('button').click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('E-mailadres', { exact: true }).fill('saved@example.test');
  await dialog.getByRole('button', { name: nl.cms.save, exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('footer [data-contact-value=email]')).toHaveText('saved@example.test');
  const completed = page.waitForResponse(res => res.url().endsWith('/content/contact'));
  release();
  await (await completed).finished();
  await page.getByRole('button', { name: nl.cms.exitEdit, exact: true }).click();
  await expect(page.locator('[data-contact-value=email]').first()).toHaveText('saved@example.test');
  await expect(page.locator('footer a[href="mailto:saved@example.test"]')).toHaveText('saved@example.test');
  expect(state.writes).toHaveLength(1);
});

test('public visitors see contact values without edit controls', async ({ page }) => {
  const state = await fixture(page, false);
  await page.goto('/nl/contact');
  await expect(page.locator('[data-contact-value=email]').first()).toHaveText('roermond@schepenkring.nl');
  await expect(page.locator('[data-contact-value] button')).toHaveCount(0);
  await expect(page.getByRole('toolbar')).toHaveCount(0);
  expect(state.writes).toHaveLength(0);
});

test('refresh reads authoritative settings after cache invalidation, including a cleared phone', async ({ page }) => {
  const state = await fixture(page, false);
  await page.goto('/nl/contact');
  await expect(page.locator('[data-contact-value=email]').first()).toHaveText(state.company.email);
  state.company.email = 'updated@example.test';
  state.company.phone = null;
  state.company.address = { ...state.company.address, street: 'Havenweg 7', city: 'Roermond' };
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('[data-contact-value=email]').first()).toHaveText(state.company.email);
  await expect(page.getByRole('link', { name: 'Mail ons', exact: true }).first())
    .toHaveAttribute('href', 'mailto:updated@example.test');
  await expect(page.locator('[data-contact-value=phone]').first()).toHaveText('');
  await expect(page.locator('[data-contact-value=address]').first()).toContainText('Havenweg 7');
  await page.reload();
  await expect(page.locator('[data-contact-value=email]').first()).toHaveText(state.company.email);
  await expect(page.locator('[data-contact-value=phone]').first()).toHaveText('');
  await expect(page.locator('a[href="tel:+31475315661"]')).toHaveCount(0);
  expect(state.writes).toHaveLength(0);
});

for (const event of ['focus', 'company-contact-changed']) {
  test(`${event} revalidates even when an older contact request is pending`, async ({ page }) => {
    const state = await fixture(page, false);
    let release!: () => void;
    let captured!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    const started = new Promise<void>(resolve => { captured = resolve; });
    let reads = 0;
    await page.route('**/content/contact', async route => {
      reads++;
      if (reads !== 1) return route.fallback();
      const oldCompany = structuredClone(state.company);
      captured();
      await held;
      await route.fulfill({ json: { company: oldCompany, show_chat: false } });
    });
    await page.goto('/nl/contact', { waitUntil: 'domcontentloaded' });
    await started;
    state.company.email = 'fresh@example.test';
    state.company.phone = '+31 475 11 22 33';
    await page.evaluate(name => window.dispatchEvent(new Event(name)), event);
    release();
    await expect(page.locator('[data-contact-value=email]').first()).toHaveText(state.company.email);
    await expect(page.locator('footer a[href="mailto:fresh@example.test"]')).toHaveText(state.company.email);
    await expect(page.locator('footer a[href="tel:+31475112233"]')).toHaveText(state.company.phone);
    expect(reads).toBe(2);
  });
}

test('API failure uses the corrected fallback email for values and destinations', async ({ page }) => {
  await fixture(page, false);
  await page.route('**/content/contact', route => route.fulfill({ status: 503, json: { message: 'Unavailable' } }));
  for (const path of ['/nl/contact', '/de/faq']) {
    const response = page.waitForResponse(res => res.url().endsWith('/content/contact'));
    await page.goto(path);
    await response;
    await expect(page.locator('footer a[href="mailto:roermond@schepenkring.nl"]')).toHaveText('roermond@schepenkring.nl');
    await expect(page.locator('main [data-contact-value=email]').first()).toHaveText('roermond@schepenkring.nl');
    await expect(page.locator('a[href="mailto:marketing@answer24.nl"]')).toHaveCount(0);
  }
});
