import { expect, test, type Page } from '@playwright/test';

async function session(page: Page, shortcuts: 'empty' | 'failure' = 'empty') {
  const origin = test.info().project.use.baseURL!;
  const product = { id: 'rare-product', public_id: 'UX204', slug: 'rare-search-product', code: 'NEEDLE-204', name: 'Rare Search Product', price_incl_vat: 12100, price_excl_vat: 10000, active: true };
  const searches: string[] = [];
  const saves: Record<string, unknown>[] = [];
  const service = { id: 'new-service', code: 'NEW-SERVICE', slug: 'fresh-service', name: 'Service du catalogue', description: 'Un nouveau service.', group: { code: 'NEW-GROUP', name: 'Nouveau groupe' }, tariffs: [], visibility: { public: true } };
  await page.context().addCookies([{ name: 'krek_session', value: 'global-ux-fixture', url: origin }]);
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { id: 'ux-employee', name: 'Employee', email: 'ux@example.test', role: 'employee', permissions: ['pricing.view', 'pricing.update', 'products.view', 'kassa.view', 'stalling.view', 'invoice.view'] } });
    if (url.pathname.endsWith('/dashboard-shortcuts')) return route.fulfill(shortcuts === 'failure' ? { status: 503, json: { message: 'Unavailable' } } : { json: { data: [] } });
    if (url.pathname.endsWith('/products')) {
      const search = url.searchParams.get('search') ?? '';
      searches.push(search);
      if (page.url().includes('/calculator/pricing')) expect(url.searchParams.get('per_page')).toBe('25');
      return route.fulfill({ json: { data: search.includes('NEEDLE') ? [product] : [] } });
    }
    if (url.pathname.endsWith('/pricing/rules')) {
      if (route.request().method() === 'POST') {
        saves.push(route.request().postDataJSON());
        return route.fulfill({ status: 201, json: { id: 'new-rule', ...saves.at(-1) } });
      }
      return route.fulfill({ json: [] });
    }
    if (url.pathname.endsWith('/service-catalog/services')) {
      expect(url.searchParams.get('locale')).toBe('fr');
      return route.fulfill({ json: { services: [service] } });
    }
    if (url.pathname.endsWith('/service-catalog/pages/fresh-service')) return route.fulfill({ json: { page: { slug: 'fresh-service', title: service.name }, services: [service] } });
    return route.fulfill({ json: { data: [], items: [], cards: [], meta: { total: 0 } } });
  });
  return { searches, saves };
}

test('empty shortcuts remain empty after reload and an API failure shows explicit fallback', async ({ page }) => {
  await session(page);
  await page.goto('/en/admin');
  await expect(page.locator('main')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Follow up stalling', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('link', { name: 'Follow up stalling', exact: true })).toHaveCount(0);
  await page.route('**/api/v1/dashboard-shortcuts', route => route.fulfill({ status: 503, json: { message: 'Unavailable' } }));
  await page.reload();
  await expect(page.getByText('Could not load shortcuts.', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Follow up stalling', exact: true })).toBeVisible();
});

test('pricing searches the server and saves the selected product on mobile', async ({ page }) => {
  const state = await session(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en/admin/calculator/pricing');
  await page.locator('main').getByRole('button', { name: 'New', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Product', exact: true }).click();
  await page.getByRole('combobox').fill('NEEDLE');
  await expect(page.getByRole('option', { name: 'Rare Search Product (NEEDLE-204)', exact: true })).toBeVisible();
  await page.getByRole('option', { name: 'Rare Search Product (NEEDLE-204)', exact: true }).click();
  await dialog.getByRole('spinbutton', { name: 'Price incl. VAT (€)', exact: true }).fill('121');
  await expect.poll(() => state.searches.includes('NEEDLE')).toBe(true);
  await page.screenshot({ path: '../_audit/global-ux/pricing-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.saves).toHaveLength(1);
  expect(state.saves[0]).toMatchObject({ product_id: 'rare-product', price_incl_vat: 12100 });
});

test('services discover a new catalog slug and preserve locale through navigation', async ({ page }) => {
  await session(page);
  await page.goto('/fr/diensten');
  await expect(page.locator('a[href="#service-NEW-GROUP"]')).toHaveText('Nouveau groupe');
  const link = page.getByRole('link', { name: 'Service du catalogue', exact: true });
  await expect(link).toHaveAttribute('href', '/fr/diensten/fresh-service');
  await link.click();
  await expect(page.getByRole('heading', { name: 'Service du catalogue', level: 1 })).toBeVisible();
  await expect(page).toHaveURL(/\/fr\/diensten\/fresh-service$/);
});
