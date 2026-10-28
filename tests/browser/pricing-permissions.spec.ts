import { expect, test, type Page } from '@playwright/test';

async function pricingSession(page: Page, permissions: string[]) {
  const baseURL = test.info().project.use.baseURL!;
  const rule = { id: 'winter-rule', product_id: 'winter-product', product_name: 'Winterstalling',
    service_code: 'STALL-WINTER', range_from_cm: 0, range_to_cm: 499,
    price_incl_vat: 66000, price_excl_vat: 54545, vat_rate: 21,
    price_type: 'fixed', channel: 'all', active: true };
  const saves: Record<string, unknown>[] = [];
  await page.context().addCookies([{ name: 'krek_session', value: 'pricing-fixture', url: baseURL }]);
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== baseURL) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: {
      id: 'employee', name: 'Employee', email: 'employee@example.test', role: 'employee', permissions,
    } });
    if (url.pathname.endsWith('/pricing/rules/winter-rule') && route.request().method() === 'PATCH') {
      const payload = route.request().postDataJSON();
      saves.push(payload);
      Object.assign(rule, payload);
      return route.fulfill({ json: rule });
    }
    if (url.pathname.endsWith('/pricing/rules')) {
      expect(url.searchParams.get('service_code')).toBe('STALL-WINTER');
      return route.fulfill({ json: [rule] });
    }
    if (url.pathname.endsWith('/products')) return route.fulfill({ json: { data: [] } });
    return route.fulfill({ json: { data: [], items: [], cards: [], meta: { total: 0 } } });
  });
  return saves;
}

test('employee reaches filtered rules, saves cents, and reloads the updated tariff', async ({ page }) => {
  const saves = await pricingSession(page, ['pricing.view', 'pricing.update', 'products.view']);
  await page.goto('/nl/admin/calculator/pricing?service_code=STALL-WINTER&rule_id=winter-rule');
  await expect(page.getByRole('spinbutton', { name: 'Prijs incl. BTW (€)' })).toBeVisible();
  await page.getByRole('spinbutton', { name: 'Prijs incl. BTW (€)' }).fill('777.50');
  await page.getByRole('button', { name: 'Opslaan', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(saves).toHaveLength(1);
  expect(saves[0]).toMatchObject({ price_incl_vat: 77750, price_excl_vat: 64256 });
  await page.goto('/nl/admin/calculator/pricing?service_code=STALL-WINTER');
  await expect(page.locator('tbody')).toContainText('777,50');
});

for (const allowed of [true, false]) {
  test(`public Winterstalling pricing link respects pricing.update (${allowed})`, async ({ page }) => {
    await pricingSession(page, allowed ? ['pricing.view', 'pricing.update'] : ['pricing.view']);
    await page.goto('/nl/diensten/winterstalling');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // The employee session has resolved when the staff navigation is visible.
    await expect(page.locator('header').getByRole('link', { name: /dashboard|beheer|admin/i }).first()).toBeVisible();
    const link = page.getByRole('link', { name: 'Tarieven aanpassen' });
    if (allowed) await expect(link).toHaveAttribute('href', /admin\/calculator\/pricing\?product=STALL-WINTER/);
    else await expect(link).toHaveCount(0);
  });
}

test('read-only employee sees tariffs without mutation controls or a deep-link modal', async ({ page }) => {
  await pricingSession(page, ['pricing.view', 'products.view']);
  await page.goto('/nl/admin/calculator/pricing?service_code=STALL-WINTER&rule_id=winter-rule');
  await expect(page.locator('tbody')).toContainText('Winterstalling');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('main').getByRole('button', { name: 'Nieuw', exact: true })).toHaveCount(0);
  await expect(page.locator('tbody button')).toHaveCount(0);
});
