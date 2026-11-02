# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cms-media.spec.ts >> media controls render translated labels and choices (de)
- Location: tests\browser\cms-media.spec.ts:23:7

# Error details

```
Error: page.goto: Page crashed
Call log:
  - navigating to "http://localhost:3058/de", waiting until "load"

```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test';
  2   | import en from '../../src/i18n/messages/en.json';
  3   | import nl from '../../src/i18n/messages/nl.json';
  4   | import de from '../../src/i18n/messages/de.json';
  5   | import fr from '../../src/i18n/messages/fr.json';
  6   | 
  7   | const cms = en.cms;
  8   | async function fixture(page: Page) {
  9   |   const origin = String(test.info().project.use.baseURL);
  10  |   await page.context().addCookies([{ name: 'krek_session', value: 'media-qa', url: origin }]);
  11  |   await page.route('**/*', route => {
  12  |     const url = new URL(route.request().url());
  13  |     if (url.origin !== origin) return route.abort();
  14  |     if (!url.pathname.startsWith('/api/')) return route.continue();
  15  |     if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: {
  16  |       id: 'media-editor', role: 'super_admin', permissions: ['cms.manage'], name: 'Editor', email: 'editor@example.test',
  17  |     } });
  18  |     return route.fulfill({ json: { media_blocks: [], content_blocks: [], data: [], settings: {}, items: [] } });
  19  |   });
  20  | }
  21  | 
  22  | for (const [locale, { cms: messages }] of Object.entries({ nl, en, de, fr })) {
  23  |   test(`media controls render translated labels and choices (${locale})`, async ({ page }) => {
  24  |     await fixture(page);
> 25  |     await page.goto(`/${locale}`);
      |                ^ Error: page.goto: Page crashed
  26  |     await page.getByRole('button', { name: messages.enterEdit, exact: true }).click();
  27  |     await page.locator('[data-cms-block="home.hero.image"]')
  28  |       .getByRole('button', { name: messages.editImage, exact: true }).click();
  29  |     const dialog = page.getByRole('dialog');
  30  |     await expect(dialog.getByLabel(messages.uploadMobileImage, { exact: true })).toBeVisible();
  31  |     await expect(dialog.getByRole('button', { name: messages.mobileImage, exact: true })).toBeVisible();
  32  |     for (const label of [
  33  |       messages.brightness, messages.contrast, messages.saturation,
  34  |       messages.gradientStart, messages.gradientMiddle, messages.gradientEnd,
  35  |       ...['x', 'y'].flatMap(axis => [
  36  |         messages.desktopFocal.replace('{axis}', axis), messages.mobileFocal.replace('{axis}', axis),
  37  |       ]),
  38  |     ]) await expect(dialog.getByRole('slider', { name: label, exact: true })).toBeVisible();
  39  |     for (const [label, choices] of [
  40  |       [messages.alignment, [messages.alignLeft, messages.alignCenter, messages.alignRight]],
  41  |       [messages.gradient, [messages.gradientNone, messages.gradientRight, messages.gradientBottom]],
  42  |     ] as const) {
  43  |       await dialog.getByRole('button', { name: label, exact: true }).click();
  44  |       for (const choice of choices) await expect(page.getByRole('option', { name: choice, exact: true })).toBeVisible();
  45  |       await page.keyboard.press('Escape');
  46  |     }
  47  |     await expect(dialog).not.toContainText(/cms\.(?:mobile|desktop|gradient|align|brightness|contrast|saturation)/);
  48  |     await dialog.getByRole('button', { name: messages.cancel, exact: true }).click();
  49  |   });
  50  | }
  51  | 
  52  | for (const mobile of [false, true]) {
  53  |   test(`image adjustments preview immediately and reset without uploading (${mobile ? 'mobile' : 'desktop'})`, async ({ page }) => {
  54  |     await fixture(page);
  55  |     await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
  56  |     let uploads = 0;
  57  |     await page.route('**/admin/cms/media-blocks/*/upload', route => { uploads++; return route.fulfill({ json: {} }); });
  58  |     await page.goto('/en');
  59  |     await page.getByRole('button', { name: cms.enterEdit, exact: true }).click();
  60  |     await page.locator('[data-cms-block="home.contact.image"] button').click();
  61  |     const dialog = page.locator('[role="dialog"]');
  62  |     await dialog.locator('input[type=file]').first().setInputFiles('public/img/krek/werf-hero.webp');
  63  |     await dialog.getByLabel(cms.uploadMobileImage, { exact: true }).setInputFiles('public/img/krek/verkoop-schip.webp');
  64  |     await dialog.getByRole('slider', { name: cms.brightness, exact: true }).fill('125');
  65  |     await dialog.getByRole('slider', { name: cms.contrast, exact: true }).fill('85');
  66  |     await dialog.getByRole('slider', { name: cms.saturation, exact: true }).fill('70');
  67  |     await dialog.getByRole('slider', { name: cms.overlay, exact: true }).fill('0.35');
  68  |     const desktop = dialog.locator('[data-cms-image-preview="desktop"]');
  69  |     const phone = dialog.locator('[data-cms-image-preview="mobile"]');
  70  |     for (const preview of [desktop, phone]) {
  71  |       await expect(preview.locator('img')).toHaveCSS('filter', 'brightness(1.25) contrast(0.85) saturate(0.7)');
  72  |       await expect(preview.locator('[aria-hidden]').last()).toHaveCSS('background-color', 'rgba(8, 19, 38, 0.35)');
  73  |       await expect.poll(() => preview.locator('img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  74  |     }
  75  |     const desktopSrc = await desktop.locator('img').getAttribute('src');
  76  |     const mobileSrc = await phone.locator('img').getAttribute('src');
  77  |     expect(desktopSrc).toMatch(/^blob:/);
  78  |     expect(mobileSrc).toMatch(/^blob:/);
  79  |     expect(desktopSrc).not.toBe(mobileSrc);
  80  |     await dialog.getByRole('button', { name: cms.resetImageAdjustments, exact: true }).click();
  81  |     await expect(desktop.locator('img')).toHaveCSS('filter', 'brightness(1) contrast(1) saturate(1)');
  82  |     await expect(dialog.getByRole('slider', { name: cms.zoom, exact: true })).toHaveValue('1');
  83  |     await expect(dialog.getByRole('slider', { name: cms.overlay, exact: true })).toHaveValue('0');
  84  |     await expect(phone.locator('img')).toHaveAttribute('src', mobileSrc!);
  85  |     await desktop.scrollIntoViewIfNeeded();
  86  |     await page.screenshot({ path: test.info().outputPath('image-editor.png'), fullPage: false });
  87  |     await dialog.getByRole('button', { name: cms.cancel, exact: true }).click();
  88  |     expect(uploads).toBe(0);
  89  |     await page.locator('[data-cms-block="home.contact.image"] button').click();
  90  |     await expect(dialog.locator('img[src^="blob:"]')).toHaveCount(0);
  91  |   });
  92  | }
  93  | 
  94  | for (const route of ['', '/diensten', '/diensten/afspuiten', '/diensten/winterstalling', '/diensten/zelf-werken', '/diensten/weekje-op-wal', '/over-ons', '/contact', '/verkoop']) {
  95  |   test(`every inline media image loads and opens its editor: ${route || '/'}`, async ({ page }) => {
  96  |     test.setTimeout(180_000);
  97  |     await fixture(page);
  98  |     await page.goto(`/en${route}`);
  99  |     await page.getByRole('button', { name: cms.enterEdit, exact: true }).click();
  100 |     const images = page.locator('[data-cms-block]').filter({ has: page.locator('picture img') });
  101 |     expect(await images.count()).toBeGreaterThan(0);
  102 |     for (const image of await images.all()) {
  103 |       await image.scrollIntoViewIfNeeded();
  104 |       await expect.poll(() => image.locator('img').first().evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  105 |       await image.getByRole('button', { name: cms.editImage, exact: true }).click();
  106 |       const dialog = page.locator('[role="dialog"]');
  107 |       await expect(dialog.locator('.reactEasyCrop_Image')).toBeVisible();
  108 |       await expect.poll(() => dialog.locator('.reactEasyCrop_Image').evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  109 |       await expect(dialog.getByRole('button', { name: cms.save, exact: true })).toBeEnabled();
  110 |       await dialog.getByRole('button', { name: cms.cancel, exact: true }).click();
  111 |     }
  112 |   });
  113 | }
  114 | 
```