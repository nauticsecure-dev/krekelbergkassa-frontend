import { expect, test, type Page } from '@playwright/test';
import en from '../../src/i18n/messages/en.json';
import nl from '../../src/i18n/messages/nl.json';
import de from '../../src/i18n/messages/de.json';
import fr from '../../src/i18n/messages/fr.json';

const cms = en.cms;

test('media controls wait for the current page revision before opening', async ({page}) => {
  await fixture(page);
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/cms/page-content*', async route => {
    await pending;
    await route.fulfill({json:{content_blocks:[],media_blocks:[{
      key:'home.hero.image',revision:7,image_url:'/img/krek/werf-hero.webp',alt:'Current boat',
    }]}});
  });
  await page.goto('/en');
  await page.getByRole('button',{name:cms.enterEdit,exact:true}).click();
  const image = page.locator('[data-cms-block="home.hero.image"]');
  await expect(image.locator('[data-cms-edit]')).toHaveCount(0);
  release();
  await image.locator('[data-cms-edit]').click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('media controls keep generated mobile variants following the desktop source', async ({page}) => {
  await fixture(page);
  await page.route('**/cms/page-content*', route => route.fulfill({json:{editor_locales:['nl-NL','en-GB','de-DE','fr-FR'],content_blocks:[],media_blocks:[{
    key:'home.hero.image', image_url:'/img/krek/werf-hero.webp', original_url:'/img/krek/werf-hero.webp',
    mobile_file_id:'generated-mobile', mobile_image_url:'/img/krek/verkoop-schip.webp', mobile_uses_desktop:true,
    alt:'A boat', focal_point:{x:50,y:50}, overlay:0, crop_data:{x:0,y:0,width:97,height:100,unit:'percent',aspect:1},
  }]}}));
  await page.goto('/en');
  await page.getByRole('button',{name:cms.enterEdit,exact:true}).click();
  await page.locator('[data-cms-block="home.hero.image"] [data-cms-edit]').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button',{name:cms.mobileImage,exact:true})).toContainText(cms.useDesktopImage);
  await expect(dialog.getByLabel(cms.cropPreset,{exact:true})).toHaveValue('1');
  await dialog.locator('input[type=file]').first().setInputFiles('public/img/krek/verkoop-schip.webp');
  await expect(dialog.locator('[data-cms-image-preview="mobile"] img')).toHaveAttribute('src',/^blob:/);
  await dialog.getByRole('button',{name:cms.cancel,exact:true}).click();
});

test('media controls restore saved ALT when decorative intent is removed', async ({page}) => {
  await fixture(page);
  const alts = {'nl-NL':'Een boot','en-GB':'A saved boat description','de-DE':'Ein Boot','fr-FR':'Un bateau'};
  const block = {key:'home.hero.image',image_url:'/img/krek/werf-hero.webp',alt:'',decorative:true,revision:1,focal_point:{x:50,y:50},overlay:0};
  await page.route('**/cms/page-content*', route => route.fulfill({json:{editor_locales:Object.keys(alts),content_blocks:[],media_blocks:[block]}}));
  await page.route('**/admin/cms/media-blocks/home.hero.image', route => route.fulfill({json:{...block,alt_by_locale:alts,seo_title_by_locale:{}}}));
  await page.route('**/admin/cms/media-blocks/home.hero.image/process', route => {
    const match = route.request().postDataBuffer()!.toString().match(/name="metadata"\r\n\r\n([\s\S]*?)\r\n--/);
    const metadata = JSON.parse(match![1]);
    expect(metadata.alt_by_locale).toBeUndefined();
    expect(metadata.decorative).toBe(false);
    return route.fulfill({json:{...block,revision:2,decorative:false,alt_by_locale:alts}});
  });
  await page.goto('/en');
  const image = page.locator('[data-cms-block="home.hero.image"]');
  await expect(image.locator('img')).toHaveAttribute('alt','');
  await page.getByRole('button',{name:cms.enterEdit,exact:true}).click();
  await image.locator('[data-cms-edit]').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel(cms.altText+' EN',{exact:true})).toHaveValue(alts['en-GB']);
  await dialog.getByLabel(cms.decorativeImage,{exact:true}).uncheck();
  await dialog.getByRole('button',{name:cms.save,exact:true}).click();
  await expect(dialog).toHaveCount(0);
  await expect(image.locator('img')).toHaveAttribute('alt',alts['en-GB']);
});

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
      await expect(dialog.locator('.reactEasyCrop_Image').first()).toBeVisible();
      await expect.poll(() => dialog.locator('.reactEasyCrop_Image').first().evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
      await expect(dialog.getByRole('button', { name: cms.save, exact: true })).toBeEnabled();
      await dialog.getByRole('button', { name: cms.cancel, exact: true }).click();
    }
  });
}
