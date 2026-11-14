import { expect, test } from '@playwright/test';

test.skip(process.env.SERVICES_LOCAL !== '1', 'Requires the local Laravel API and approved tariff data');

test('public services use the live catalog for estimates, tariff rows and booking', async ({ page, request }, testInfo) => {
  await page.route('https://app.answer24.nl/**', (route) => route.abort());
  await page.setViewportSize({ width: 1200, height: 1312 });
  const catalog = await request.get('/api/v1/service-catalog/services?locale=nl-NL');
  expect(catalog.ok()).toBe(true);
  const { services } = await catalog.json();
  const categories = [
    { code: 'kranen', tab: 'Kranen', total: 100 },
    { code: 'afspuiten', tab: 'Afspuiten', total: 70 },
    { code: 'weekje-op-wal', tab: 'Weekje op wal', total: 315 },
    { code: 'winterstalling', tab: 'Winterstalling', total: 950 },
  ];
  const euros = (amount: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount);

  await page.goto('/nl/diensten');
  const calculator = page.locator('#prijsberekening');
  const length = calculator.getByRole('textbox', { name: 'Bootlengte (m)' });
  const table = page.getByRole('tabpanel');
  await expect(calculator).toContainText(euros(100));
  await expect(table.locator('tr[aria-current=true]')).toContainText('8 – 8,49 meter');
  await page.screenshot({ path: testInfo.outputPath('diensten-desktop.png') });

  for (const input of ['', '-8,20', 'abc', '100']) {
    await length.fill(input);
    await length.blur();
    await expect(length).toHaveAttribute('aria-invalid', 'true');
    await expect(table.locator('tr[aria-current=true]')).toHaveCount(0);
    await expect(calculator.getByRole('button', { name: 'Plan kraanbeurt' })).toHaveCount(0);
  }
  for (const input of ['8.20', '8,20']) {
    await length.fill(input);
    await expect(calculator).toContainText(euros(100));
  }

  await calculator.getByRole('button', { name: 'Afspuiten', exact: true }).click();
  await expect(calculator).toContainText(euros(170));
  const preview = await request.post('/api/v1/service-catalog/preview', {
    data: { length_cm: 820, service_codes: ['kranen', 'afspuiten'], options: { direction: 'out' } },
  });
  expect(preview.ok()).toBe(true);
  const quote = await preview.json();
  expect(quote.total_incl_vat).toBe(17000);
  await calculator.getByText('Prijsopbouw', { exact: true }).click();
  for (const line of quote.services) await expect(calculator.getByRole('definition').filter({ hasText: euros(line.price_incl_vat / 100) })).toBeVisible();
  await expect(calculator).toContainText(euros(quote.total_vat / 100));
  await calculator.getByText('Prijsopbouw', { exact: true }).click();

  for (const category of [...categories.slice(2), ...categories.slice(0, 2)]) {
    await page.locator('section').filter({ has: page.getByRole('heading', { level: 1 }) })
      .getByRole('button', { name: category.tab, exact: true }).click();
    await expect(calculator).toContainText(euros(category.total));
    const tab = page.getByRole('tab', { name: category.tab, exact: true });
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(table.getByRole('table')).toHaveCount(1);
    await expect(table.locator('tbody tr')).toHaveCount(services.find((service: { service_code: string }) => service.service_code === category.code).tariffs.length);
    await expect(table.locator('tr[aria-current=true]')).toContainText('8 – 8,49 meter');
  }

  await page.goto('/nl/diensten#prijzen-winterstalling');
  await page.reload();
  const winterTab = page.getByRole('tab', { name: 'Winterstalling', exact: true });
  await expect(winterTab).toHaveAttribute('aria-selected', 'true');
  await winterTab.press('Home');
  await expect(page.getByRole('tab', { name: 'Kranen', exact: true })).toBeFocused();
  await length.fill('17,00');
  await expect(calculator.getByText('Prijs op aanvraag', { exact: true })).toBeVisible();
  await expect(calculator.getByRole('link', { name: 'Vraag offerte aan' })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await length.fill('8,20');
  await expect(calculator).toContainText(euros(100));
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: testInfo.outputPath('diensten-mobile.png'), fullPage: true });
  await calculator.getByRole('button', { name: 'Plan kraanbeurt', exact: true }).click();
  await expect(page).toHaveURL(/\/nl\/kraanafspraak\?selection=[A-Za-z0-9]{64}$/);
  await expect(page.getByLabel('Lengte (cm)', { exact: true })).toHaveValue('820');
});

test('individual service routes use the same live tariffs', async ({ page }) => {
  await page.route('https://app.answer24.nl/**', (route) => route.abort());
  for (const [code, amount] of [['kranen', 100], ['afspuiten', 70], ['weekje-op-wal', 315], ['winterstalling', 950]] as const) {
    await page.goto(`/nl/diensten/${code}`);
    const calculator = page.locator('#prijsberekening');
    await calculator.getByRole('textbox', { name: 'Bootlengte (cm)' }).fill('820');
    await expect(calculator).toContainText(new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount));
    await expect(page.locator('tr[aria-current=true]')).toContainText('800–849 cm');
  }
});

test('public services render the calculator and capacity message in each supported locale', async ({ page }) => {
  await page.route('https://app.answer24.nl/**', (route) => route.abort());
  for (const [locale, message] of [['nl', 'Prijs op aanvraag'], ['en', 'Price on request'], ['de', 'Preis auf Anfrage'], ['fr', 'Prix sur demande']] as const) {
    await page.goto(`/${locale}/diensten`);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    const calculator = page.locator('#prijsberekening');
    await calculator.getByRole('textbox').fill('17.00');
    await expect(calculator.getByText(message, { exact: true })).toBeVisible();
    await expect(page.getByRole('tab')).toHaveCount(4);
  }
});
