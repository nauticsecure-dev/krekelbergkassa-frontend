import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';

async function fixture(page: Page, editorLocales = ['nl-NL', 'en-GB', 'de-DE', 'fr-FR']) {
  const origin = process.env.CMS_TEST_BASE_URL ?? 'http://localhost:3030';
  const globals: Record<string, unknown> = {};
  const media: Record<string, any> = {};
  const content: Record<string, { page: string; values: Record<string, string> }> = {};
  let uploads = 0;
  await page.context().addCookies([{ name: 'krek_session', value: 'cms-fixture', url: origin }]);
  await page.route('**/*', async (route) => {
    if (route.request().headers()['next-router-prefetch']) return route.abort();
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: {
      id: 'editor', name: 'Editor', email: 'editor@example.test', role: 'super_admin', permissions: ['cms.manage'],
    } });
    if (url.pathname.endsWith('/cms/page-content')) return route.fulfill({ json: {
      editor_locales: editorLocales,
      content_blocks: Object.entries(content).filter(([, block]) => block.page === url.searchParams.get('page'))
        .map(([key, block]) => ({ key, type: 'short_text', value: block.values[url.searchParams.get('locale') ?? 'en-GB'] ?? '' })),
      media_blocks: Object.values(media), global_settings: Object.fromEntries(Object.entries(globals).map(([key, value]) =>
        [key, typeof value === 'object' && value ? (value as Record<string, string>)[url.searchParams.get('locale') ?? 'en-GB'] : value])),
    } });
    if (url.pathname.includes('/content-blocks/')) {
      const key = decodeURIComponent(url.pathname.split('/').at(-1)!);
      const payload = route.request().postDataJSON();
      content[key] = { page: payload.page, values: { ...content[key]?.values, ...payload.value_by_locale } };
      return route.fulfill({ json: { key } });
    }
    if (url.pathname.includes('/global-settings')) {
      if (route.request().method() === 'PATCH') globals[decodeURIComponent(url.pathname.split('/').at(-1)!)] = route.request().postDataJSON().value;
      return route.fulfill({ json: { settings: globals } });
    }
    if (url.pathname.includes('/media-blocks/')) {
      const parts = url.pathname.split('/');
      const upload = parts.at(-1) === 'upload';
      const key = decodeURIComponent(parts.at(upload ? -2 : -1)!);
      media[key] ??= { key, image_url: '/img/krek/werf-hero.webp', alt: '', focal_point: { x: 50, y: 50 }, overlay: 0 };
      if (upload) { uploads++; media[key].image_url = '/img/krek/werf-hero.webp?uploaded=1'; }
      else Object.assign(media[key], route.request().postDataJSON());
      return route.fulfill({ json: media[key] });
    }
    return route.fulfill({ json: { data: [], settings: {}, items: [] } });
  });
  return { globals, media, uploads: () => uploads };
}

for (const mobile of [false, true]) {
  test(`header locales and image draft/crop survive reload (${mobile ? 'mobile' : 'desktop'})`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
    const state = await fixture(page);
    const messages = JSON.parse(fs.readFileSync('src/i18n/messages/en.json', 'utf8')).cms;
    await page.goto('/en');
    await page.getByRole('button', { name: messages.enterEdit, exact: true }).click();
    if (mobile) await page.locator('header button').filter({ has: page.locator('svg.lucide-menu') }).click();
    const url = page.url();
    await page.locator('header').getByRole('button', { name: messages.editCta, exact: true }).filter({ visible: true }).first().click();
    const dialog = page.getByRole('dialog');
    for (const [tag, value] of [['NL', 'Stalling'], ['EN', 'Storage'], ['DE', 'Lagerung'], ['FR', 'Hivernage']]) {
      await dialog.getByRole('tab', { name: tag, exact: true }).click();
      await dialog.getByRole('textbox', { name: new RegExp(`${tag}$`) }).fill(value);
    }
    await dialog.getByRole('button', { name: messages.global.headerCtaPath, exact: true }).click();
    await page.getByRole('option', { name: 'diensten/winterstalling', exact: true }).click();
    await dialog.getByRole('button', { name: messages.save, exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(page.url()).toBe(url);
    expect(state.globals['header.cta.path']).toBe('diensten/winterstalling');
    if (mobile) await page.locator('header button').filter({ has: page.locator('svg.lucide-x') }).click();
    const image = page.locator('[data-cms-block="home.hero.image"]');
    await image.getByRole('button', { name: messages.editImage, exact: true }).click();
    await dialog.locator('input[type=file]').first().setInputFiles('public/img/krek/werf-hero.webp');
    expect(state.uploads()).toBe(0);
    await dialog.getByRole('button', { name: messages.cancel, exact: true }).click();
    expect(state.uploads()).toBe(0);
    await image.getByRole('button', { name: messages.editImage, exact: true }).click();
    await dialog.locator('input[type=file]').first().setInputFiles('public/img/krek/werf-hero.webp');
    await expect(dialog.locator('.reactEasyCrop_Image')).toBeVisible();
    await dialog.getByRole('slider', { name: 'Zoom', exact: true }).focus();
    await dialog.getByRole('slider', { name: 'Zoom', exact: true }).press('End');
    await page.waitForTimeout(200);
    await dialog.getByRole('button', { name: messages.save, exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(state.uploads()).toBe(1);
    const savedCrop = state.media['home.hero.image'].crop_data;
    expect(savedCrop.unit).toBe('percent');
    expect(savedCrop.width).toBeLessThan(100);
    await page.reload();
    await expect(image.locator('img')).toHaveCSS('position', 'absolute');
    await page.getByRole('button', { name: messages.enterEdit, exact: true }).click();
    await image.getByRole('button', { name: messages.editImage, exact: true }).click();
    await expect(dialog.locator('.reactEasyCrop_Image')).toBeVisible();
    await dialog.getByRole('button', { name: messages.save, exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(state.media['home.hero.image'].crop_data.width).toBeCloseTo(savedCrop.width, 0);
    for (const [locale, label] of [['nl', 'Stalling'], ['en', 'Storage'], ['de', 'Lagerung'], ['fr', 'Hivernage']]) {
      await page.goto(`/${locale}`, {waitUntil:'domcontentloaded'});
      if (mobile) {
        // Wait for the authenticated client header before opening its drawer.
        // Initial pathname effects can otherwise close a pre-hydration click.
        await expect(page.locator(`header a[href="/${locale}/admin"]`).first()).toBeAttached();
        await page.locator('header button').filter({ has: page.locator('svg.lucide-menu') }).click();
        await expect(page.locator('header svg.lucide-x')).toBeVisible();
      }
      const link = page.locator('header').getByRole('link', { name: label, exact: true });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', `/${locale}/diensten/winterstalling`);
    }
  });
}

test('shared translated text can be edited inline and from the catalog, then reloaded', async ({ page }) => {
  await fixture(page);
  const messages = JSON.parse(fs.readFileSync('src/i18n/messages/en.json', 'utf8')).cms;
  await page.goto('/en');
  await page.getByRole('button', { name: messages.enterEdit, exact: true }).click();
  await page.locator('header [data-cms-translation="nav.salesLocation"]').first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('textbox')).toBeEnabled();
  await dialog.getByRole('textbox').fill('Local boat sales');
  await dialog.getByRole('button', { name: messages.save, exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('header [data-cms-translation="nav.salesLocation"]').first()).toHaveText('Local boat sales');
  await page.getByRole('button', { name: messages.allTranslations, exact: true }).click();
  await dialog.getByRole('textbox', { name: messages.searchTranslations, exact: true }).fill('nav.contact');
  await dialog.getByRole('button').filter({ hasText: 'nav.contact' }).click();
  await expect(dialog.getByRole('textbox')).toBeEnabled();
  await dialog.getByRole('textbox').fill('Get in touch');
  await dialog.getByRole('button', { name: messages.save, exact: true }).click();
  await page.reload();
  await expect(page.locator('header').getByRole('link', { name: 'Local boat sales', exact: true })).toBeVisible();
  await expect(page.locator('header').getByRole('link', { name: 'Get in touch', exact: true })).toBeVisible();
});

 test('editor tabs follow active language settings', async ({page}) => {
  await fixture(page, ['nl-NL','de-DE']);
  const messages = JSON.parse(fs.readFileSync('src/i18n/messages/en.json','utf8')).cms;
  await page.goto('/en');
  await page.getByRole('button',{name:messages.enterEdit,exact:true}).click();
  await page.locator('[data-cms-block="home.hero.image"]').getByRole('button',{name:messages.editImage,exact:true}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog.getByRole('tab')).toHaveText(['NL','DE']);
  await expect(dialog.getByRole('tab',{name:'NL',exact:true})).toHaveAttribute('aria-selected','true');
  await dialog.getByRole('button', { name: messages.cancel, exact: true }).click();
  await page.locator('[data-cms-block="home.hero.title"] button').click();
  await expect(dialog.getByRole('tab')).toHaveText(['NL', 'DE']);
  await expect(dialog.getByRole('tab', { name: 'NL', exact: true })).toHaveAttribute('aria-selected', 'true');
  await dialog.getByRole('button', { name: messages.cancel, exact: true }).click();
  await page.locator('[data-cms-block="home.hero.cta_primary"]').getByRole('button', { name: messages.editCta, exact: true }).click();
  await expect(dialog.getByRole('tab')).toHaveText(['NL', 'DE']);
  await expect(dialog.getByRole('tab', { name: 'NL', exact: true })).toHaveAttribute('aria-selected', 'true');
});

test('saved styling and responsive mobile source render after reload', async ({page}) => {
  const state = await fixture(page);
  state.media['home.hero.image'] = {
    key:'home.hero.image', image_url:'/img/krek/werf-hero.webp', alt:'Responsive hero',
    focal_point:{x:50,y:50}, overlay:0,
    crop_data:{x:20,y:20,width:50,height:50,unit:'percent'},
    mobile_image_url:'/img/krek/werf-hero.webp?mobile=1', mobile_focal_point:{x:20,y:80},
    image_style:{brightness:115,contrast:90,saturation:80,gradient:'none'},
  };
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/en');
  const image=page.locator('[data-cms-block="home.hero.image"] img');
  await expect(image).toHaveCSS('position','absolute');
  await expect(image).toHaveCSS('filter','brightness(1.15) contrast(0.9) saturate(0.8)');
  await page.setViewportSize({width:390,height:844});
  await expect.poll(() => image.evaluate((el:HTMLImageElement)=>el.currentSrc)).toContain('?mobile=1');
  await expect(image).toHaveCSS('object-position','20% 80%');
  await page.reload();
  await expect(image).toHaveCSS('object-position','20% 80%');
  await expect.poll(() => image.evaluate((el:HTMLImageElement)=>el.currentSrc)).toContain('?mobile=1');
});
