import { test, expect } from '@playwright/test';

test('booking renders a newly configured catalog service without a frontend service list', async ({ page }) => {
  let bookingAudience = false;
  let catalogDate: string | null = null;
  await page.route('**/api/v1/booking/calendar**', async (route) => {
    await route.fulfill({ json: { days: [] } });
  });
  await page.route('**/api/v1/booking/slots**', async (route) => {
    await route.fulfill({ json: { is_open: true, duration_minutes: 30, slots: ['09:00'] } });
  });
  await page.route('**/api/v1/service-catalog/services**', async (route) => {
    const url = new URL(route.request().url());
    bookingAudience = url.searchParams.get('audience') === 'booking';
    catalogDate = url.searchParams.get('date');
    await route.fulfill({ json: { services: [{
      code: 'NEW-SERVICE', service_code: 'new-service', name: 'Nieuwe catalogusdienst',
      visibility: { booking: true, public: false },
      tariffs: [{ range_from_cm: 0, range_to_cm: 99999, price_type: 'fixed', price_incl_vat: 12100 }],
    }] } });
  });
  await page.route('**/api/v1/booking/preview', async (route) => {
    const body = route.request().postDataJSON();
    expect(body.service_codes).toEqual(['new-service']);
    await route.fulfill({ json: {
      total_incl_vat: 12100, total_duration_minutes: 30,
      requires_manual_price: false, requires_on_request: false,
      services: [{ service_code: 'new-service', price_incl_vat: 12100, duration_minutes: 30, is_manual: false, is_on_request: false }],
    } });
  });
  await page.goto('/nl/kraanafspraak');
  const service = page.getByRole('button', { name: /Nieuwe catalogusdienst/ });
  await expect(service).toBeVisible();
  expect(bookingAudience).toBe(true);
  await page.getByLabel('Lengte (cm)', { exact: true }).fill('800');
  const preview = page.waitForResponse((response) => response.url().includes('/booking/preview') && response.request().postDataJSON().service_codes.includes('new-service'));
  await service.click();
  await preview;
  await expect(service).toContainText('121,00');
  await page.getByRole('button', { name: 'Volgende maand', exact: true }).click();
  const datedQuote = page.waitForResponse((response) => response.url().includes('/booking/preview') && Boolean(response.request().postDataJSON().date));
  await page.locator('button:not([disabled])').filter({ hasText: /^1$/ }).click();
  const response = await datedQuote;
  const date = response.request().postDataJSON().date;
  expect(date).toMatch(/^\d{4}-\d{2}-01$/);
  await expect.poll(() => catalogDate).toBe(date);
});
