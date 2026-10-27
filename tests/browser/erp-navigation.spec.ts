import { expect, test, type Page } from '@playwright/test';

async function session(page: Page, role = 'super_admin', permissions = ['*']) {
  const origin = test.info().project.use.baseURL!;
  const requests: string[] = [];
  await page.context().addCookies([{ name: 'krek_session', value: 'erp-fixture', url: origin }]);
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    requests.push(url.pathname);
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { id: 'erp-viewer', role, permissions, name: 'ERP Viewer', email: 'erp@example.test' } });
    if (url.pathname.endsWith('/admin/calendar')) return route.fulfill({ json: { regular_hours: [], exceptions: [], lunch_block: null } });
    if (url.pathname.endsWith('/appointments/options')) return route.fulfill({ json: { locations: [], employees: [] } });
    if (url.pathname.endsWith('/appointments/calendar')) return route.fulfill({ json: { data: [] } });
    return route.fulfill({ json: { data: [], items: [], cards: [], meta: { total: 0 }, services: [] } });
  });
  return requests;
}

test('Planning tabs retain deep links, filters, history and refreshed state', async ({ page }) => {
  await session(page);
  await page.goto('/en/admin/planning?tab=afspraken&view=month&date=2026-06-08&service_code=CRANE');
  await expect(page.locator('.fc-dayGridMonth-view')).toBeVisible();
  await expect(page.getByRole('tab', { selected: true })).toHaveText('Appointments');
  await page.getByRole('tab', { name: 'Week', exact: true }).click();
  await expect(page.locator('.fc-timeGridWeek-view')).toBeVisible();
  await expect(page).toHaveURL(/tab=week/);
  await expect(page).toHaveURL(/service_code=CRANE/);
  await page.reload();
  await expect(page.locator('.fc-timeGridWeek-view')).toBeVisible();
  await page.getByRole('tab', { name: 'Availability & opening hours', exact: true }).click();
  await expect(page.getByRole('tab', { selected: true })).toHaveText('Availability & opening hours');
  await page.goBack();
  await expect(page.getByRole('tab', { selected: true })).toHaveText('Week');
  await expect(page.locator('.fc-timeGridWeek-view')).toBeVisible();
  await page.getByRole('tab', { name: 'Today', exact: true }).click();
  await expect(page.locator('.fc-timeGridDay-view')).toBeVisible();
  await page.getByRole('tab', { name: /Yard/ }).click();
  await expect(page).toHaveURL(/tab=werf/);
  await page.reload();
  await expect(page.getByRole('tab', { selected: true })).toHaveText(/Yard/);
});

test('Today and Week links work without view parameters', async ({ page }) => {
  await session(page);
  await page.goto('/en/admin/planning?tab=vandaag&date=2020-01-01');
  await expect(page.locator('.fc-timeGridDay-view')).toBeVisible();
  await expect(page).not.toHaveURL(/date=2020-01-01/);
  await page.goto('/en/admin/planning?tab=week&view=day&date=2026-06-08');
  await expect(page.locator('.fc-timeGridWeek-view')).toBeVisible();
});

test('read-only staff see Planning without creation, configuration or yard access', async ({ page }) => {
  const requests = await session(page, 'employee', ['planning.view']);
  await page.goto('/en/admin/planning');
  await expect(page.getByRole('tab', { name: 'Availability & opening hours', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Appointment', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Set regular|Set lunch|Add exception|New location/ })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: /Yard/ })).toHaveCount(0);
  await page.goto('/en/admin/planning?tab=werf');
  await expect(page.getByRole('tab', { selected: true })).toHaveText('Availability & opening hours');
  await expect(page.getByRole('tab', { name: /Yard/ })).toHaveCount(0);
  expect(requests.some(path => path.includes('/work-orders'))).toBe(false);
});

test('finance without planning permission is redirected', async ({ page }) => {
  await session(page, 'finance', ['invoice.view']);
  await page.goto('/en/admin/planning?tab=afspraken');
  await expect(page).toHaveURL(new URL('/en/admin', test.info().project.use.baseURL!).toString());
  await expect(page.getByRole('tab')).toHaveCount(0);
});

test('ordinary admin is denied technical pages', async ({ page }) => {
  const requests = await session(page, 'admin', ['*']);
  await page.goto('/en/admin/api-credentials');
  await expect(page.getByText('No access. System administrators only.')).toBeVisible();
  expect(requests.some(path => path.endsWith('/admin/api-credentials'))).toBe(false);
});
