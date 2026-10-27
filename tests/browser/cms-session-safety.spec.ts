import { expect, test, type Page } from '@playwright/test';
import en from '../../src/i18n/messages/en.json';

const cms = en.cms;
const editor = { id: 'cms-editor', name: 'Editor', email: 'editor@example.test', role: 'super_admin', permissions: ['cms.manage'] };

async function fixture(page: Page) {
  const baseURL = test.info().project.use.baseURL!;
  await page.context().addCookies([{ name: 'krek_session', value: 'cms-fixture', url: baseURL }]);
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(baseURL).origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: editor });
    return route.fulfill({ json: { content_blocks: [], media_blocks: [], settings: {}, items: [], data: [] } });
  });
}

for (const response of ['valid', 'revoked', 'expired', 'offline']) {
  test(`cached CMS permissions stay hidden until verification: ${response}`, async ({ page }) => {
    await fixture(page);
    await page.addInitScript(user => sessionStorage.setItem('krek_user_cache', JSON.stringify(user)), editor);
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/auth/me', async route => {
      await pending;
      if (response === 'offline') return route.abort();
      await route.fulfill({ status: response === 'expired' ? 401 : 200,
        json: response === 'revoked' ? { ...editor, permissions: [] } : editor });
    });
    expect((await page.goto('/en/kraanafspraak'))?.status()).toBe(200);
    await expect(page.getByRole('heading').first()).toBeVisible();
    await expect(page.getByRole('toolbar')).toHaveCount(0);
    await expect(page.locator('[data-cms-edit]')).toHaveCount(0);
    const settled = response === 'offline'
      ? page.waitForEvent('requestfailed', request => request.url().endsWith('/auth/me'))
      : page.waitForResponse(result => result.url().endsWith('/auth/me'));
    release();
    await settled;
    if (response === 'valid') await expect(page.getByRole('toolbar')).toBeVisible();
    else {
      await expect.poll(() => page.evaluate(() => document.querySelectorAll('[role="toolbar"]').length)).toBe(0);
      await expect(page.locator('[data-cms-edit]')).toHaveCount(0);
    }
  });
}

test('expired save retains the draft and resumes only for the same verified editor', async ({ page }) => {
  await fixture(page);
  let expired = true;
  let saved: unknown;
  await page.route('**/admin/cms/content-blocks/home.hero.title', route => {
    saved = route.request().postDataJSON();
    return route.fulfill({ status: expired ? 401 : 200, json: {} });
  });
  expect((await page.goto('/en'))?.status()).toBe(200);
  await page.getByRole('button', { name: cms.enterEdit, exact: true }).click();
  await page.locator('[data-cms-block="home.hero.title"] button').click();
  const input = page.locator('[role="dialog"] textarea');
  await input.fill('Keep this unsaved label');
  await page.getByRole('button', { name: cms.save, exact: true }).click();
  const recovery = page.locator('dialog[open]');
  await expect(recovery).toContainText(cms.draftRetained);
  await expect(recovery.getByRole('link', { name: cms.signInAgain })).toHaveAttribute('target', '_blank');
  await page.keyboard.press('Escape');
  await expect(recovery).toBeVisible();
  await expect(input).toHaveValue('Keep this unsaved label');
  // Another account must not inherit or save this draft.
  await page.context().addCookies([{ name: 'krek_session', value: 'new-session', url: test.info().project.use.baseURL! }]);
  await page.route('**/auth/me', route => route.fulfill({ json: { ...editor, id: 'other-editor' } }));
  await recovery.getByRole('button', { name: cms.resumeEditing }).click();
  await expect(recovery).toBeVisible();
  await expect(recovery).toContainText(cms.sessionNotRestored);
  await page.route('**/auth/me', route => route.fulfill({ json: editor }));
  expired = false;
  await recovery.getByRole('button', { name: cms.resumeEditing }).click();
  await expect(recovery).toHaveCount(0);
  await expect(input).toHaveValue('Keep this unsaved label');
  await page.getByRole('button', { name: cms.save, exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(saved).toMatchObject({ value_by_locale: { 'en-GB': 'Keep this unsaved label' } });
});

test('route changes close stale dialogs and disable page actions without a registration', async ({ page }) => {
  await fixture(page);
  expect((await page.goto('/en'))?.status()).toBe(200);
  await expect(page.getByRole('button', { name: cms.seoTitle, exact: true })).toBeDisabled();
  await page.getByRole('button', { name: cms.enterEdit, exact: true }).click();
  await page.getByRole('button', { name: cms.seoTitle, exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  // Native history changes are integrated with the Next app router. Exercise
  // several route changes without waiting for registration effects in between.
  await page.evaluate(() => {
    history.pushState(null, '', '/en/contact');
    history.pushState(null, '', '/en/kraanafspraak');
    history.pushState(null, '', '/en/missing-cms-route');
  });
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('translated links have one keyboard target and edit without following their destination', async ({ page }) => {
  await fixture(page);
  expect((await page.goto('/en'))?.status()).toBe(200);
  await page.getByRole('button', { name: cms.enterEdit, exact: true }).click();
  const text = page.locator('footer [data-cms-translation="services.crane.title"]');
  const link = text.locator('..');
  await expect(text).not.toHaveAttribute('role', 'button');
  await link.focus();
  await link.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page).toHaveURL(/\/en$/);
  await page.getByRole('dialog').getByRole('button', { name: cms.cancel, exact: true }).click();
  await link.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator('a button[data-cms-edit], button button[data-cms-edit], a [role="button"], button [role="button"]')).toHaveCount(0);
});

test('revoked permission removes controls and closes an open editor after revalidation', async ({ page }) => {
  await fixture(page);
  expect((await page.goto('/en'))?.status()).toBe(200);
  await page.getByRole('button', { name: cms.enterEdit, exact: true }).click();
  await page.locator('[data-cms-block="home.werf.cta"] button').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.route('**/auth/me', route => route.fulfill({ json: { ...editor, permissions: [] } }));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('toolbar')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('[data-cms-edit]')).toHaveCount(0);
});

test('expired image upload retains its selected file and metadata for retry', async ({ page }) => {
  await fixture(page);
  let expired = true;
  let uploads = 0;
  await page.route('**/admin/cms/media-blocks/*/upload', route => {
    uploads++;
    return route.fulfill({ status: expired ? 401 : 200, json: { image_url: '/img/krek/werf-hero.webp' } });
  });
  expect((await page.goto('/en'))?.status()).toBe(200);
  await page.getByRole('button', { name: cms.enterEdit, exact: true }).click();
  await page.locator('[data-cms-block="home.hero.image"] button').click();
  const dialog = page.locator('[role="dialog"]');
  await dialog.locator('input[type=file]').first().setInputFiles('public/img/krek/werf-hero.webp');
  const alt = dialog.getByRole('textbox', { name: `${cms.altText} EN`, exact: true });
  await alt.fill('Retained image description');
  await dialog.getByRole('button', { name: cms.save, exact: true }).click();
  await expect(page.locator('dialog[open]')).toBeVisible();
  await expect(dialog.locator('img[src^="blob:"]').first()).toBeAttached();
  await page.context().addCookies([{ name: 'krek_session', value: 'renewed-image-session', url: test.info().project.use.baseURL! }]);
  expired = false;
  await page.locator('dialog[open]').getByRole('button', { name: cms.resumeEditing }).click();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(alt).toHaveValue('Retained image description');
  await dialog.getByRole('button', { name: cms.save, exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(uploads).toBe(2);
});
