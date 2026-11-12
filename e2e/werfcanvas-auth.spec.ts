import { expect, test } from '@playwright/test';

const yardPath = '/en/admin/stalling/werfcanvas';
const staffToken = 'werfcanvas-test-staff';

test('the Werfcanvas link restores the staff cookie before navigating', async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  await page.context().addCookies([{ name: 'krek_session', value: staffToken, url: baseURL! }]);
  await page.addInitScript((token) => localStorage.setItem('krek_session', token), staffToken);
  await page.route('**/api/v1/**', async (route) => {
    if (new URL(route.request().url()).pathname.endsWith('/auth/me')) {
      await route.fulfill({ json: {
        id: 'werf-admin', name: 'Yard Admin', email: 'yard-admin@example.test', role: 'admin', permissions: ['stalling.view'],
      } });
      return;
    }
    await route.fulfill({ json: { data: [], items: [] } });
  });

  await page.goto('/en/admin/stalling');
  const link = page.getByRole('link', { name: 'Werfcanvas', exact: true });
  await expect(link).toBeVisible({ timeout: 30_000 });
  const navigation = page.waitForRequest((request) => new URL(request.url()).pathname === yardPath);
  await link.evaluate((element: HTMLAnchorElement) => {
    document.cookie = 'krek_session=; Max-Age=0; Path=/';
    element.click();
  });
  expect((await (await navigation).allHeaders()).cookie).toContain(`krek_session=${staffToken}`);
  await expect(page).toHaveURL(new RegExp(`${yardPath}$`), { timeout: 30_000 });
});

test('a guest gets a private login redirect back to Werfcanvas', async ({ request }) => {
  const response = await request.get(yardPath, { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers()['cache-control']).toContain('no-store');
  const location = new URL(response.headers().location, response.url());
  expect(location.pathname).toBe('/en/login');
  expect(location.searchParams.get('returnTo')).toBe(yardPath);
});
