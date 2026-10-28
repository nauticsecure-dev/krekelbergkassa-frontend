import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';

const messages = JSON.parse(fs.readFileSync('src/i18n/messages/nl.json', 'utf8')).cms;
const services = {
  crane: '/kraanafspraak', wash: '/diensten/afspuiten', storage: '/diensten/winterstalling',
  diy: '/diensten/zelf-werken', sale: '/verkoop', week: '/diensten/weekje-op-wal',
};
const editor = { id: 'editor', name: 'Editor', email: 'editor@example.test', role: 'super_admin', permissions: ['cms.manage'] };

async function fixture(page: Page) {
  const baseURL = test.info().project.use.baseURL!;
  const blocks: Record<string, Record<string, string>> = {};
  const state = { authDelay: 0, contentDelay: 0, authorized: true, authRequests: 0 };
  await page.context().addCookies([{ name: 'krek_session', value: 'cms-fixture', url: baseURL }]);
  await page.addInitScript((user) => {
    sessionStorage.setItem('krek_user_cache', JSON.stringify(user));
    // Capture hydration errors as well as the server/client handoff.
    (window as any).cmsErrors = [];
    const original = console.error;
    console.error = (...args) => { (window as any).cmsErrors.push(args.join(' ')); original(...args); };
  }, editor);
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== new URL(baseURL).origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname.endsWith('/auth/me')) {
      state.authRequests++;
      if (state.authDelay) await new Promise(resolve => setTimeout(resolve, state.authDelay));
      return route.fulfill({ status: state.authorized ? 200 : 401, json: state.authorized ? editor : { message: 'Expired' } });
    }
    if (url.pathname.endsWith('/cms/page-content')) {
      const payload = { content_blocks: Object.entries(blocks).map(([key, values]) => ({
        key, type: 'short_text', value: values[url.searchParams.get('locale') ?? 'nl-NL'] ?? '',
      })), media_blocks: [] };
      if (state.contentDelay) await new Promise(resolve => setTimeout(resolve, state.contentDelay));
      return route.fulfill({ json: payload });
    }
    if (url.pathname.includes('/admin/cms/content-blocks/')) {
      const key = decodeURIComponent(url.pathname.split('/').at(-1)!);
      const payload = request.postDataJSON();
      expect(payload).toMatchObject({ page: 'home', section: 'services' });
      blocks[key] = { ...blocks[key], ...payload.value_by_locale };
      return route.fulfill({ json: {} });
    }
    return route.fulfill({ json: { data: [], settings: {}, items: [] } });
  });
  return { blocks, state };
}

test('all service titles, taglines and descriptions save using mouse, touch and keyboard', async ({ page }, info) => {
  const { blocks } = await fixture(page);
  await page.goto('/nl');
  await page.getByRole('button', { name: messages.enterEdit, exact: true }).click();
  const originalURL = page.url();
  const dialog = page.getByRole('dialog');
  for (const service of Object.keys(services)) {
    for (const field of ['title', 'tagline', 'desc']) {
      const key = `home.svc.${service}.${field}`;
      const surface = page.locator(`[data-cms-block="${key}"]`);
      const pencil = surface.locator('button[data-cms-edit]');
      await pencil.scrollIntoViewIfNeeded();
      await pencil.evaluate(el => el.scrollIntoView({ block: 'center', inline: 'nearest' }));
      // No hover first: pencils must be discoverable on touch devices too.
      await expect(pencil).toHaveCSS('opacity', '1');
      await expect(pencil).toBeInViewport();
      await expect.poll(() => pencil.evaluate(el => {
        const box = el.getBoundingClientRect();
        return el.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
      })).toBe(true);
      await pencil.click();
      await expect(dialog.getByRole('textbox')).toBeEnabled();
      let value = `${info.project.name} ${service} ${field}`;
      await dialog.getByRole('textbox').fill(value);
      await dialog.getByRole('button', { name: messages.save, exact: true }).click();
      await expect(dialog).toHaveCount(0);
      await expect(surface).toContainText(value);
      expect(blocks[key]['nl-NL']).toBe(value);
      expect(page.url()).toBe(originalURL);
      for (const keypress of ['Enter', 'Space']) {
        await pencil.focus();
        await pencil.press(keypress);
        await expect(dialog.getByRole('textbox')).toBeEnabled();
        await expect(dialog.getByRole('textbox')).toHaveValue(value);
        if (keypress === 'Enter') {
          await dialog.getByRole('textbox').focus();
          await page.keyboard.press('ControlOrMeta+A');
          value += ' keyboard';
          await page.keyboard.insertText(value);
          await dialog.getByRole('button', { name: messages.save, exact: true }).focus();
          await page.keyboard.press('Enter');
        } else {
          await page.keyboard.press('Escape');
        }
        await expect(dialog).toHaveCount(0);
        expect(blocks[key]['nl-NL']).toBe(value);
        expect(page.url()).toBe(originalURL);
      }
      if (info.project.use.hasTouch) {
        await pencil.tap();
        await expect(dialog.getByRole('textbox')).toBeEnabled();
        await dialog.getByRole('textbox').fill(`${value} touch`);
        await dialog.getByRole('button', { name: messages.save, exact: true }).tap();
        await expect(dialog).toHaveCount(0);
        expect(blocks[key]['nl-NL']).toBe(`${value} touch`);
        expect(page.url()).toBe(originalURL);
      }
      // The text itself must also open its editor.
      await surface.locator(':scope > :first-child').click();
      await expect(dialog.getByRole('textbox')).toBeEnabled();
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      expect(page.url()).toBe(originalURL);
    }
  }
  await expect.poll(() => page.evaluate(() => (window as any).cmsErrors.filter((s: string) => /hydration|did not match|validateDOMNesting/i.test(s)))).toEqual([]);
  await page.getByRole('button', { name: messages.exitEdit, exact: true }).click();
  await expect(page.locator('[data-cms-edit]')).toHaveCount(0);
  for (const [service, path] of Object.entries(services)) {
    const link = page.locator(`main a[href="/nl${path}"]`).filter({ hasText: `${info.project.name} ${service} desc` });
    await expect(link).toHaveCount(1);
    await link.click();
    await expect(page).toHaveURL(`/nl${path}`);
    await page.goto('/nl');
  }
});

test('text editors can be dismissed while locale metadata loads and reopened safely', async ({ page }) => {
  const { state } = await fixture(page);
  state.contentDelay = 1500;
  await page.goto('/nl');
  await page.getByRole('button', { name: messages.enterEdit, exact: true }).click();
  const pencil = page.locator('[data-cms-block="home.svc.crane.title"] button');
  const dialog = page.getByRole('dialog');
  for (const action of ['escape', 'cancel']) {
    await pencil.click();
    await expect(dialog.getByRole('textbox')).toBeDisabled();
    if (action === 'escape') await page.keyboard.press('Escape');
    else await dialog.getByRole('button', { name: messages.cancel, exact: true }).click();
    await expect(dialog).toHaveCount(0);
  }
  state.contentDelay = 0;
  await pencil.click();
  await expect(dialog.getByRole('textbox')).toBeEnabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('cached session refresh preserves the open editor and reload never replays old saved text', async ({ page }) => {
  const { blocks, state } = await fixture(page);
  const key = 'home.svc.crane.desc';
  blocks[key] = { 'nl-NL': 'Old description' };
  state.authDelay = 1500;
  await page.goto('/nl');
  await page.getByRole('button', { name: messages.enterEdit, exact: true }).click();
  await page.locator(`[data-cms-block="${key}"] button`).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('textbox')).toBeEnabled();
  await dialog.getByRole('textbox').fill('Saved description');
  const requests = state.authRequests;
  const refreshed = page.waitForResponse(response => response.url().endsWith('/auth/me'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect.poll(() => state.authRequests).toBeGreaterThan(requests);
  await refreshed;
  await expect(dialog.getByRole('textbox')).toHaveValue('Saved description');
  await dialog.getByRole('button', { name: messages.save, exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(key => JSON.parse(sessionStorage.getItem('cms:page:home:nl-NL')!).content_blocks.find((b: any) => b.key === key).value, key)).toBe('Saved description');
  state.contentDelay = 2000;
  await page.reload();
  await page.getByRole('button', { name: messages.enterEdit, exact: true }).click();
  const surface = page.locator(`[data-cms-block="${key}"]`);
  await expect(surface).toContainText('Saved description');
  await surface.locator('button').click();
  await expect(dialog.getByRole('textbox')).toBeEnabled();
  await expect(dialog.getByRole('textbox')).toHaveValue('Saved description');
  // Cached permission must still be revoked when the server rejects the session.
  state.authorized = false;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('toolbar')).toHaveCount(0);
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('[data-cms-edit]')).toHaveCount(0);
});
