import { expect, test, type Page } from '@playwright/test';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import nl from '../../src/i18n/messages/nl.json';

test.skip(!process.env.PORTAL_LIVE_RUNTIME, 'Requires the isolated portal runner.');

function responseFor(page: Page, method: string, path: RegExp) {
  return page.waitForResponse(response => response.request().method() === method && path.test(new URL(response.url()).pathname));
}

async function photo(page: Page, color: string, name: string) {
  const png = await page.evaluate(fill => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const context = canvas.getContext('2d')!;
    context.fillStyle = fill;
    context.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png').split(',')[1];
  }, color);
  return { name, mimeType: 'image/png', buffer: Buffer.from(png, 'base64') };
}

test('T25 browser booking, SMTP magic link, private boat replacement and Feed', async ({ page, baseURL }, testInfo) => {
  const email = process.env.PORTAL_LIVE_EMAIL!;
  const mailbox = process.env.PORTAL_LIVE_MAILBOX!;
  const boatName = 'Portal Journey Aquila';
  const notes = 'Inspect the starboard rail.';
  await page.goto('/nl/kraanafspraak');
  await page.getByPlaceholder('Jan', { exact: true }).fill('Portal Journey');
  await page.getByPlaceholder('jan@voorbeeld.nl').fill(email);
  await page.locator('#street').fill('Havenstraat');
  await page.locator('#house_number').fill('12 A');
  await page.locator('#postal_code').fill('6041 AB');
  await page.locator('#city').fill('Roermond');
  await page.getByPlaceholder('Aquila', { exact: true }).fill(boatName);
  await page.getByPlaceholder('890', { exact: true }).fill('890');
  await page.locator('#booking-notes').fill(notes);
  await page.locator('button.aspect-square:enabled').first().click();
  await page.getByRole('button', { name: /^\d\d:\d\d$/ }).first().click();
  await page.locator('input[type=file]').setInputFiles(await photo(page, '#17334d', 'booking.png'));
  const booking = responseFor(page, 'POST', /\/api\/v1\/booking$/);
  const upload = responseFor(page, 'POST', /\/api\/v1\/booking\/[^/]+\/photos$/);
  await page.getByRole('button', { name: nl.crane.submit, exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: nl.crane.submit, exact: true }).click();
  const booked = await booking;
  expect(booked.status()).toBe(201);
  const { appointment_id: appointmentId } = await booked.json();
  expect((await upload).ok()).toBe(true);
  await expect(page.getByRole('heading', { name: 'Uw aanvraag is verzonden' })).toBeVisible();
  await page.getByRole('link', { name: 'Bekijk uw afspraken' }).click();
  const destination = '/nl/dashboard/afspraken?appointment=' + appointmentId;
  await expect(page).toHaveURL(url => url.pathname === '/nl/login' && url.searchParams.get('returnTo') === destination);

  await page.getByRole('button', { name: nl.login.withoutPassword, exact: true }).click();
  await page.locator('#email').fill(email);
  const requested = responseFor(page, 'POST', /\/api\/v1\/auth\/customer\/magic-link$/);
  await page.locator('form button[type=submit]').click();
  expect((await requested).status()).toBe(200);
  await expect.poll(() => existsSync(mailbox)).toBe(true);
  const mime = readFileSync(mailbox, 'utf8').replace(/=\r\n/g, '')
    .replace(/=([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))).replace(/&amp;/g, '&');
  const link = mime.match(/https?:\/\/[^\s"<>]+\/portal\/verify\?[^\s"<>]+/)?.[0];
  // Keep the emailed credential out of assertion reports.
  expect(Boolean(link)).toBe(true);
  const callback = new URL(link!);
  expect(callback.origin).toBe(baseURL);
  expect(callback.searchParams.get('returnTo')).toBe(destination);
  const verified = responseFor(page, 'POST', /\/api\/v1\/auth\/customer\/verify-magic-link$/);
  await page.goto(callback.href);
  expect((await verified).ok()).toBe(true);
  await expect(page).toHaveURL(destination);
  await expect(page.getByRole('dialog')).toContainText(notes);

  const list = responseFor(page, 'GET', /\/api\/v1\/portal\/boats$/);
  await page.goto('/nl/dashboard/boten');
  const listed = await list;
  expect(listed.ok()).toBe(true);
  const boats = await listed.json();
  const boat = boats.find((item: { name: string }) => item.name === boatName);
  expect(boat?.photo_file_id).toBeTruthy();
  await expect(page.getByRole('img', { name: boatName })).toHaveAttribute('src', /^blob:/);
  await expect.poll(() => page.getByRole('img', { name: boatName }).evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  const anonymous = await page.request.get(boat.photo_url, { headers: { Accept: 'application/json' } });
  expect(anonymous.status()).toBe(401);

  await page.getByRole('button', { name: new RegExp(boatName) }).click();
  const replacement = responseFor(page, 'POST', /\/api\/v1\/portal\/boats\/[^/]+\/photo$/);
  await page.getByRole('dialog').locator('input[type=file]').setInputFiles(await photo(page, '#af4225', 'replacement.png'));
  const replaced = await replacement;
  expect(replaced.ok()).toBe(true);
  const updated = await replaced.json();
  expect(updated.photo_file_id).toBeTruthy();
  expect(updated.photo_file_id).not.toBe(boat.photo_file_id);

  const feedPhoto = responseFor(page, 'GET', new RegExp('/portal/boats/' + boat.id + '/photos/' + updated.photo_file_id + '$'));
  await page.goto('/nl/feed');
  await expect(page.getByText('Uw kraanaanvraag is ontvangen', { exact: true })).toBeVisible();
  expect((await feedPhoto).ok()).toBe(true);
  const feedEntry = page.getByRole('article').filter({ hasText: 'Uw kraanaanvraag is ontvangen' }).locator('..');
  const feedImage = feedEntry.getByRole('img', { name: boatName });
  await expect(feedImage).toHaveAttribute('src', /^blob:/);
  await expect.poll(() => feedImage.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  const color = await feedImage.evaluate((img: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d')!;
    context.drawImage(img, 0, 0, 1, 1);
    return Array.from(context.getImageData(0, 0, 1, 1).data.slice(0, 3));
  });
  expect(color.map((channel, index) => Math.abs(channel - [175, 66, 37][index])).every(delta => delta < 8)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('feed.png') });
  writeFileSync(join(process.env.PORTAL_LIVE_RUNTIME!, 'browser.json'), JSON.stringify({
    appointmentId, boatId: boat.id, originalPhotoId: boat.photo_file_id, replacementPhotoId: updated.photo_file_id,
  }));
});
