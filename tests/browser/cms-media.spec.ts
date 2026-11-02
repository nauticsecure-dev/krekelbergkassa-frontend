import { expect, test, type Page } from '@playwright/test';
import en from '../../src/i18n/messages/en.json';
import nl from '../../src/i18n/messages/nl.json';
import de from '../../src/i18n/messages/de.json';
import fr from '../../src/i18n/messages/fr.json';

const cms = en.cms;
async function fixture(page: Page) {
  const origin = String(test.info().project.use.baseURL);
  await page.context().addCookies([{ name: 'krek_session', value: 'media-qa', url: origin }]);
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: {
      id: 'media-editor', role: 'super_admin', permissions: ['cms.manage'], name: 'Editor', email: 'editor@example.test',
    } });
    return route.fulfill({ json: { media_blocks: [], content_blocks: [], data: [], settings: {}, items: [] } });
  });
}

for (const [locale, { cms: messages }] of Object.entries({ nl, en, de, fr })) {
  test(`media controls render translated labels and choices (${locale})`, async ({ page }) => {
    await fixture(page);
    await page.goto(`/${locale}`);
    await page.getByRole('button', { name: messages.enterEdit, exact: true }).click();
    await page.locator('[data-cms-block="home.hero.image"]')
      .getByRole('button', { name: messages.editImage, exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel(messages.uploadMobileImage, { exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: messages.mobileImage, exact: true })).toBeVisible();
    for (const label of [
      messages.brightness, messages.contrast, messages.saturation,
      messages.gradientStart, messages.gradientMiddle, messages.gradientEnd,
      ...['x', 'y'].flatMap(axis => [
        messages.desktopFocal.replace('{axis}', axis), messages.mobileFocal.replace('{axis}', axis),
      ]),
    ]) await expect(dialog.getByRole('slider', { name: label, exact: true })).toBeVisible();
    for (const [label, choices] of [
      [messages.alignment, [messages.alignLeft, messages.alignCenter, messages.alignRight]],
      [messages.gradient, [messages.gradientNone, messages.gradientRight, messages.gradientBottom]],
    ] as const) {
      await dialog.getByRole('button', { name: label, exact: true }).click();
      for (const choice of choices) await expect(page.getByRole('option', { name: choice, exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
    }
    await expect(dialog).not.toContainText(/cms\.(?:mobile|desktop|gradient|align|brightness|contrast|saturation)/);
    await dialog.getByRole('button', { name: messages.cancel, exact: true }).click();
  });
}

for (const mobile of [false, true]) {
  test(`image adjustments preview immediately and reset without uploading (${mobile ? 'mobile' : 'desktop'})`, async ({ page }) => {
    await fixture(page);
    await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
    let uploads = 0;
    await page.route('**/admin/cms/media-blocks/*/upload', route => { uploads++; return route.fulfill({ json: {} }); });
    await page.goto('/en');
    await page.getByRole('button', { name: cms.enterEdit, exact: true }).click();
    await page.locator('[data-cms-block="home.contact.image"] button').click();
    const dialog = page.locator('[role="dialog"]');
    await dialog.locator('input[type=file]').first().setInputFiles('public/img/krek/werf-hero.webp');
    await dialog.getByLabel(cms.uploadMobileImage, { exact: true }).setInputFiles('public/img/krek/verkoop-schip.webp');
    await dialog.getByRole('slider', { name: cms.brightness, exact: true }).fill('125');
    await dialog.getByRole('slider', { name: cms.contrast, exact: true }).fill('85');
    await dialog.getByRole('slider', { name: cms.saturation, exact: true }).fill('70');
    await dialog.getByRole('slider', { name: cms.overlay, exact: true }).fill('0.35');
    const desktop = dialog.locator('[data-cms-image-preview="desktop"]');
    const phone = dialog.locator('[data-cms-image-preview="mobile"]');
    for (const preview of [desktop, phone]) {
      await expect(preview.locator('img')).toHaveCSS('filter', 'brightness(1.25) contrast(0.85) saturate(0.7)');
      await expect(preview.locator('[aria-hidden]').last()).toHaveCSS('background-color', 'rgba(8, 19, 38, 0.35)');
      await expect.poll(() => preview.locator('img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    }
    const desktopSrc = await desktop.locator('img').getAttribute('src');
    const mobileSrc = await phone.locator('img').getAttribute('src');
    expect(desktopSrc).toMatch(/^blob:/);
    expect(mobileSrc).toMatch(/^blob:/);
    expect(desktopSrc).not.toBe(mobileSrc);
    await dialog.getByRole('button', { name: cms.resetImageAdjustments, exact: true }).click();
    await expect(desktop.locator('img')).toHaveCSS('filter', 'brightness(1) contrast(1) saturate(1)');
    await expect(dialog.getByRole('slider', { name: cms.zoom, exact: true })).toHaveValue('1');
    await expect(dialog.getByRole('slider', { name: cms.overlay, exact: true })).toHaveValue('0');
    await expect(phone.locator('img')).toHaveAttribute('src', mobileSrc!);
    await desktop.scrollIntoViewIfNeeded();
    await page.screenshot({ path: test.info().outputPath('image-editor.png'), fullPage: false });
    await dialog.getByRole('button', { name: cms.cancel, exact: true }).click();
    expect(uploads).toBe(0);
    await page.locator('[data-cms-block="home.contact.image"] button').click();
    await expect(dialog.locator('img[src^="blob:"]')).toHaveCount(0);
  });
}

for (const route of ['', '/diensten', '/diensten/afspuiten', '/diensten/winterstalling', '/diensten/zelf-werken', '/diensten/weekje-op-wal', '/over-ons', '/contact', '/verkoop']) {
  test(`every inline media image loads and opens its editor: ${route || '/'}`, async ({ page }) => {
    test.setTimeout(180_000);
    await fixture(page);
    await page.goto(`/en${route}`);
    await page.getByRole('button', { name: cms.enterEdit, exact: true }).click();
    const images = page.locator('[data-cms-block]').filter({ has: page.locator('picture img') });
    expect(await images.count()).toBeGreaterThan(0);
    for (const image of await images.all()) {
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.locator('img').first().evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
      await image.getByRole('button', { name: cms.editImage, exact: true }).click();
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog.locator('.reactEasyCrop_Image')).toBeVisible();
      await expect.poll(() => dialog.locator('.reactEasyCrop_Image').evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
      await expect(dialog.getByRole('button', { name: cms.save, exact: true })).toBeEnabled();
      await dialog.getByRole('button', { name: cms.cancel, exact: true }).click();
    }
  });
}
