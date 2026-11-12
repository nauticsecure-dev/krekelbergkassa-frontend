import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';

const messages = JSON.parse(fs.readFileSync('src/i18n/messages/nl.json', 'utf8'));
const token = 'a'.repeat(64);

async function fixture(page: Page, editor = false, stale = false, portal = false) {
  const origin = test.info().project.use.baseURL!;
  if (editor) await page.context().addCookies([{ name: 'krek_session', value: 'smart-fixture', url: origin }]);
  const customer = { id: 'customer', name: 'Boat owner', email: 'owner@example.test' };
  const boat = { id: 'fixture-boat', name: 'Aquila', length_cm: 835, width_cm: 310, weight_kg: 5600 };
  if (portal) await page.context().addCookies([{ name: 'krek_portal_session', value: 'portal-fixture', url: origin }]);
  const services = [
    ['KRANEN', 'kranen', 'Kranen'], ['AFSPUITEN', 'afspuiten', 'Afspuiten'],
    ['WEEK-OP-WAL', 'weekje-op-wal', 'Weekje op wal'], ['STALL-WINTER', 'winterstalling', 'Winterstalling'],
  ].map(([code, slug, name]) => ({
    id: slug, code, slug, service_code: slug, name, description: name + ' beschrijving', business_revision: 'b'.repeat(64),
    visibility: { public: true, booking: ['kranen', 'afspuiten'].includes(slug) },
    options: slug === 'kranen' ? { compatible_with: ['afspuiten'], max_operations: 2, directions: ['in', 'out', 'both'] }
      : slug === 'afspuiten' ? { compatible_with: ['kranen'], max_operations: 1 } : { compatible_with: [], period: 'season' },
    tariffs: [{ id: slug + '-rule', revision: 1, range_from_cm: 0, range_to_cm: 99999, price_type: 'fixed', price_incl_vat: 12100, price_excl_vat: 10000, vat_rate: 21, display_price: '€ 121', is_on_request: false }],
  }));
  let selection: any;
  const staged: any[] = []; const business: any[] = []; const requests: any[] = [];
  const catalogDates: (string | null)[] = []; const previews: any[] = []; const bookings: any[] = [];
  let publishes = 0;
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const path = url.pathname;
    if (path.endsWith('/auth/me')) return route.fulfill({ status: editor ? 200 : 401, json: editor ? {
      id: 'editor', name: 'Editor', email: 'editor@example.test', role: 'super_admin', permissions: ['cms.manage', 'pricing.view', 'pricing.update', 'products.write', 'products.view'],
    } : {} });
    if (path.endsWith('/portal/me')) return route.fulfill({ json: { customer } });
    if (path.endsWith('/portal/boats')) return route.fulfill({ json: [boat] });
    if (path.endsWith('/service-catalog/services')) { catalogDates.push(url.searchParams.get('date')); return route.fulfill({ json: { services } }); }
    if (path.endsWith('/service-catalog/pages/kranen')) return route.fulfill({ json: { page: { slug: 'kranen' }, services: [services[0]] } });
    if (path.endsWith('/service-catalog/version')) return route.fulfill({ json: { version: String(publishes) } });
    if (path.endsWith('/cms/page-content')) return route.fulfill({ json: { content_blocks: [], media_blocks: [] } });
    if (path.endsWith('/service-catalog/preview') || path.endsWith('/booking/preview')) {
      const body = route.request().postDataJSON();
      previews.push(body);
      const lines = body.service_codes.map((code: string) => ({ service_code: code, product_id: code, rule_id: code + '-rule', quantity: body.options?.quantities?.[code] ?? 1, price_incl_vat: (services.find((s) => s.service_code === code)?.tariffs[0].price_incl_vat ?? 0) * (body.options?.quantities?.[code] ?? 1), duration_minutes: 30, is_manual: false, is_on_request: false }));
      return route.fulfill({ json: { services: lines, total_incl_vat: lines.reduce((sum: number, line: any) => sum + line.price_incl_vat, 0), total_vat: 2100, total_duration_minutes: 30, requires_manual_price: false, requires_on_request: false } });
    }
    if (path.endsWith('/service-catalog/booking-selections')) {
      const body = route.request().postDataJSON();
      selection = { ...body, selected_date: body.date, total_incl_vat: body.service_codes.reduce((sum: number, code: string) => sum + 12100 * (body.options?.quantities?.[code] ?? 1), 0), pricing_version: 'version-one', journey: body.service_codes.includes('winterstalling') ? 'storage-request' : 'appointment' };
      return route.fulfill({ status: 201, json: { token, journey: selection.journey } });
    }
    if (path.endsWith('/booking-selections/' + token)) return route.fulfill({ json: selection });
    if (path.endsWith('/service-catalog/requests')) { requests.push(route.request().postDataJSON()); return route.fulfill({ status: 201, json: { reference: 'SR-fixture' } }); }
    if (path.match(/\/products\/[^/]+\/business$/)) { business.push(route.request().postDataJSON()); Object.assign(services[0], { name: business.at(-1).name }); return route.fulfill({ json: {} }); }
    if (path.endsWith('/pricing/rules/kranen-rule') && route.request().method() === 'PATCH') { staged.push(route.request().postDataJSON()); return route.fulfill({ json: { draft_id: 'draft-one' } }); }
    if (path.endsWith('/pricing/drafts/draft-one')) return route.fulfill({ json: {
      draft: { id: 'draft-one', change_reason: 'Nieuwe afspraak' }, current: { price_incl_vat: 12100 }, proposed: { price_incl_vat: 24200 }, stale,
      impact: { direct_displays: ['/diensten'], derived_calculations: ['booking', 'kassa'], package_consumers: [{ name: 'Weekje op wal' }], historical_snapshots_change: false },
    } });
    if (path.endsWith('/pricing/drafts/draft-one/publish')) {
      publishes++;
      Object.assign(services[0].tariffs[0], { price_incl_vat: 24200, display_price: '€ 242', revision: 2 });
      return route.fulfill({ json: {} });
    }
    if (path.endsWith('/booking/calendar')) return route.fulfill({ json: { days: [] } });
    if (path.endsWith('/booking/slots')) return route.fulfill({ json: { is_open: true, slots: ['09:00'], duration_minutes: 30 } });
    if (path.endsWith('/booking') && route.request().method() === 'POST') {
      bookings.push(route.request().postDataJSON());
      return route.fulfill({ status: 201, json: { appointment_id: 'appointment-fixture', status: 'pending' } });
    }
    return route.fulfill({ json: { data: [], settings: {}, items: [] } });
  });
  return { services, staged, business, requests, catalogDates, previews, bookings, boat, get selection() { return selection; }, get publishes() { return publishes; } };
}

test('T26 expandable cards retain compatible choices, centimetres and keyboard tariff tabs', async ({ page }) => {
  const state = await fixture(page); await page.goto('/nl/diensten');
  const calc = page.locator('#prijsberekening');
  await calc.getByLabel(messages.yardPricing.lengthCm, { exact: true }).fill('820');
  await calc.getByRole('button', { name: 'Afspuiten', exact: true }).click();
  await expect(calc.getByRole('button', { name: 'Kranen', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await expect(calc.getByRole('button', { name: 'Afspuiten', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await expect(calc).toContainText('242,00');
  await calc.getByRole('button', { name: 'Winterstalling', exact: true }).click();
  await expect(calc.getByLabel(messages.yardPricing.lengthCm, { exact: true })).toHaveValue('820');
  await expect(calc.getByRole('button', { name: 'Afspuiten', exact: true })).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('tab', { name: 'Winterstalling', exact: true }).focus();
  await page.keyboard.press('Home');
  await expect(page.getByRole('tab', { name: 'Kranen', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('tr[aria-current=true]')).toHaveCount(1);
  await calc.getByLabel(messages.yardPricing.lengthUnit).selectOption('m');
  const metres = calc.getByLabel(messages.yardPricing.lengthMetres, { exact: true });
  await metres.fill('8,21');
  await expect.poll(() => state.previews.at(-1)?.length_cm).toBe(821);
  await metres.fill('8.20');
  await expect.poll(() => state.previews.at(-1)?.length_cm).toBe(820);
  await calc.getByLabel(messages.smartServices.pricingDate).fill('2027-01-01');
  await expect.poll(() => state.catalogDates.at(-1)).toBe('2027-01-01');
  await expect.poll(() => state.previews.at(-1)?.date).toBe('2027-01-01');
  await calc.screenshot({ path: test.info().outputPath('desktop-calculator.png') });
});

test('T27 crane booking sends an opaque token and preserves the two-operation selection', async ({ page }) => {
  const state = await fixture(page); await page.goto('/nl/diensten'); const calc = page.locator('#prijsberekening');
  await calc.getByLabel(messages.yardPricing.lengthCm, { exact: true }).fill('820');
  await calc.getByLabel(messages.smartServices.direction).selectOption('both');
  await expect(calc).toContainText('242,00');
  await calc.getByLabel(messages.smartServices.pricingDate).fill('2027-01-01');
  await calc.getByText(messages.smartServices.dimensions, { exact: true }).click();
  await calc.getByLabel(messages.smartServices.width, { exact: true }).fill('350');
  await calc.getByLabel(messages.smartServices.weight, { exact: true }).fill('10000');
  await calc.getByRole('button', { name: messages.nav.bookCrane, exact: true }).click();
  await expect(page).toHaveURL(new RegExp('/nl/kraanafspraak\\?selection=' + token + '$'));
  expect(state.selection.options.quantities.kranen).toBe(2);
  await expect(page.getByLabel('Lengte (cm)', { exact: true })).toHaveValue('820');
  await expect(page.getByLabel('Breedte (cm)', { exact: true })).toHaveValue('350');
  await expect(page.getByLabel('Gewicht (kg)', { exact: true })).toHaveValue('10000');
  await expect.poll(() => state.previews.at(-1)?.date).toBe('2027-01-01');
  await page.getByPlaceholder('Jan', { exact: true }).fill('Testklant');
  await page.getByPlaceholder('jan@voorbeeld.nl').fill('test@example.test');
  await page.locator('#street').fill('Teststraat');
  await page.locator('#house_number').fill('12');
  await page.locator('#postal_code').fill('6041 AB');
  await page.locator('#city').fill('Roermond');
  await page.getByRole('button', { name: '09:00', exact: true }).click();
  await page.getByRole('button', { name: messages.crane.submit, exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: messages.crane.submit, exact: true }).click();
  await expect.poll(() => state.bookings[0]).toMatchObject({
    boat: { length_m: 8.2, weight_kg: 10000 }, service_codes: ['kranen'],
    options: { direction: 'both', quantities: { kranen: 2 } }, expected_total_cents: 24200,
  });
});

test('signed-in boat dimensions are sent with the quote and restored in booking', async ({ page }) => {
  const state = await fixture(page, false, false, true);
  await page.goto('/nl/diensten#prijzen-afspuiten');
  await expect(page.getByRole('tab', { name: 'Afspuiten', exact: true })).toHaveAttribute('aria-selected', 'true');
  const calc = page.locator('#prijsberekening');
  await calc.getByLabel(messages.login.chooseBoat).selectOption(state.boat.id);
  await expect(calc.getByLabel(messages.yardPricing.lengthCm, { exact: true })).toHaveValue('835');
  await expect.poll(() => state.previews.at(-1)).toMatchObject({
    boat_id: state.boat.id, length_cm: 835, options: { width_cm: 310, weight_kg: 5600 },
  });
  await calc.getByRole('button', { name: messages.nav.bookCrane, exact: true }).click();
  await expect(page).toHaveURL(new RegExp('/nl/kraanafspraak\\?selection=' + token + '$'));
  expect(state.selection.boat_id).toBe(state.boat.id);
  await expect(page.getByLabel('Breedte (cm)', { exact: true })).toHaveValue('310');
  await expect(page.getByLabel('Gewicht (kg)', { exact: true })).toHaveValue('5600');
});

test('service details preserve the live selection when focus refreshes the catalog', async ({ page }) => {
  const state = await fixture(page);
  await page.goto('/nl/diensten/kranen');
  const calc = page.locator('#prijsberekening');
  const length = calc.getByLabel(messages.yardPricing.lengthCm, { exact: true });
  await length.fill('820');
  await expect(calc).toContainText('121,00');
  Object.assign(state.services[0].tariffs[0], { price_incl_vat: 14500, display_price: '€ 145', revision: 2 });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(length).toHaveValue('820');
  await expect(calc).toContainText('145,00');
  await expect(page.locator('tr[aria-current=true]')).toContainText('€ 145');
});

test('T28 canonical inline edits and exact-rule return links use publication preview', async ({ page }) => {
  const state = await fixture(page, true); await page.goto('/nl/diensten');
  await page.getByRole('button', { name: messages.cms.enterEdit, exact: true }).click();
  const calc = page.locator('#prijsberekening');
  await calc.getByLabel(messages.yardPricing.lengthCm, { exact: true }).fill('820');
  await expect(calc).toContainText('121,00');
  await calc.getByRole('button', { name: messages.smartServices.editService, exact: true }).click();
  const editor = calc.locator('form');
  await editor.getByLabel(messages.smartServices.name, { exact: true }).fill('Kranen aangepast');
  await editor.getByLabel(messages.smartServices.reason, { exact: true }).fill('Nieuwe naam');
  await editor.getByRole('button', { name: messages.adminNew.common.save, exact: true }).click();
  await expect.poll(() => state.business.length).toBe(1);
  expect(state.business[0]).toMatchObject({ expected_revision: 'b'.repeat(64), locale: 'nl-NL', name: 'Kranen aangepast' });
  const table = page.getByRole('tabpanel');
  const exact = table.getByRole('link', { name: messages.yardPricing.fullEdit });
  await expect(exact).toHaveAttribute('href', /rule_id=kranen-rule&return_to=%2Fnl%2Fdiensten/);
  await table.getByRole('button', { name: messages.smartServices.editTariff }).click();
  await table.getByLabel(messages.globalUx.pricing.priceEuro, { exact: true }).fill('242');
  await table.getByLabel(messages.smartServices.reason, { exact: true }).fill('Nieuwe afspraak');
  await table.getByRole('button', { name: messages.smartServices.saveDraft, exact: true }).click();
  await expect(table).toContainText('booking, kassa');
  expect(state.publishes).toBe(0);
  await table.getByRole('button', { name: messages.smartServices.publish, exact: true }).click();
  await expect.poll(() => state.publishes).toBe(1);
  await expect(table.locator('tr[aria-current=true]')).toContainText('€ 242');
  await expect(calc).toContainText('242,00');
  expect(state.staged[0]).toMatchObject({ expected_revision: 1, price_incl_vat: 24200, price_excl_vat: 20000, change_reason: 'Nieuwe afspraak' });
});

test('T29 stale tariff drafts disable publication and explain the conflict', async ({ page }) => {
  const state = await fixture(page, true, true); await page.goto('/nl/diensten');
  await page.getByRole('button', { name: messages.cms.enterEdit, exact: true }).click();
  const table = page.getByRole('tabpanel');
  await table.getByRole('button', { name: messages.smartServices.editTariff }).click();
  await table.getByLabel(messages.smartServices.reason, { exact: true }).fill('Nieuwe afspraak');
  await table.getByRole('button', { name: messages.smartServices.saveDraft, exact: true }).click();
  await expect(table.getByRole('alert')).toContainText(messages.smartServices.stale);
  await expect(table.getByRole('button', { name: messages.smartServices.publish })).toBeDisabled();
  expect(state.publishes).toBe(0);
});

test('T30 mobile storage journey preserves dates through request submission', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); const state = await fixture(page);
  await page.goto('/nl/diensten'); const calc = page.locator('#prijsberekening');
  await calc.getByRole('button', { name: 'Winterstalling', exact: true }).click();
  await calc.getByLabel(messages.yardPricing.lengthCm, { exact: true }).fill('820');
  await calc.getByLabel(messages.smartServices.periodFrom).fill('2026-11-10');
  await calc.getByLabel(messages.smartServices.periodTo).fill('2027-04-01');
  await calc.screenshot({ path: test.info().outputPath('mobile-calculator.png') });
  await calc.getByRole('button', { name: messages.yardPricing.requestStorage, exact: true }).click();
  await expect(page).toHaveURL(new RegExp('/nl/diensten/aanvraag\\?selection=' + token + '$'));
  expect(state.selection.options.period_to).toBe('2027-04-01');
  await page.getByLabel(messages.smartServices.name, { exact: true }).fill('Klant');
  await page.getByLabel(messages.smartServices.email, { exact: true }).fill('klant@example.test');
  await page.getByLabel(messages.smartServices.boatName, { exact: true }).fill('Mijn boot');
  await page.getByRole('button', { name: messages.smartServices.sendRequest }).click();
  await expect(page.getByRole('status').filter({ hasText: 'SR-fixture' })).toBeVisible();
  expect(state.requests[0]).toMatchObject({ token, expected_total_cents: 12100, boat_name: 'Mijn boot' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
