import { test, expect } from '../helpers/browser-test';
import { fixture } from '../helpers/cms-text-fixture';
import { readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve('src/app/[locale]/(site)');
const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? walk(join(dir, entry.name)) : entry.name === 'page.tsx' ? [join(dir, entry.name)] : []);

// Source-derived denominator: newly added public pages join the sweep automatically.
for (const file of walk(root)) {
  const route = relative(root, file).replaceAll('\\', '/').replace(/(?:^|\/)page\.tsx$/, '');
  test(`public page ${route || '/'} exposes editable text in all locales`, async ({ page }) => {
    const resolved = route === 'diensten/[slug]' ? 'diensten/cms-public-fixture' : route;
    test.skip(resolved.includes('['), 'A canonical record fixture is required for this dynamic route.');
    test.setTimeout(240_000);
    const state = await fixture(page);
    if (route === 'diensten/[slug]') {
      const id = 'c1111111-1111-4111-8111-111111111111';
      await page.route(url => url.pathname.endsWith('/service-catalog/pages/cms-public-fixture'), request => {
        const locale = new URL(request.request().url()).searchParams.get('locale') ?? 'nl';
        const tag = { nl: 'nl-NL', en: 'en-GB', de: 'de-DE', fr: 'fr-FR' }[locale] ?? locale;
        return request.fulfill({ json: { services: [{ id, code: 'CMS-SERVICE', slug: 'cms-public-fixture',
          name: state.blocks[`catalog.product.${id}.title`]?.values[tag] ?? 'CMS fixture service',
          short_description: 'Fixture description', description: 'Fixture description',
        }] } });
      });
    }
    for (const locale of ['nl', 'en', 'de', 'fr']) {
      const url = `/${locale}${resolved ? '/' + resolved : ''}`;
      const response = await page.goto(url);
      expect(response?.status(), url).toBe(200);
      await expect(page.locator('[data-cms-toggle]')).toBeEnabled();
      await page.locator('[data-cms-toggle]').click();
      const field = page.locator('main [data-cms-block]:not([data-cms-image]):visible, main [data-cms-translation]:visible').first();
      await expect(field).not.toHaveAttribute('data-cms-source', 'media_block');
      await expect(field, url + ' has an editor surface').toBeVisible();
      const key = await field.getAttribute('data-cms-key');
      expect(key).toBeTruthy();
      await field.click({ timeout: 15000 });
      const dialog = page.getByRole('dialog');
      await expect(dialog.locator('[data-cms-input]')).toBeEnabled();
      const marker = `CMS page proof ${locale} ${route || 'home'}`;
      await dialog.locator('[data-cms-input]').fill(marker);
      await dialog.locator('[data-cms-publish]').click();
      await expect(dialog).toHaveCount(0);
      const tag = { nl: 'nl-NL', en: 'en-GB', de: 'de-DE', fr: 'fr-FR' }[locale]!;
      expect(state.blocks[key!]?.values[tag], 'saved locale value').toBe(marker);
      await expect(page.locator(`[data-cms-key=${JSON.stringify(key)}]:visible`).first()).toHaveText(marker);
      await page.evaluate(() => sessionStorage.clear());
      await page.reload();
      await expect(page.locator(`[data-cms-key=${JSON.stringify(key)}]:visible`).first()).toHaveText(marker);
    }
  });
}
