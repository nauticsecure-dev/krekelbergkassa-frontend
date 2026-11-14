import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { execFileSync, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const runtime = process.env.POS_BROWSER_RUNTIME;
test.skip(!runtime, 'Requires the isolated POS browser runner');
const backend = path.resolve('../krekelbergkassa-backend');
const fixtures = JSON.parse(process.env.POS_BROWSER_FIXTURES ?? '{}');
const providerState = (state: string) => fs.writeFileSync(path.join(runtime!, 'provider-state.txt'), state);

function snapshot() {
  return JSON.parse(execFileSync('php', ['scripts/pos-browser-fixture.php', 'snapshot'], {
    cwd: backend, encoding: 'utf8', windowsHide: true,
  }));
}

async function signIn(request: APIRequestContext) {
  const login = await request.post('/api/v1/auth/login', {
    data: { email: 'pos-cashier@example.test', password: process.env.POS_BROWSER_PASSWORD },
  });
  expect(login.status(), await login.text()).toBe(200);
  return (await login.json()).token as string;
}

function apiResponse(page: Page, route: string, method = 'POST') {
  return page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1' + route
    && response.request().method() === method);
}

test('register persists a quotation and recovers one online sale through settlement, receipt and refund', async ({ page, request }, testInfo) => {
  const token = await signIn(request);
  await page.context().addCookies([{ name: 'krek_session', value: token, url: process.env.FRONTEND_URL! }]);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/en/admin/kassa');
  const basket = page.locator('#cart');
  const dialog = page.getByRole('dialog');
  await page.getByRole('searchbox', { name: /search boats/i }).fill('STAR-1135');
  await page.getByRole('button', { name: /Harbor Star.*STAR-1135/ }).click();
  const products = page.getByRole('region', { name: 'Products', exact: true });
  await products.getByRole('button', { name: /^Harbor lift/i }).click({ timeout: 30_000 });
  await expect(dialog.getByRole('spinbutton', { name: /Length/ })).toHaveValue('1135');
  const pricing = apiResponse(page, '/kassa/quote');
  await dialog.getByRole('button', { name: 'Calculate price', exact: true }).click();
  expect(await (await pricing).json()).toMatchObject({ total_cents: 16335, subtotal_cents: 13500, vat_amount_cents: 2835 });
  await expect(basket).toContainText('€163.35');
  await basket.getByText('Line note', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Line note' }).fill('Dockside access');
  await page.getByRole('textbox', { name: 'Line note' }).blur();
  await basket.getByRole('button', { name: 'Add note', exact: true }).click();
  await dialog.getByRole('textbox').fill('Collect from dock reception');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();

  await basket.getByRole('button', { name: /^Check out / }).click();
  const quotation = apiResponse(page, '/kassa/quotations');
  await dialog.getByRole('button', { name: 'Save quotation', exact: true }).click();
  const quotationResponse = await quotation;
  expect(quotationResponse.status(), await quotationResponse.text()).toBe(201);
  const { id: quotationId, reference } = await quotationResponse.json();
  expect(reference).toMatch(/^OFF-/);
  await expect(dialog).toContainText(reference);
  const quotationUrl = await page.getByRole('link', { name: 'Open quotation' }).getAttribute('href');
  expect(quotationUrl).toBe('/en/admin/facturen/' + quotationId);
  const savedQuotation = await request.get('/api/v1/invoices/' + quotationId, {
    headers: { Authorization: 'Bearer ' + token },
  });
  expect(savedQuotation.status(), await savedQuotation.text()).toBe(200);
  expect(await savedQuotation.text()).toContain(reference);
  const quotationRows = snapshot();
  const line = {
    product_id: fixtures.product, unit_price: 13500, line_total: 16335,
    metadata: { boat_id: fixtures.boat, length_cm: 1135, line_note: 'Dockside access' },
  };
  expect(quotationRows).toMatchObject({ stock: 10, invoices: [{
    id: quotationId, invoice_number: reference, status: 'draft', source_type: 'kassa_quotation',
    customer_id: fixtures.customer, notes: 'Collect from dock reception', total_amount: 16335,
    vat_amount: 2835, lines: [line], payments: [],
  }] });
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click();
  await dialog.getByRole('button', { name: 'Credit card', exact: true }).click();
  await dialog.getByRole('button', { name: 'Checkout', exact: true }).click();
  const firstCheckout = apiResponse(page, '/kassa/checkout');
  await dialog.getByRole('button', { name: 'Checkout', exact: true }).click();
  const failed = await firstCheckout;
  expect(failed.status(), await failed.text()).toBe(503);
  const original = snapshot();
  expect(original.stock).toBe(9);
  expect(original.invoices).toHaveLength(2);
  const sale = original.invoices.find((row: { id: string }) => row.id !== quotationId);
  expect(sale).toMatchObject({
    status: 'open', customer_id: fixtures.customer, notes: 'Collect from dock reception', total_amount: 16335,
    vat_amount: 2835, idempotency_key: failed.request().postDataJSON().idempotency_key, lines: [line],
    payments: [{ amount: 16335, method: 'creditcard', provider: 'mollie', status: 'pending', provider_payment_id: null }],
  });

  await page.reload();
  const retried = apiResponse(page, '/kassa/checkout');
  await basket.getByRole('button', { name: 'Check sale status again' }).click();
  const recovered = await retried;
  expect(recovered.ok(), await recovered.text()).toBe(true);
  expect(recovered.request().postDataJSON()).toEqual(failed.request().postDataJSON());
  expect(await recovered.json()).toMatchObject({ invoice_id: sale.id });
  const creates = JSON.parse(fs.readFileSync(path.join(runtime!, 'provider.json'), 'utf8'));
  expect(creates).toHaveLength(2);
  expect(creates[0]).toEqual(creates[1]);
  expect(creates[0]).toMatchObject({ key: sale.payments[0].id, payload: { amount: { currency: 'EUR', value: '163.35' } } });

  await expect(dialog).toContainText('Payment pending');
  await page.reload();
  await expect(dialog).toContainText(sale.invoice_number);
  await expect(dialog.getByRole('button', { name: 'New sale' })).toBeDisabled();
  providerState('paid');
  await dialog.getByRole('button', { name: 'Check payment', exact: true }).click();
  await expect(dialog).toContainText('Payment complete');
  const print = dialog.getByRole('button', { name: 'Print receipt' });
  const pdf = dialog.getByRole('link', { name: 'Open printable receipt' });
  await expect(async () => {
    if (await print.isVisible()) await print.click();
    await expect(pdf).toBeVisible({ timeout: 3000 });
  }).toPass({ timeout: 25_000 });
  const pdfUrl = new URL((await pdf.getAttribute('href'))!);
  expect(pdfUrl.origin).toBe(process.env.API_PROXY_TARGET);
  const file = await request.get(pdfUrl.href);
  expect(file.status()).toBe(200);
  expect((await file.body()).subarray(0, 5).toString()).toBe('%PDF-');
  const email = apiResponse(page, '/invoices/' + sale.id + '/email');
  await dialog.getByRole('button', { name: 'Email receipt' }).click();
  expect((await email).status()).toBe(202);
  await expect(dialog).toContainText('The email is queued.');
  await expect(dialog.getByRole('link', { name: 'View invoice' })).toHaveAttribute('href', '/en/admin/facturen/' + sale.id);
  const settled = snapshot();
  expect(settled.stock).toBe(9);
  expect(settled.invoices).toHaveLength(2);
  expect(settled.invoices.find((row: { id: string }) => row.id === sale.id)).toMatchObject({
    status: 'paid', email_sent_at: expect.any(String), payments: [{
      id: sale.payments[0].id, amount: 16335, status: 'paid', provider_payment_id: creates[0].id,
    }],
  });
  await page.screenshot({ path: testInfo.outputPath('settled-receipt.png') });
  await dialog.getByRole('button', { name: 'New sale' }).click();
  await expect(basket).toContainText('Add products');
  expect(await page.evaluate(id => sessionStorage.getItem('kassa.checkout.' + id), fixtures.staff)).toBeNull();

  const refund = () => request.post('/api/v1/kassa/sales/' + sale.id + '/refund', {
    headers: { Authorization: 'Bearer ' + token },
    data: { reason: 'Isolated POS return', refund_method: 'original' },
  });
  expect((await refund()).status()).toBe(422);
  expect(snapshot()).toEqual(settled);
  providerState('refunded');
  const credit = await refund();
  expect(credit.status(), await credit.text()).toBe(201);
  const { credit_note_id } = await credit.json();
  expect((await refund()).status()).toBe(422);
  const refunded = snapshot();
  expect(refunded.stock).toBe(10);
  expect(refunded.invoices).toHaveLength(3);
  expect(refunded.invoices).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: sale.id, status: 'credited' }),
    expect.objectContaining({ id: credit_note_id, credited_invoice_id: sale.id, total_amount: -16335, payments: [
      expect.objectContaining({ amount: -16335, provider: 'mollie', status: 'paid' }),
    ] }),
  ]));
  fs.writeFileSync(testInfo.outputPath('database-evidence.json'), JSON.stringify({ original, settled, refunded }, null, 2));
});

test('concurrent MySQL requests commit one cash sale and one credit', async ({ request }, testInfo) => {
  const second = process.env.POS_BROWSER_RACE_URL;
  test.skip(!second, 'Enable the isolated MySQL server with POS_MYSQL_BIN');
  const first = process.env.API_PROXY_TARGET!;
  const token = await signIn(request);
  const headers = { Authorization: 'Bearer ' + token };
  const before = snapshot();
  const mysql = path.join(process.env.POS_MYSQL_BIN!, process.platform === 'win32' ? 'mysql.exe' : 'mysql');
  const mysqlArgs = ['--no-defaults', '-h', '127.0.0.1', '-P', process.env.POS_BROWSER_MYSQL_PORT!, '-u', 'root', '-B', '-N', 'pos_browser'];
  const query = (sql: string) => execFileSync(mysql, [...mysqlArgs, '-e', sql], { encoding: 'utf8', windowsHide: true }).trim();

  async function collide(lock: string, route: string, data: object) {
    const blocker = spawn(mysql, [...mysqlArgs, '--unbuffered', '-e',
      'START TRANSACTION; ' + lock + '; SELECT SLEEP(25);'], { windowsHide: true });
    try {
      await new Promise<void>((resolve, reject) => {
        blocker.stdout.once('data', () => resolve());
        blocker.once('error', reject);
        blocker.once('exit', code => reject(new Error('MySQL lock holder exited with code ' + code)));
      });
      const responses = Promise.all([first, second!].map(base => request.post(base + route, { headers, data })));
      // Keep both workers blocked until MySQL confirms that both reached the transaction lock.
      const result = await expect.poll(() => Number(query('SELECT COUNT(DISTINCT REQUESTING_THREAD_ID) FROM performance_schema.data_lock_waits')),
        { timeout: 15_000 }).toBe(2).then(() => null, error => error);
      blocker.kill();
      const completed = await responses;
      if (result) throw result;
      return completed;
    } finally {
      blocker.kill();
    }
  }

  const key = randomUUID();
  const checkouts = await collide("SELECT id FROM invoice_sequences WHERE series = 'INV' FOR UPDATE", '/api/v1/kassa/checkout', {
    device_id: 'pos-browser-race', idempotency_key: key, payment_method: 'cash', customer_id: fixtures.customer,
    expected_total_cents: 16335, items: [{
      product_id: fixtures.product, quantity: 1, description: 'Harbor lift', unit_price_cents: 13500,
      metadata: { boat_id: fixtures.boat, length_cm: 1135 },
    }],
  });
  expect(checkouts.map(response => response.status())).toEqual([200, 200]);
  const [sale, duplicate] = await Promise.all(checkouts.map(response => response.json()));
  expect(sale.invoice_id).toMatch(/^[a-f0-9-]{36}$/);
  expect(duplicate.invoice_id).toBe(sale.invoice_id);
  const sold = snapshot();
  expect(sold.stock).toBe(before.stock - 1);
  expect(sold.invoices).toHaveLength(before.invoices.length + 1);
  expect(sold.invoices.filter((row: { idempotency_key: string }) => row.idempotency_key === key)).toEqual([
    expect.objectContaining({ id: sale.invoice_id, status: 'paid', register_audit: ['kassa.checkout'], payments: [
      expect.objectContaining({ amount: 16335, method: 'cash', status: 'paid' }),
    ] }),
  ]);
  const refunds = await collide(`SELECT id FROM invoices WHERE id = '${sale.invoice_id}' FOR UPDATE`,
    '/api/v1/kassa/sales/' + sale.invoice_id + '/refund', { reason: 'Simultaneous isolated return', refund_method: 'cash' });
  expect(refunds.map(response => response.status()).sort()).toEqual([201, 422]);
  const creditResponse = refunds.find(response => response.status() === 201)!;
  const { credit_note_id } = await creditResponse.json();
  const creditPdf = await request.get('/api/v1/invoices/' + credit_note_id + '/pdf', { headers });
  expect(creditPdf.status(), await creditPdf.text()).toBe(200);
  expect(await creditPdf.json()).toMatchObject({ status: 'ready', signed_url: expect.any(String) });
  const credited = snapshot();
  expect(credited.stock).toBe(before.stock);
  expect(credited.invoices).toHaveLength(before.invoices.length + 2);
  expect(credited.invoices.find((row: { id: string }) => row.id === sale.invoice_id)).toMatchObject({
    status: 'credited', register_audit: ['kassa.checkout', 'kassa.refund'],
  });
  expect(credited.invoices.filter((row: { credited_invoice_id: string }) => row.credited_invoice_id === sale.invoice_id)).toEqual([
    expect.objectContaining({ total_amount: -16335, payments: [expect.objectContaining({ amount: -16335, method: 'cash' })] }),
  ]);
  fs.writeFileSync(testInfo.outputPath('mysql-race-evidence.json'), JSON.stringify({
    version: query('SELECT VERSION()'), lockWaitersPerRace: 2, before, sold, credited,
    checkoutStatuses: checkouts.map(response => response.status()), refundStatuses: refunds.map(response => response.status()),
  }, null, 2));
});
