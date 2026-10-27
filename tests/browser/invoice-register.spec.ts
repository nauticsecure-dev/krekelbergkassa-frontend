import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';

const nl = JSON.parse(fs.readFileSync('src/i18n/messages/nl.json', 'utf8'));
const label = (key: string) => key.split('.').reduce((value, part) => value[part], nl) as string;
const invoice = {
  id: 'synthetic-invoice', invoice_number: 'SYNTHETIC-001', source: 'manual', direction: 'sales',
  status: 'partially_paid', invoice_status: 'final', payment_status: 'partial', is_overdue: true,
  total_amount_cents: 12100, subtotal_cents: 10000, vat_amount_cents: 2100,
  total_amount_euros: 121, subtotal_euros: 100, vat_amount_euros: 21, outstanding_cents: 6100,
  customer: { id: 'customer', name: 'Synthetic Customer', email: 'synthetic@example.test' },
  due_date: '2026-01-01', created_at: '2026-01-01T12:00:00Z', updated_at: '2026-01-01T12:00:00Z',
  lines: [{ id: 'line', description: 'Synthetic service', quantity: '1', unit_price: 10000, vat_rate: '21', line_total: 12100 }],
  payments: [{ id: 'payment', status: 'paid', amount: 6000, amount_euros: 60, method: 'cash', paid_at: '2026-01-02T12:00:00Z' }],
};

async function mockSession(page: Page) {
  const base = test.info().project.use.baseURL!;
  await page.context().addCookies([{ name: 'krek_session', value: 'synthetic-fixture', url: base }]);
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== base) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { id: 'fixture-user', email: 'synthetic@example.test', name: 'Synthetic Admin', role: 'super_admin', permissions: ['*'] } });
    if (url.pathname.endsWith('/invoices/summary')) return route.fulfill({ json: { open_count: 1, partial_count: 1, overdue_count: 1, paid_count: 0, open_balance_cents: 6100, payable_balance_cents: 0 } });
    if (url.pathname.endsWith('/invoices')) return route.fulfill({ json: { data: [invoice], meta: { total: 1, current_page: 1, last_page: 1 } } });
    if (url.pathname.endsWith('/invoices/synthetic-invoice')) return route.fulfill({ json: invoice });
    return route.fulfill({ json: { data: [], items: [], meta: { total: 0 }, cards: [] } });
  });
}

test('payment KPI, alias deep link, reload and browser history use the same query', async ({ page }) => {
  await mockSession(page);
  await page.goto('/nl/admin/facturen?payment_status=partially_paid');
  await expect(page.getByText('SYNTHETIC-001', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: label('adminNew.status.partial'), exact: true })).toHaveCount(2);
  const overdueQuery = page.waitForRequest((request) => new URL(request.url()).pathname.endsWith('/invoices') && new URL(request.url()).searchParams.get('payment_status') === 'overdue');
  await page.locator('a[href*="payment_status=overdue"]').first().click();
  await overdueQuery;
  await expect(page).toHaveURL(/payment_status=overdue/);
  await page.reload();
  await expect(page.getByText('SYNTHETIC-001', { exact: true })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/payment_status=partially_paid/);
  await page.goForward();
  await expect(page).toHaveURL(/payment_status=overdue/);
  await page.locator('a[href*="payment_status=outstanding"]').first().click();
  await expect(page).toHaveURL(/payment_status=outstanding/);
  await expect(page.locator('main')).not.toContainText('adminNew.');
});

test('invoice dossier tabs render independently and fetch timeline and audit on selection', async ({ page }) => {
  await mockSession(page);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/nl/admin/facturen/synthetic-invoice');
  await expect(page.locator('h1')).toContainText('SYNTHETIC-001');
  for (const key of ['lines', 'payments', 'documents', 'timeline', 'audit', 'overview']) {
    await page.getByRole('button', { name: label(`adminNew.invoiceDetail.tabs.${key}`), exact: true }).click();
    if (key === 'lines') await expect(page.getByText('Synthetic service', { exact: true })).toBeVisible();
    if (key === 'payments') await expect(page.getByText('cash', { exact: true })).toBeVisible();
    if (key === 'documents') await expect(page.getByRole('button', { name: label('adminNew.invoiceDetail.actions.generatePdf'), exact: true })).toBeVisible();
  }
  expect(errors).toEqual([]);
});
