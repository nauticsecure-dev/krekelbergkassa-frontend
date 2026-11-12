import { expect, test } from '@playwright/test';

test('guest estimates use live tariffs and carry the selected services into booking', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1350 });
  await page.goto('/nl/diensten');
  const calculator = page.locator('#prijsberekening');
  const length = calculator.getByRole('textbox', { name: 'Bootlengte (cm)' });
  const wash = calculator.getByRole('button', { name: /afspuiten/i });
  await expect(wash).toBeEnabled();

  await length.fill('-8');
  await expect(length).toHaveAttribute('aria-invalid', 'true');
  await length.fill('8,20');
  await expect(length).toHaveAttribute('aria-invalid', 'true');
  await length.fill('820');
  await expect(calculator.getByText('= 8,20 meter')).toBeVisible();
  await expect(calculator.locator('[aria-live]').getByText(/€\s*100,00/)).toBeVisible();
  await wash.click();
  await expect(calculator.getByText(/€\s*170,00/)).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(1);
  await expect(page.locator('tr[aria-current=true]')).toContainText('800–849 cm');

  const washTab = page.getByRole('tab', { name: /afspuiten/i });
  await washTab.focus();
  await washTab.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /weekje/i })).toHaveAttribute('aria-selected', 'true');
  for (const tab of await page.getByRole('tab').all()) {
    await tab.click();
    expect(await page.getByRole('table').locator('tbody tr').count()).toBeGreaterThanOrEqual(26);
  }
  await page.getByRole('tab').first().click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('services-desktop.png') });
  await calculator.getByRole('button', { name: 'Plan kraanbeurt' }).click();
  await expect(page).toHaveURL(/kraanafspraak/);
  expect([...new URL(page.url()).searchParams.keys()]).toEqual(['selection']);
  await expect(page.getByRole('textbox', { name: /lengte \(cm\)/i })).toHaveValue('820');
});

test('mobile pricing tabs support direct links and fit the viewport', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/nl/diensten#prijzen-winterstalling');
  await expect(page.getByRole('tab', { name: /winterstalling/i })).toHaveAttribute('aria-selected', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const calculator = page.locator('#prijsberekening');
  await expect(calculator.getByRole('button', { name: /afspuiten/i })).toBeEnabled();
  await calculator.getByRole('textbox', { name: 'Bootlengte (cm)' }).fill('820');
  await expect(calculator.locator('[aria-live]').getByText(/€\s*100,00/)).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('services-mobile.png'), fullPage: true });
});

test('individual service pages use the same live catalog and quote', async ({ page }) => {
  test.setTimeout(180_000);
  for (const slug of ['kranen', 'afspuiten', 'weekje-op-wal', 'winterstalling']) {
    await page.goto('/nl/diensten/' + slug);
    const table = page.getByRole('table');
    await expect(table.locator('tbody tr').first()).toBeVisible({ timeout: 30_000 });
    const quoteResponse = page.waitForResponse((response) =>
      response.url().endsWith('/service-catalog/preview') && response.request().method() === 'POST',
    );
    await page.getByRole('textbox', { name: 'Bootlengte (cm)' }).fill('820');
    const response = await quoteResponse;
    expect(response.ok()).toBe(true);
    expect(response.request().postDataJSON()).toEqual({ length_cm: 820, service_codes: [slug] });
    const quote = await response.json();
    const total = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(quote.total_incl_vat / 100);
    await expect(page.locator('[aria-live="polite"]').getByText(total, { exact: true })).toBeVisible();
    await expect(table.locator('tr[aria-current=true]')).toHaveCount(1);
  }
});
