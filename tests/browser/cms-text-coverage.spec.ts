import { test, expect, type Page } from '@playwright/test';
import nl from '../../src/i18n/messages/nl.json';
import de from '../../src/i18n/messages/de.json';

// Local browser fixture evidence only; never presented as staging/database PASS.
async function fixture(page: Page, authorized = true, role = authorized ? 'super_admin' : 'customer') {
  const origin = test.info().project.use.baseURL!;
  const globals: Record<string, string> = { 'company.email': 'original@example.test', 'company.phone': '+31 475 315661' };
  const blocks: Record<string, { page: string; values: Record<string, string> }> = {};
  const writes: string[] = [];
  const company = () => ({ email: globals['company.email'], phone: globals['company.phone'],
    address: { street: 'Test street', postal_code: '1234AA', city: 'Herten', country: 'NL' } });
  await page.context().addCookies([{ name: 'krek_session', value: 'fixture', url: origin }]);
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname.endsWith('/content/contact')) return route.fulfill({ json: { company: company(), show_chat: false } });
    if (url.pathname.endsWith('/cms/contact-settings')) {
      const values = request.postDataJSON();
      for (const [key, value] of Object.entries(values)) {
        writes.push(`company.${key}`); globals[`company.${key}`] = value as string;
      }
      return route.fulfill({ json: { company: company() } });
    }
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: {
      id: 'editor', name: 'Editor', email: 'editor@example.test', role,
      permissions: authorized ? ['cms.manage', 'invoice.create', 'invoice.view'] : [],
    } });
    if (url.pathname.endsWith('/cms/page-content')) return route.fulfill({ json: {
      global_settings: globals, media_blocks: [],
      editor_locales: ['nl-NL', 'en-GB', 'de-DE', 'fr-FR'],
      content_blocks: Object.entries(blocks).filter(([, b]) => b.page === url.searchParams.get('page'))
        .map(([key, b]) => ({ key, type: 'short_text', value: b.values[url.searchParams.get('locale') ?? 'nl-NL'] })),
    } });
    if (url.pathname.includes('/global-settings')) {
      if (request.method() === 'PATCH') {
        const key = decodeURIComponent(url.pathname.split('/').at(-1)!);
        writes.push(key); globals[key] = request.postDataJSON().value;
        return route.fulfill({ json: { value: globals[key], cms_revision: 'fixture' } });
      }
      return route.fulfill({ json: { settings: globals, revisions: Object.fromEntries(Object.keys(globals).map(key => [key, null])) } });
    }
    if (url.pathname.includes('/content-blocks/') && request.method() === 'GET') {
      const key = decodeURIComponent(url.pathname.split('/').at(-1)!);
      return route.fulfill({ json: { key, cms_revision: null, value_by_locale: blocks[key]?.values ?? {}, publication_state: 'published' } });
    }
    if (url.pathname.includes('/content-blocks/') && request.method() === 'PATCH') {
      const key = decodeURIComponent(url.pathname.split('/').at(-1)!);
      const data = request.postDataJSON();
      blocks[key] = { page: data.page, values: { ...blocks[key]?.values, ...data.value_by_locale } };
      return route.fulfill({ json: {} });
    }
    return route.fulfill({ json: { data: [], settings: {}, items: [], subjects: [] } });
  });
  return { globals, blocks, writes };
}

test('company email edit synchronizes contact, footer and destinations; untouched settings are preserved', async ({ page }) => {
  const state = await fixture(page);
  await page.goto('/nl/contact');
  await page.getByRole('button', { name: nl.cms.enterEdit, exact: true }).click();
  await page.locator('main [data-cms-key="company.email"] [data-contact-value] > span').click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('input[type="email"]').fill('updated@example.test');
  await dialog.getByRole('button', { name: nl.cms.save, exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.writes).toEqual(['company.email']);
  await expect(page.locator('main [data-cms-key="company.email"]')).toHaveText('updated@example.test');
  await expect(page.locator('footer [data-cms-key="company.email"]')).toHaveText('updated@example.test');
  await page.getByRole('button', { name: nl.cms.exitEdit, exact: true }).click();
  await expect(page.locator('a[href="mailto:updated@example.test"]')).toHaveCount(3);
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await expect(page.locator('footer a[href="mailto:updated@example.test"]')).toHaveText('updated@example.test');
  await page.goto('/nl/over-ons');
  await expect(page.locator('main a[href="mailto:updated@example.test"]')).toHaveText('updated@example.test');
});

test('shared translations save, survive reload and isolate languages', async ({ page }) => {
  const state = await fixture(page);
  await page.goto('/nl');
  await page.getByRole('button', { name: nl.cms.enterEdit, exact: true }).click();
  const surface = page.locator('footer [data-cms-translation="footer.services"]');
  await surface.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('textbox')).toBeEnabled();
  await dialog.getByRole('textbox').fill('QA services');
  await dialog.getByRole('button', { name: nl.cms.publish, exact: true }).click();
  await expect(surface).toHaveText('QA services');
  expect(state.blocks['i18n.footer.services'].values).toEqual({ 'nl-NL': 'QA services' });
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await expect(page.locator('footer')).toContainText('QA services');
  await page.goto('/en');
  await expect(page.locator('footer')).not.toContainText('QA services');
  await page.goto('/de');
  await expect(page.locator('footer').getByText(de.footer.services, { exact: true })).toBeVisible();
});

test('two translations in one menu link open only the selected field', async ({ page }) => {
  const state = await fixture(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/nl');
  await page.getByRole('button', { name: nl.cms.enterEdit, exact: true }).click();
  await page.locator('header nav [data-cms-translation="nav.services"]').hover();
  const surface = page.locator('header [data-cms-translation="services.wash.desc"]');
  await surface.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveCount(1);
  await expect(dialog.getByRole('textbox')).toBeEnabled();
  await dialog.getByRole('textbox').fill('QA wash description');
  await dialog.getByRole('button', { name: nl.cms.publish, exact: true }).click();
  expect(Object.keys(state.blocks)).toEqual(['i18n.services.wash.desc']);
  expect(page.url()).toBe(`${test.info().project.use.baseURL}/nl`);
});

test('global settings save only explicitly changed fields', async ({ page }) => {
  const state = await fixture(page);
  await page.goto('/nl');
  await page.getByRole('button', { name: nl.cms.enterEdit, exact: true }).click();
  await page.getByRole('button', { name: nl.cms.globalTitle, exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: nl.cms.global.email, exact: true }).fill('global@example.test');
  await dialog.getByRole('textbox', { name: nl.cms.global.phone, exact: true }).fill('+31 123456789');
  await dialog.getByRole('button', { name: nl.cms.save, exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.writes).toEqual(['company.email', 'company.phone']);
});

test('an admin with cms.manage still cannot enable global editing', async ({ page }) => {
  await fixture(page, true, 'admin');
  await page.goto('/nl');
  await expect(page.locator('footer')).toBeVisible();
  await expect(page.getByRole('toolbar')).toHaveCount(0);
});

test('literal footer copy is editable and public navigation stays available', async ({ page }) => {
  const state = await fixture(page);
  await page.goto('/nl');
  await page.getByRole('button', { name: nl.cms.enterEdit, exact: true }).click();
  const link = page.locator('footer a[href="/nl/privacy"]');
  await link.locator('[data-cms-translation]').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('textbox')).toBeEnabled();
  await dialog.getByRole('textbox').fill('QA privacy');
  await dialog.getByRole('button', { name: nl.cms.publish, exact: true }).click();
  await expect(link).toHaveText('QA privacy');
  expect(page.url()).toBe(`${test.info().project.use.baseURL}/nl`);
  expect(Object.keys(state.blocks)).toHaveLength(1);
  await page.getByRole('button', { name: nl.cms.exitEdit, exact: true }).click();
  await link.click();
  await expect(page).toHaveURL('/nl/privacy');
});

test('unauthorized roles see no global text editing controls', async ({ page }) => {
  await fixture(page, false);
  await page.goto('/nl/contact');
  await expect(page.locator('footer')).toBeVisible();
  await expect(page.getByRole('toolbar')).toHaveCount(0);
  await expect(page.locator('[data-cms-edit], [data-cms-translation]')).toHaveCount(0);
});

test('catalog-managed dropdown labels preserve their text and use saved overrides', async ({ page }) => {
  const state = await fixture(page);
  await page.goto('/nl/admin/facturen/nieuw/handmatig');
  const currency = page.getByRole('button', { name: 'Valuta', exact: true });
  await expect(currency).toContainText('EUR — Euro');
  state.blocks['i18n.siteCopy.07693c685a0dd7a0'] = { page: 'global', values: { 'nl-NL': 'QA Euro label' } };
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await expect(currency).toContainText('QA Euro label');
  await currency.click();
  await expect(page.getByRole('option', { name: 'QA Euro label', exact: true })).toBeVisible();
});
