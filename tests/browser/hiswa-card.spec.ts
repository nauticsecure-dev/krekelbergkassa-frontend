import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';

test.setTimeout(180_000);

const tags = { nl: 'nl-NL', en: 'en-GB', de: 'de-DE', fr: 'fr-FR' };
const titleKey = 'over-ons.hiswa.title';
const descKey = 'over-ons.hiswa.desc';

async function fixture(page: Page) {
  const origin = new URL(test.info().project.use.baseURL!).origin;
  const store: Record<string, Record<string, string>> = Object.fromEntries(Object.values(tags).map((tag) => [tag, {
    [titleKey]: `Title ${tag}`, [descKey]: `Description ${tag}`,
  }]));
  const writes: Array<{ key: string; body: Record<string, unknown> }> = [];
  let failDescription = false;
  let failRead = false;
  await page.context().addCookies([{ name: 'krek_session', value: 'cms-fixture', url: origin }]);
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: {
      id: 'cms-editor', name: 'Editor', email: 'editor@example.test', role: 'super_admin', permissions: ['cms.manage'],
    } });
    if (url.pathname.endsWith('/cms/page-content')) {
      if (failRead) return route.fulfill({ status: 500, json: { message: 'Read failed' } });
      const values = store[url.searchParams.get('locale') ?? 'nl-NL'] ?? {};
      return route.fulfill({ json: { content_blocks: Object.entries(values).map(([key, value]) => ({ key, value, type: 'short_text' })), media_blocks: [] } });
    }
    if (url.pathname.includes('/cms/content-blocks/')) {
      const key = decodeURIComponent(url.pathname.split('/').pop()!);
      const body = route.request().postDataJSON();
      writes.push({ key, body });
      if (failDescription && key === descKey) return route.fulfill({ status: 500, json: { message: 'Save failed' } });
      for (const [tag, value] of Object.entries(body.value_by_locale)) store[tag][key] = String(value);
      return route.fulfill({ json: {} });
    }
    return route.fulfill({ json: { data: [], settings: {}, items: [] } });
  });
  return { store, writes, failDescription: () => { failDescription = true; }, recover: () => { failDescription = false; }, failRead: () => { failRead = true; } };
}

for (const [locale, tag] of Object.entries(tags)) {
  test(`HISWA card loads, saves and reloads both fields for ${locale}`, async ({ page }) => {
    const state = await fixture(page);
    const { cms: messages } = JSON.parse(fs.readFileSync(`src/i18n/messages/${locale}.json`, 'utf8'));
    await page.goto(`/${locale}/over-ons`);
    const card = page.locator('[data-cms-card="over-ons.hiswa"]');
    await expect(card).toContainText(`Title ${tag}`);
    await expect(card.locator('button')).toHaveCount(0);
    await page.getByRole('button', { name: messages.enterEdit, exact: true }).click();
    const trigger = card.getByRole('button', { name: messages.editHiswa });
    await expect(trigger).toHaveCSS('opacity', '1');
    const bounds = await trigger.boundingBox();
    expect(bounds!.width).toBeGreaterThanOrEqual(44);
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    await trigger.focus();
    await trigger.press('Enter');
    const dialog = page.getByRole('dialog');
    const title = dialog.getByLabel(messages.hiswaTitle, { exact: true });
    const description = dialog.getByLabel(messages.hiswaDescription, { exact: true });
    await expect(title).toHaveValue(`Title ${tag}`);
    await expect(description).toHaveValue(`Description ${tag}`);
    await expect(title).toBeFocused();
    // Each tab must load its own content, without leaking drafts into other locales.
    for (const [otherLocale, otherTag] of Object.entries(tags)) {
      await dialog.getByRole('button', { name: otherLocale.toUpperCase(), exact: true }).click();
      await expect(title).toHaveValue(`Title ${otherTag}`);
      await expect(description).toHaveValue(`Description ${otherTag}`);
    }
    await dialog.getByRole('button', { name: locale.toUpperCase(), exact: true }).click();
    await title.fill(`Updated title ${tag}`);
    await description.fill(`Updated description ${tag}`);
    await dialog.getByRole('button', { name: messages.save, exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(card).toContainText(`Updated title ${tag}`);
    await expect(card).toContainText(`Updated description ${tag}`);
    expect(state.writes).toEqual([
      { key: titleKey, body: { page: 'over-ons', section: 'story', type: 'short_text', value_by_locale: { [tag]: `Updated title ${tag}` } } },
      { key: descKey, body: { page: 'over-ons', section: 'story', type: 'paragraph', value_by_locale: { [tag]: `Updated description ${tag}` } } },
    ]);
    await page.reload();
    await expect(card).toContainText(`Updated title ${tag}`);
    await expect(card).toContainText(`Updated description ${tag}`);
  });
}

test('HISWA editor retains drafts and retries only the failed field', async ({ page }) => {
  const state = await fixture(page);
  const { cms: messages } = JSON.parse(fs.readFileSync('src/i18n/messages/en.json', 'utf8'));
  await page.goto('/en/over-ons');
  await page.getByRole('button', { name: messages.enterEdit, exact: true }).click();
  await page.getByRole('button', { name: messages.editHiswa }).click();
  const dialog = page.getByRole('dialog');
  const title = dialog.getByLabel(messages.hiswaTitle, { exact: true });
  const description = dialog.getByLabel(messages.hiswaDescription, { exact: true });
  await expect(title).toBeEnabled();
  await title.fill('Changed title');
  await description.fill('Changed description');
  state.failDescription();
  await dialog.getByRole('button', { name: messages.save, exact: true }).click();
  await expect(dialog.getByRole('button', { name: messages.save, exact: true })).toBeEnabled();
  await expect(description).toHaveValue('Changed description');
  state.recover();
  await dialog.getByRole('button', { name: messages.save, exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.writes.map(({ key }) => key)).toEqual([titleKey, descKey, descKey]);
});

test('HISWA editor blocks writes after a locale load failure', async ({ page }) => {
  const state = await fixture(page);
  const { cms: messages } = JSON.parse(fs.readFileSync('src/i18n/messages/en.json', 'utf8'));
  await page.goto('/en/over-ons');
  await page.getByRole('button', { name: messages.enterEdit, exact: true }).click();
  state.failRead();
  await page.getByRole('button', { name: messages.editHiswa }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(dialog.getByRole('button', { name: messages.save, exact: true })).toBeDisabled();
  expect(state.writes).toHaveLength(0);
});
