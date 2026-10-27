# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cms-session-safety.spec.ts >> route changes close stale dialogs and disable page actions without a registration
- Location: tests\browser\cms-session-safety.spec.ts:84:5

# Error details

```
Error: page.goto: net::ERR_INSUFFICIENT_RESOURCES at http://localhost:3057/en
Call log:
  - navigating to "http://localhost:3057/en", waiting until "load"

```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test';
  2   | import en from '../../src/i18n/messages/en.json';
  3   | 
  4   | const cms = en.cms;
  5   | const editor = { id: 'cms-editor', name: 'Editor', email: 'editor@example.test', role: 'super_admin', permissions: ['cms.manage'] };
  6   | 
  7   | async function fixture(page: Page) {
  8   |   const baseURL = test.info().project.use.baseURL!;
  9   |   await page.context().addCookies([{ name: 'krek_session', value: 'cms-fixture', url: baseURL }]);
  10  |   await page.route('**/*', route => {
  11  |     const url = new URL(route.request().url());
  12  |     if (url.origin !== new URL(baseURL).origin) return route.abort();
  13  |     if (!url.pathname.startsWith('/api/')) return route.continue();
  14  |     if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: editor });
  15  |     return route.fulfill({ json: { content_blocks: [], media_blocks: [], settings: {}, items: [], data: [] } });
  16  |   });
  17  | }
  18  | 
  19  | for (const response of ['valid', 'revoked', 'expired', 'offline']) {
  20  |   test(`cached CMS permissions stay hidden until verification: ${response}`, async ({ page }) => {
  21  |     await fixture(page);
  22  |     await page.addInitScript(user => sessionStorage.setItem('krek_user_cache', JSON.stringify(user)), editor);
  23  |     let release!: () => void;
  24  |     const pending = new Promise<void>(resolve => { release = resolve; });
  25  |     await page.route('**/auth/me', async route => {
  26  |       await pending;
  27  |       if (response === 'offline') return route.abort();
  28  |       await route.fulfill({ status: response === 'expired' ? 401 : 200,
  29  |         json: response === 'revoked' ? { ...editor, permissions: [] } : editor });
  30  |     });
  31  |     expect((await page.goto('/en/kraanafspraak'))?.status()).toBe(200);
  32  |     await expect(page.getByRole('heading').first()).toBeVisible();
  33  |     await expect(page.getByRole('toolbar')).toHaveCount(0);
  34  |     await expect(page.locator('[data-cms-edit]')).toHaveCount(0);
  35  |     const settled = response === 'offline'
  36  |       ? page.waitForEvent('requestfailed', request => request.url().endsWith('/auth/me'))
  37  |       : page.waitForResponse(result => result.url().endsWith('/auth/me'));
  38  |     release();
  39  |     await settled;
  40  |     if (response === 'valid') await expect(page.getByRole('toolbar')).toBeVisible();
  41  |     else {
  42  |       await expect.poll(() => page.evaluate(() => document.querySelectorAll('[role="toolbar"]').length)).toBe(0);
  43  |       await expect(page.locator('[data-cms-edit]')).toHaveCount(0);
  44  |     }
  45  |   });
  46  | }
  47  | 
  48  | test('expired save retains the draft and resumes only for the same verified editor', async ({ page }) => {
  49  |   await fixture(page);
  50  |   let expired = true;
  51  |   let saved: unknown;
  52  |   await page.route('**/admin/cms/content-blocks/home.werf.cta', route => {
  53  |     saved = route.request().postDataJSON();
  54  |     return route.fulfill({ status: expired ? 401 : 200, json: {} });
  55  |   });
  56  |   expect((await page.goto('/en'))?.status()).toBe(200);
  57  |   await page.getByRole('button', { name: cms.enterEdit, exact: true }).click();
  58  |   await page.locator('[data-cms-block="home.werf.cta"] button').click();
  59  |   const input = page.locator('[role="dialog"] textarea');
  60  |   await input.fill('Keep this unsaved label');
  61  |   await page.getByRole('button', { name: cms.save, exact: true }).click();
  62  |   const recovery = page.locator('dialog[open]');
  63  |   await expect(recovery).toContainText(cms.draftRetained);
  64  |   await expect(recovery.getByRole('link', { name: cms.signInAgain })).toHaveAttribute('target', '_blank');
  65  |   await page.keyboard.press('Escape');
  66  |   await expect(recovery).toBeVisible();
  67  |   await expect(input).toHaveValue('Keep this unsaved label');
  68  |   // Another account must not inherit or save this draft.
  69  |   await page.context().addCookies([{ name: 'krek_session', value: 'new-session', url: test.info().project.use.baseURL! }]);
  70  |   await page.route('**/auth/me', route => route.fulfill({ json: { ...editor, id: 'other-editor' } }));
  71  |   await recovery.getByRole('button', { name: cms.resumeEditing }).click();
  72  |   await expect(recovery).toBeVisible();
  73  |   await expect(recovery).toContainText(cms.sessionNotRestored);
  74  |   await page.route('**/auth/me', route => route.fulfill({ json: editor }));
  75  |   expired = false;
  76  |   await recovery.getByRole('button', { name: cms.resumeEditing }).click();
  77  |   await expect(recovery).toHaveCount(0);
  78  |   await expect(input).toHaveValue('Keep this unsaved label');
  79  |   await page.getByRole('button', { name: cms.save, exact: true }).click();
  80  |   await expect(page.getByRole('dialog')).toHaveCount(0);
  81  |   expect(saved).toMatchObject({ value_by_locale: { 'en-GB': 'Keep this unsaved label' } });
  82  | });
  83  | 
  84  | test('route changes close stale dialogs and disable page actions without a registration', async ({ page }) => {
  85  |   await fixture(page);
> 86  |   expect((await page.goto('/en'))?.status()).toBe(200);
      |                      ^ Error: page.goto: net::ERR_INSUFFICIENT_RESOURCES at http://localhost:3057/en
  87  |   await expect(page.getByRole('button', { name: cms.seoTitle, exact: true })).toBeDisabled();
  88  |   await page.getByRole('button', { name: cms.enterEdit, exact: true }).click();
  89  |   await page.getByRole('button', { name: cms.seoTitle, exact: true }).click();
  90  |   await expect(page.getByRole('dialog')).toBeVisible();
  91  |   // Native history changes are integrated with the Next app router. Exercise
  92  |   // several route changes without waiting for registration effects in between.
  93  |   await page.evaluate(() => {
  94  |     history.pushState(null, '', '/en/contact');
  95  |     history.pushState(null, '', '/en/kraanafspraak');
  96  |     history.pushState(null, '', '/en/missing-cms-route');
  97  |   });
  98  |   await expect(page.getByRole('dialog')).toHaveCount(0);
  99  | });
  100 | 
  101 | test('translated links have one keyboard target and edit without following their destination', async ({ page }) => {
  102 |   await fixture(page);
  103 |   expect((await page.goto('/en'))?.status()).toBe(200);
  104 |   await page.getByRole('button', { name: cms.enterEdit, exact: true }).click();
  105 |   const text = page.locator('footer [data-cms-translation="services.crane.title"]');
  106 |   const link = text.locator('..');
  107 |   await expect(text).not.toHaveAttribute('role', 'button');
  108 |   await link.focus();
  109 |   await link.press('Enter');
  110 |   await expect(page.getByRole('dialog')).toBeVisible();
  111 |   await expect(page).toHaveURL(/\/en$/);
  112 |   await page.getByRole('dialog').getByRole('button', { name: cms.cancel, exact: true }).click();
  113 |   await link.click();
  114 |   await expect(page.getByRole('dialog')).toBeVisible();
  115 |   await expect(page).toHaveURL(/\/en$/);
  116 |   await expect(page.locator('a button[data-cms-edit], button button[data-cms-edit], a [role="button"], button [role="button"]')).toHaveCount(0);
  117 | });
  118 | 
  119 | test('revoked permission removes controls and closes an open editor after revalidation', async ({ page }) => {
  120 |   await fixture(page);
  121 |   expect((await page.goto('/en'))?.status()).toBe(200);
  122 |   await page.getByRole('button', { name: cms.enterEdit, exact: true }).click();
  123 |   await page.locator('[data-cms-block="home.werf.cta"] button').click();
  124 |   await expect(page.getByRole('dialog')).toBeVisible();
  125 |   await page.route('**/auth/me', route => route.fulfill({ json: { ...editor, permissions: [] } }));
  126 |   await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  127 |   await expect(page.getByRole('toolbar')).toHaveCount(0);
  128 |   await expect(page.getByRole('dialog')).toHaveCount(0);
  129 |   await expect(page.locator('[data-cms-edit]')).toHaveCount(0);
  130 | });
  131 | 
  132 | test('expired image upload retains its selected file and metadata for retry', async ({ page }) => {
  133 |   await fixture(page);
  134 |   let expired = true;
  135 |   let uploads = 0;
  136 |   await page.route('**/admin/cms/media-blocks/*/upload', route => {
  137 |     uploads++;
  138 |     return route.fulfill({ status: expired ? 401 : 200, json: { image_url: '/img/krek/werf-hero.webp' } });
  139 |   });
  140 |   expect((await page.goto('/en'))?.status()).toBe(200);
  141 |   await page.getByRole('button', { name: cms.enterEdit, exact: true }).click();
  142 |   await page.locator('[data-cms-block="home.hero.image"] button').click();
  143 |   const dialog = page.locator('[role="dialog"]');
  144 |   await dialog.locator('input[type=file]').setInputFiles('public/img/krek/werf-hero.webp');
  145 |   const alt = dialog.getByRole('textbox', { name: `${cms.altText} EN`, exact: true });
  146 |   await alt.fill('Retained image description');
  147 |   await dialog.getByRole('button', { name: cms.save, exact: true }).click();
  148 |   await expect(page.locator('dialog[open]')).toBeVisible();
  149 |   await expect(dialog.locator('img[src^="blob:"]').first()).toBeAttached();
  150 |   await page.context().addCookies([{ name: 'krek_session', value: 'renewed-image-session', url: test.info().project.use.baseURL! }]);
  151 |   expired = false;
  152 |   await page.locator('dialog[open]').getByRole('button', { name: cms.resumeEditing }).click();
  153 |   await expect(page.locator('dialog[open]')).toHaveCount(0);
  154 |   await expect(alt).toHaveValue('Retained image description');
  155 |   await dialog.getByRole('button', { name: cms.save, exact: true }).click();
  156 |   await expect(dialog).toHaveCount(0);
  157 |   expect(uploads).toBe(2);
  158 | });
  159 | 
```