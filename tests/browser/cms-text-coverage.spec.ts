import { test, expect } from '../helpers/browser-test';
import type { Page } from '@playwright/test';
import nl from '../../src/i18n/messages/nl.json';
import de from '../../src/i18n/messages/de.json';

import { fixture } from '../helpers/cms-text-fixture';

test('service group headings save through their canonical group key and survive reload', async ({ page }) => {
  const state = await fixture(page);
  const groupId = 'a1111111-1111-4111-8111-111111111111';
  const key = `catalog.product_group.${groupId}.title`;
  await page.route(url => url.pathname.endsWith('/service-catalog/services'), route => route.fulfill({ json: { services: [{
    id: 'b1111111-1111-4111-8111-111111111111', code: 'TEST', name: 'Test service',
    group: { id: groupId, code: 'TEST-GROUP', name: state.blocks[key]?.values['nl-NL'] ?? 'Original group' },
  }] } }));
  await page.goto('/nl/diensten');
  await page.locator('[data-cms-toggle]').click();
  const field = page.locator(`[data-cms-key="${key}"]`);
  await expect(field).toHaveAttribute('data-cms-source', 'product_group');
  await field.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('[data-cms-save-draft]')).toHaveCount(0);
  await dialog.locator('[data-cms-input]').fill('Updated group');
  await dialog.locator('[data-cms-publish]').click();
  await expect(field).toHaveText('Updated group');
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await expect(field).toHaveText('Updated group');
});

test('FAQ settings save publicly, preserve hidden rows and keep stale edits open', async ({ page }) => {
  await fixture(page);
  let revision = 'a'.repeat(64);
  let rows = [{ cat: 'kraan', q: 'Visible FAQ question', a: 'Original answer', active: true },
    { cat: 'kraan', q: 'Hidden FAQ question', a: 'Hidden answer', active: false }];
  await page.route(url => url.pathname.endsWith('/content/faq'), route => route.fulfill({ json: { faq: { questions: rows.filter(q => q.active) }, contact: {} } }));
  await page.route(url => url.pathname.endsWith('/admin/settings/faq'), route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { questions_raw: rows, cms_revision: revision } });
    const body = route.request().postDataJSON();
    if (body.expected_revision !== revision) return route.fulfill({ status: 409, json: { message: 'FAQ changed. Reopen before saving.' } });
    rows = body.questions; revision = 'b'.repeat(64);
    return route.fulfill({ json: { questions_raw: rows, cms_revision: revision } });
  });
  await page.goto('/nl/faq');
  await page.locator('[data-cms-toggle]').click();
  await page.getByRole('button', { name: 'FAQ inhoud bewerken', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Vraag 1', exact: true }).fill('Updated FAQ question');
  await dialog.getByRole('button', { name: nl.cms.save, exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(rows[1]).toMatchObject({ q: 'Hidden FAQ question', active: false });
  await expect(page.getByText('Updated FAQ question', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Updated FAQ question', { exact: true })).toBeVisible();
  await page.locator('[data-cms-toggle]').click();
  await page.getByRole('button', { name: 'FAQ inhoud bewerken', exact: true }).click();
  await expect(dialog.getByRole('textbox', { name: 'Vraag 1', exact: true })).toHaveValue('Updated FAQ question');
  revision = 'c'.repeat(64);
  await dialog.getByRole('textbox', { name: 'Vraag 1', exact: true }).fill('Stale proposal');
  await dialog.getByRole('button', { name: nl.cms.save, exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('FAQ changed');
  await expect(dialog.getByRole('textbox', { name: 'Vraag 1', exact: true })).toHaveValue('Stale proposal');
  expect(rows[0].q).toBe('Updated FAQ question');
});

test('accordion text opens its own editor by keyboard without nested buttons', async ({ page }) => {
  await fixture(page);
  await page.goto('/nl/diensten/winterstalling');
  await page.locator('[data-cms-toggle]').click();
  const field = page.locator('[data-cms-key="diensten/winterstalling.faq.0.q"]');
  const summary = field.locator('xpath=ancestor::summary[1]');
  await expect(summary.locator('button')).toHaveCount(0);
  await summary.press('Enter');
  await expect(page.getByRole('dialog').locator('[data-cms-input]')).toBeVisible();
});

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

test('translated text stays editable inside a layer that passes pointer events through', async ({ page }) => {
  const state = await fixture(page);
  await page.goto('/nl');
  await page.getByRole('button', { name: nl.cms.enterEdit, exact: true }).click();
  const surface = page.locator('footer [data-cms-translation="footer.services"]');
  // Hero/photography layouts use pointer-events:none on their overlay containers.
  await surface.locator('..').evaluate(element => { element.style.pointerEvents = 'none'; });
  await surface.click({ timeout: 5_000 });
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox').fill('QA layered heading');
  await dialog.getByRole('button', { name: nl.cms.publish, exact: true }).click();
  await expect(surface).toHaveText('QA layered heading');
  expect(Object.keys(state.blocks)).toEqual(['i18n.footer.services']);
});

test('global footer text opens by clicking the text and by keyboard, and persists after reload', async ({ page }) => {
  await fixture(page);
  await page.goto('/nl');
  await page.getByRole('button', { name: nl.cms.enterEdit, exact: true }).click();
  const surface = page.locator('footer [data-cms-key="footer.tagline"]');
  await surface.click({ position: { x: 4, y: 4 } });
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox').fill('QA editable footer');
  await dialog.getByRole('button', { name: nl.cms.save, exact: true }).click();
  await expect(surface).toContainText('QA editable footer');
  await surface.focus();
  await surface.press('Enter');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: nl.cms.cancel, exact: true }).click();
  await surface.press('Space');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: nl.cms.cancel, exact: true }).click();
  await surface.locator('[data-cms-edit]').click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: nl.cms.cancel, exact: true }).click();
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await expect(surface).toContainText('QA editable footer');
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

test('the French invoice page renders its localized title instead of inherited English copy', async ({ page }) => {
  await fixture(page);
  await page.goto('/fr/admin/facturen');
  await expect(page.getByRole('heading', { name: 'Factures', level: 1, exact: true })).toBeVisible();
});
