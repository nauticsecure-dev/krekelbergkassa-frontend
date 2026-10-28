import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
const messages = JSON.parse(fs.readFileSync('src/i18n/messages/en.json', 'utf8')).cms;

async function editorSession(page: Page) {
  const baseURL = test.info().project.use.baseURL!;
  await page.context().addCookies([{ name: 'krek_session', value: 'cms-fixture', url: baseURL }]);
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(baseURL).origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: {
      id: 'cms-editor', name: 'Editor', email: 'editor@example.test', role: 'super_admin', permissions: ['cms.manage'],
    } });
    if (url.pathname.endsWith('/cms/page-content')) return route.fulfill({ json: { content_blocks: [], media_blocks: [] } });
    return route.fulfill({ json: { data: [], settings: {}, items: [] } });
  });
}

for (const route of ['', '/diensten', '/diensten/winterstalling', '/over-ons', '/contact', '/verkoop']) {
  test(`CMS edit controls open their editor without navigating: ${route || '/'}`, async ({ page }) => {
    test.setTimeout(180_000);
    await editorSession(page);
    await page.goto(`/en${route}`);
    await page.getByRole('button', { name: messages.enterEdit, exact: true }).click();
    const url = page.url();
    const controls = page.getByRole('button', { name: new RegExp(`^(${messages.editText}|${messages.editImage}|${messages.editCta})$`) });
    await expect(controls.first()).toBeVisible();
    const count = await controls.count();
    expect(count).toBeGreaterThan(3);
    for (let index = 0; index < count; index++) {
      const control = controls.nth(index);
      await control.scrollIntoViewIfNeeded();
      await control.hover();
      await expect(control).toHaveCSS('opacity', '1');
      await control.click({ timeout: 10000 });
      await expect(page.getByRole('dialog')).toBeVisible();
      expect(page.url()).toBe(url);
      await page.getByRole('dialog').getByRole('button', { name: 'Sluiten', exact: true }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
  });
}


test('linked text can be typed into, saved and previewed; CTA surface opens its editor', async ({ page }) => {
  await editorSession(page);
  let saved: Record<string, unknown> | undefined;
  await page.route('**/admin/cms/content-blocks/home.werf.cta', async (route) => {
    saved = route.request().postDataJSON();
    await route.fulfill({ json: {} });
  });
  await page.goto('/en');
  await page.getByRole('button', { name: messages.enterEdit, exact: true }).click();
  const label = page.locator('[data-cms-block="home.werf.cta"]');
  const linkSurface = label.locator('..');
  // Click the outer padding, rather than the label or pencil.
  await linkSurface.click({ position: { x: 5, y: 5 } });
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const input = dialog.getByRole('textbox');
  await input.click();
  await expect(input).toBeFocused();
  await input.press('ControlOrMeta+A');
  await input.pressSequentially('Updated link label');
  await input.press('Space');
  await input.press('Enter');
  await input.pressSequentially('second line');
  await expect(input).toHaveValue('Updated link label \nsecond line');
  await dialog.getByRole('button', { name: messages.save, exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(saved).toMatchObject({ page: 'home', value_by_locale: { 'en-GB': 'Updated link label \nsecond line' } });
  await expect(label).toContainText('Updated link label');
  const cta = page.locator('[data-cms-block="home.hero.cta_primary"]');
  // Use the label itself, rather than the pencil.
  await cta.locator('> div').click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: messages.exitEdit, exact: true }).click();
  await expect(page.locator('[data-cms-edit]')).toHaveCount(0);
  const previewLink = page.getByRole('link', { name: /Updated link label/ });
  await expect(previewLink).toHaveAttribute('href', '/en/diensten');
  await previewLink.click();
  await expect(page).toHaveURL(/\/en\/diensten$/);
});


test('certification badge without stored content shows 1976 and can be edited at every breakpoint', async ({ page }) => {
  await editorSession(page);
  await page.goto('/en');
  const badge = page.locator('[data-cms-badge="home.werf.cert"]');
  await expect(badge).toContainText('HISWA · 1976');
  await expect(badge.locator('[data-cms-edit]')).toHaveCount(0);
  await page.getByRole('button', { name: messages.enterEdit, exact: true }).click();
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(badge).toBeVisible();
    await badge.getByRole('button', { name: messages.editCertificationBadge }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel(messages.certificationSubtitle, { exact: true })).toHaveValue('HISWA · 1976');
    await dialog.getByRole('button', { name: messages.cancel, exact: true }).click();
  }
});

test('certification badge is editable on mobile and preserves locale edits after reload', async ({ page }) => {
  test.setTimeout(180_000);
  await editorSession(page);
  const stored: Record<string, Record<string, string>> = {
    'home.werf.cert': { 'nl-NL': 'Gecertificeerd', 'en-GB': 'Certified', 'de-DE': 'Zertifiziert', 'fr-FR': 'Certifié' },
    'home.werf.cert_sub': Object.fromEntries(['nl-NL', 'en-GB', 'de-DE', 'fr-FR'].map(tag => [tag, 'HISWA · 1972'])),
  };
  await page.route('**/cms/page-content?**', route => {
    const locale = new URL(route.request().url()).searchParams.get('locale') ?? 'en-GB';
    const tag = ({ nl: 'nl-NL', en: 'en-GB', de: 'de-DE', fr: 'fr-FR' } as Record<string, string>)[locale] ?? locale;
    return route.fulfill({ json: { content_blocks: Object.entries(stored).map(([key, values]) => ({ key, value: values[tag], type: 'short_text' })), media_blocks: [] } });
  });
  await page.route('**/admin/cms/content-blocks/home.werf.*', route => {
    const key = route.request().url().split('/').pop()!;
    const body = route.request().postDataJSON();
    expect(body).toMatchObject({ page: 'home', section: 'werf' });
    stored[key] = { ...stored[key], ...body.value_by_locale };
    return route.fulfill({ json: {} });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en');
  const badge = page.locator('[data-cms-badge="home.werf.cert"]');
  await expect(badge).toBeVisible();
  await page.getByRole('button', { name: messages.enterEdit, exact: true }).click();
  await badge.getByRole('button', { name: messages.editCertificationBadge }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel(messages.certificationSubtitle, { exact: true })).toHaveValue('HISWA · 1972');
  await dialog.getByLabel(messages.certificationTitle, { exact: true }).fill('Verified badge');
  for (const tag of ['EN', 'NL', 'DE', 'FR']) {
    await dialog.getByRole('tab', { name: tag, exact: true }).click();
    await dialog.getByLabel(messages.certificationSubtitle, { exact: true }).fill('HISWA · 1976');
  }
  await dialog.getByRole('button', { name: messages.save, exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(badge).toContainText('Verified badge');
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await expect(badge).toContainText('HISWA · 1976');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: messages.enterEdit, exact: true }).click();
  const desktopEdit = badge.getByRole('button', { name: messages.editCertificationBadge });
  await expect(desktopEdit).toBeVisible();
  await desktopEdit.focus();
  await desktopEdit.press('Enter');
  await expect(dialog.getByLabel(messages.certificationSubtitle, { exact: true })).toHaveValue('HISWA · 1976');
  await dialog.getByRole('button', { name: messages.cancel, exact: true }).click();
  for (const locale of ['de', 'nl', 'fr']) {
    await page.goto(`/${locale}`);
    await expect(badge).toContainText('HISWA · 1976');
    await expect(badge).toContainText(stored['home.werf.cert'][({ de: 'de-DE', nl: 'nl-NL', fr: 'fr-FR' } as Record<string, string>)[locale]]);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(badge).toBeVisible();
});

test('edit pencils support keyboard activation and mobile touch opens editors without navigation', async ({ page, browser }) => {
  test.setTimeout(180_000);
  await editorSession(page);
  await page.goto('/en');
  await page.getByRole('button', { name: messages.enterEdit, exact: true }).click();
  const pencil = page.locator('[data-cms-block="home.werf.cta"] button[data-cms-edit]');
  await pencil.focus();
  await pencil.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await pencil.focus();
  await pencil.press('Space');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');

  const context = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    serviceWorkers: 'block',
  });
  try {
    const touchPage = await context.newPage();
    await editorSession(touchPage);
    await touchPage.goto('/en');
    await touchPage.getByRole('button', { name: messages.enterEdit, exact: true }).tap();
    const originalURL = touchPage.url();
    await touchPage.locator('[data-cms-block="home.hero.cta_primary"] > div').tap();
    await expect(touchPage.getByRole('dialog')).toBeVisible();
    expect(touchPage.url()).toBe(originalURL);
    await touchPage.getByRole('dialog').getByRole('button', { name: messages.cancel, exact: true }).tap();
    await touchPage.locator('[data-cms-block="home.svc.crane.title"]').tap();
    await expect(touchPage.getByRole('dialog')).toBeVisible();
    expect(touchPage.url()).toBe(originalURL);
  } finally {
    await context.close();
  }
});
