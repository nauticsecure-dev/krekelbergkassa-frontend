import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';

const locales = { nl: 'nl-NL', en: 'en-GB', de: 'de-DE', fr: 'fr-FR' };
const catalog = Object.fromEntries(Object.keys(locales).map(locale => [locale, JSON.parse(fs.readFileSync(`src/i18n/messages/${locale}.json`, 'utf8'))]));
const config = (route: string) => JSON.stringify({ link_type: 'internal', route, url: '', target: '_self', style: 'primary', enabled: true });
const ctas = [
  ['home.services.all', 'i18n.home.servicesAll', 'services', 'diensten'],
  ['home.werf.cta', 'home.werf.cta', 'werf', 'diensten'],
  ['home.werf.book', 'home.werf.book', 'werf', 'kraanafspraak'],
  ['home.sale.cta', 'home.sale.cta', 'sale', 'https://www.schepenkring.nl/aanbod-boten/?kantoor=Roermond'],
  ['home.sale.sell', 'home.sale.sell', 'sale', 'verkoop'],
  ['home.contact.cta', 'home.contact.cta', 'contact', 'contact'],
  ['home.cta.primary', 'home.cta.primary', 'cta', 'kraanafspraak'],
  ['home.cta.secondary', 'home.cta.secondary', 'cta', 'contact'],
];

async function fixture(page: Page, blocks: Record<string, string>) {
  const writes: Array<{ key: string; payload: any }> = [];
  await page.context().addCookies([{ name: 'krek_session', value: 'cms-fixture', url: test.info().project.use.baseURL! }]);
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { id: 'editor', name: 'Editor', email: 'editor@example.test', role: 'super_admin', permissions: ['cms.manage'] } });
    if (url.pathname.endsWith('/cms/page-content')) return route.fulfill({ json: { content_blocks: Object.entries(blocks).map(([key, value]) => ({ key, value, type: 'short_text' })), media_blocks: [] } });
    if (url.pathname.includes('/admin/cms/content-blocks/')) {
      const key = decodeURIComponent(url.pathname.split('/').at(-1)!);
      const payload = route.request().postDataJSON();
      writes.push({ key, payload });
      blocks[key] = Object.values(payload.value_by_locale)[0] as string;
      return route.fulfill({ json: {} });
    }
    return route.fulfill({ json: { data: [], settings: {}, items: [] } });
  });
  return writes;
}

for (const locale of Object.keys(locales)) {
  for (const state of ['absent', 'present', 'label-only', 'link-only', 'empty', 'legacy-link', 'custom']) {
    test(`${locale}: hero sale CTA with ${state} CMS content`, async ({ page }) => {
      const label = state === 'custom' ? catalog[locale].home.cta.secondary : catalog[locale].home.heroPrimary;
      const blocks: Record<string, string> = {};
      if (state === 'present' || state === 'label-only') blocks['home.hero.cta_primary.label'] = label;
      if (state === 'present' || state === 'link-only') blocks['home.hero.cta_primary.link'] = config('verkoop');
      if (state === 'legacy-link') blocks['home.hero.cta_primary.link'] = `/${locale}/verkoop`;
      if (state === 'empty') blocks['home.hero.cta_primary.label'] = '';
      if (state === 'custom') {
        blocks['home.hero.cta_primary.label'] = label;
        blocks['home.hero.cta_primary.link'] = config('contact');
      }
      await fixture(page, blocks);
      await page.goto(`/${locale}`);
      const hero = page.locator('main section').first();
      const link = hero.getByRole('link', { name: label, exact: true });
      const destination = `/${locale}/${state === 'custom' ? 'contact' : 'verkoop'}`;
      await expect(link).toHaveAttribute('href', destination);
      await link.click();
      await expect(page).toHaveURL(destination);
    });
  }

  test(`${locale}: homepage destination editors preserve existing label keys`, async ({ page }) => {
    const blocks = Object.fromEntries(ctas.map(([, labelKey]) => [labelKey, `Saved ${labelKey}`]));
    const writes = await fixture(page, blocks);
    await page.goto(`/${locale}`);
    const cms = catalog[locale].cms;
    await page.getByRole('button', { name: cms.enterEdit, exact: true }).click();
    for (const [key, labelKey, section] of ctas) {
      const surface = page.locator(`[data-cms-block="${key}"]`);
      await expect(surface).toContainText(`Saved ${labelKey}`);
      await surface.locator('button[data-cms-edit]').click();
      const dialog = page.getByRole('dialog');
      const label = dialog.getByRole('textbox', { name: cms.ctaLabel, exact: true });
      await expect(label).toBeEnabled();
      await expect(label).toHaveValue(`Saved ${labelKey}`);
      await label.fill(`Updated ${labelKey}`);
      // All destinations use the same editor, including the external sales CTA.
      if (key !== 'home.sale.cta') {
        await dialog.locator('label').filter({ hasText: cms.ctaRoute }).getByRole('button').click();
        await page.getByRole('option', { name: 'verkoop', exact: true }).click();
      }
      await dialog.getByRole('button', { name: cms.save, exact: true }).click();
      await expect(dialog).toHaveCount(0);
      expect(writes.some(write => write.key === labelKey && write.payload.page === 'home' && write.payload.section === section)).toBe(true);
      expect(writes.some(write => write.key === `${key}.link`)).toBe(true);
    }
    await page.getByRole('button', { name: cms.exitEdit, exact: true }).click();
    for (const [key, labelKey, , route] of ctas) {
      const link = page.getByRole('link', { name: `Updated ${labelKey}`, exact: true });
      await expect(link).toHaveAttribute('href', key === 'home.sale.cta' ? route : `/${locale}/verkoop`);
    }
    await page.reload();
    await expect(page.getByRole('link', { name: 'Updated home.cta.primary', exact: true })).toHaveAttribute('href', `/${locale}/verkoop`);
  });
}
