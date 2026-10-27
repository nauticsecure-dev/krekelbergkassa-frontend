import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';

const routes = ['', '/diensten', '/diensten/winterstalling', '/diensten/afspuiten', '/diensten/weekje-op-wal', '/diensten/zelf-werken', '/over-ons', '/contact', '/verkoop', '/faq', '/kraanafspraak', '/privacy', '/voorwaarden', '/cookies'];
const tags = { nl: 'nl-NL', en: 'en-GB', de: 'de-DE', fr: 'fr-FR' };
const dictionary = (locale: string) => JSON.parse(fs.readFileSync(`src/i18n/messages/${locale}.json`, 'utf8')).cms;

// Stateful HTTP fixture: reload checks must read server state rather than the
// provider/session cache. Real database persistence is covered separately.
async function fixture(page: Page) {
  const baseURL = test.info().project.use.baseURL!;
  await page.context().addCookies([{ name: 'krek_session', value: 'cms-regression', url: baseURL }]);
  const content: Record<string, any> = {};
  const media: Record<string, any> = {};
  const uploads: string[] = [];
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== new URL(baseURL).origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { id: 'cms-editor', name: 'Editor', email: 'editor@example.test', role: 'super_admin', permissions: ['cms.manage'] } });
    if (url.pathname.endsWith('/cms/page-content')) {
      const slug = url.searchParams.get('page');
      const tag = url.searchParams.get('locale') ?? 'nl-NL';
      return route.fulfill({ json: {
        content_blocks: Object.values(content).filter(b => b.page === slug).map(b => ({ key: b.key, type: b.type, value: b.value_by_locale[tag] ?? b.value_by_locale['nl-NL'] })),
        media_blocks: Object.values(media).filter(b => b.page === slug).map(b => ({ ...b, alt: b.alt_by_locale?.[tag] ?? '', seo_title: b.seo_title_by_locale?.[tag] ?? '' })),
      } });
    }
    const match = url.pathname.match(/\/admin\/cms\/(content-blocks|media-blocks)\/([^/]+)(\/upload)?$/);
    if (match && request.method() !== 'GET') {
      const key = decodeURIComponent(match[2]);
      if (match[3]) {
        const body = request.postDataBuffer()!.toString();
        const slug = key.startsWith('over-ons.') ? 'over-ons' : 'verkoop';
        expect(body).toContain(`name="page"\r\n\r\n${slug}\r\n`);
        uploads.push(key);
        media[key] = { ...media[key], key, page: slug, image_url: '/img/krek/jachtmakelaar.webp', focal_point: { x: 50, y: 50 }, overlay: 0 };
        return route.fulfill({ status: 201, json: media[key] });
      }
      const body = request.postDataJSON();
      const store = match[1] === 'content-blocks' ? content : media;
      const previous = store[key];
      store[key] = { ...previous, ...body, key };
      for (const field of ['value_by_locale', 'alt_by_locale', 'seo_title_by_locale']) {
        if (body[field]) store[key][field] = { ...previous?.[field], ...body[field] };
      }
      return route.fulfill({ json: store[key] });
    }
    return route.fulfill({ json: { data: [], settings: {}, items: [] } });
  });
  return { content, media, uploads };
}

for (const width of [1440, 390]) {
  test(`Over ons hero first upload persists and Cancel preserves it (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const state = await fixture(page);
    const messages = dictionary('nl');
    const key = 'over-ons.hero.image';
    await page.goto('/nl/over-ons');
    await page.getByRole('button', { name: messages.enterEdit, exact: true }).click();
    const hero = page.locator(`[data-cms-block="${key}"]`);
    const dialog = page.getByRole('dialog');
    const original = await hero.locator('img').getAttribute('src');
    // A real click on the image surface must pass through decorative layers.
    const bounds = await hero.boundingBox();
    await hero.click({ position: { x: bounds!.width - 50, y: bounds!.height - 15 } });
    await expect(dialog).toBeVisible();
    await dialog.locator('input[type=file]').first().setInputFiles('public/img/krek/werf-hero.webp');
    expect(state.uploads).toHaveLength(0);
    await dialog.getByRole('button', { name: messages.cancel, exact: true }).click();
    expect(state.media[key]).toBeUndefined();
    await expect(hero.locator('img')).toHaveAttribute('src', original!);
    await hero.getByRole('button', { name: messages.editImage, exact: true }).click();
    await dialog.locator('input[type=file]').first().setInputFiles('public/img/krek/werf-hero.webp');
    await dialog.getByRole('button', { name: messages.save, exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(state.uploads).toEqual([key]);
    expect(state.media[key].page).toBe('over-ons');
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await expect(hero.locator('img')).toHaveAttribute('src', '/img/krek/jachtmakelaar.webp');
    await page.getByRole('button', { name: messages.enterEdit, exact: true }).click();
    await hero.getByRole('button', { name: messages.editImage, exact: true }).click();
    await dialog.locator('input[type=file]').first().setInputFiles('public/img/krek/werf-hero.webp');
    await dialog.getByRole('button', { name: messages.cancel, exact: true }).click();
    expect(state.uploads).toEqual([key]);
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await expect(hero.locator('img')).toHaveAttribute('src', '/img/krek/jachtmakelaar.webp');
  });
}

for (const width of [1440, 390]) {
  for (const route of routes) {
  test(`every editor is reachable, including below the fold: ${route || '/'} (${width}px)`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: 900 });
    await fixture(page);
    const messages = dictionary('en');
      const response = await page.goto(`/en${route}`);
      expect(response?.status(), route).toBe(200);
      await page.getByRole('button', { name: messages.enterEdit, exact: true }).click();
      const url = page.url();
      const controls = page.locator('button[data-cms-edit]').filter({ visible: true });
      expect(await controls.count(), route).toBeGreaterThan(0);
      for (let i = 0, count = await controls.count(); i < count; i++) {
        await controls.nth(i).click({ timeout: 10_000 });
        await expect(page.getByRole('dialog')).toBeVisible();
        expect(page.url()).toBe(url);
        const cancel = page.getByRole('dialog').getByRole('button', { name: messages.cancel, exact: true });
        await expect(cancel).toBeEnabled();
        await cancel.click();
        await expect(page.getByRole('dialog')).toHaveCount(0);
      }
      await page.getByRole('button', { name: messages.exitEdit, exact: true }).click();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), route).toBe(true);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: test.info().outputPath('full-page.png'), fullPage: true });
  });
  }
}

for (const [locale, tag] of Object.entries(tags)) {
  test(`Verkoop upload/cancel, metadata, step text and CTA survive a fresh reload: ${locale}`, async ({ page }) => {
    test.setTimeout(180_000);
    const state = await fixture(page);
    state.media['verkoop.sell.image'] = {
      key: 'verkoop.sell.image', page: 'verkoop', image_url: '/img/krek/jachthaven.webp',
      focal_point: { x: 50, y: 50 }, overlay: 0,
      alt_by_locale: Object.fromEntries(Object.values(tags).map(value => [value, `Existing ${value}`])),
    };
    const messages = dictionary(locale);
    await page.goto(`/${locale}/verkoop`);
    await page.getByRole('button', { name: messages.enterEdit, exact: true }).click();
    const image = page.locator('[data-cms-block="verkoop.sell.image"]');
    await image.getByRole('button').click();
    const dialog = page.getByRole('dialog');
    for (const [otherLocale, otherTag] of Object.entries(tags)) {
      await dialog.getByRole('tab', { name: otherLocale.toUpperCase(), exact: true }).click();
      await expect(dialog.getByRole('textbox', { name: `${messages.altText} ${otherLocale.toUpperCase()}`, exact: true })).toHaveValue(`Existing ${otherTag}`);
    }
    await dialog.getByRole('tab', { name: locale.toUpperCase(), exact: true }).click();
    const file = { name: 'replacement.webp', mimeType: 'image/webp', buffer: fs.readFileSync('public/img/krek/werf-hero.webp') };
    await dialog.locator('input[type=file]').first().setInputFiles(file);
    expect(state.uploads).toHaveLength(0);
    await dialog.getByRole('button', { name: messages.cancel, exact: true }).click();
    expect(state.uploads).toHaveLength(0);
    await image.getByRole('button').click();
    await dialog.locator('input[type=file]').first().setInputFiles(file);
    await dialog.getByRole('textbox', { name: `${messages.altText} ${locale.toUpperCase()}`, exact: true }).fill(`Alt ${locale}`);
    await dialog.getByRole('button', { name: messages.save, exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(state.uploads).toEqual(['verkoop.sell.image']);
    expect(state.media['verkoop.sell.image']).toMatchObject({ page: 'verkoop', alt_by_locale: { [tag]: `Alt ${locale}` } });

    await page.locator('[data-cms-block="verkoop.step1.number"] button').click();
    await dialog.getByRole('textbox').fill(`Step ${locale}`);
    await dialog.locator('input[type=checkbox]').uncheck();
    await dialog.getByRole('button', { name: messages.save, exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await page.locator('[data-cms-block="verkoop.sell.cta_primary"] > div').click({ position: { x: 5, y: 5 } });
    await dialog.getByRole('textbox', { name: messages.ctaLabel, exact: true }).fill(`Contact ${locale}`);
    await dialog.locator('label').filter({ hasText: messages.ctaRoute }).getByRole('button').click();
    await page.getByRole('option', { name: 'over-ons', exact: true }).click();
    await dialog.getByRole('button', { name: messages.save, exact: true }).click();
    await expect(dialog).toHaveCount(0);
    // Remove all optimistic browser state before reloading.
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await expect(page.locator('[data-cms-block="verkoop.sell.image"] img')).toHaveAttribute('src', '/img/krek/jachtmakelaar.webp');
    await expect(page.locator('[data-cms-block="verkoop.sell.image"] img')).toHaveAttribute('alt', `Alt ${locale}`);
    await expect(page.getByText(`Step ${locale}`, { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: `Contact ${locale}`, exact: true })).toHaveAttribute('href', `/${locale}/over-ons`);
  });
}
