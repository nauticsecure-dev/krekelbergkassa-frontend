#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Screenshot every key page on http://localhost:3030 at two viewports.
 *
 *   npm run screenshots
 *
 * Output:  ./screenshots/{desktop,mobile}/*.png
 *
 * Auth-protected portal/admin pages are visited after seeding a demo session
 * via localStorage + cookie so the auth-context recognises us as logged in.
 */

import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3030';
const LOCALE = process.env.LOCALE || 'nl';
const OUT = path.resolve('./screenshots');
const FILTER = process.env.FILTER ? new RegExp(process.env.FILTER, 'i') : null;

const PAGES = [
  // -------- Public site --------
  { slug: '01_home', path: '/' },
  { slug: '02_kraanafspraak', path: '/kraanafspraak' },
  { slug: '03_diensten', path: '/diensten' },
  { slug: '04_diensten_afspuiten', path: '/diensten/afspuiten' },
  { slug: '05_diensten_winterstalling', path: '/diensten/winterstalling' },
  { slug: '06_diensten_zelf-werken', path: '/diensten/zelf-werken' },
  { slug: '07_planning', path: '/planning' },
  { slug: '08_verkoop', path: '/verkoop' },
  { slug: '09_appartementen', path: '/appartementen' },
  { slug: '10_over_ons', path: '/over-ons' },
  { slug: '11_contact', path: '/contact' },
  { slug: '12_faq', path: '/faq' },
  { slug: '13_privacy', path: '/privacy' },
  { slug: '14_voorwaarden', path: '/voorwaarden' },
  { slug: '15_cookies', path: '/cookies' },

  // -------- Auth --------
  { slug: '20_login', path: '/login' },
  { slug: '21_signup', path: '/signup' },
  { slug: '22_forgot_password', path: '/forgot-password' },

  // -------- Customer portal (auth required) --------
  { slug: '30_dashboard', path: '/dashboard', auth: 'customer' },
  { slug: '31_feed', path: '/feed', auth: 'customer' },

  // -------- Admin (auth required) --------
  { slug: '40_admin_dashboard', path: '/admin', auth: 'admin' },
  { slug: '41_admin_kassa', path: '/admin/kassa', auth: 'admin' },
  { slug: '42_admin_stalling', path: '/admin/stalling', auth: 'admin' },
  { slug: '43_admin_audit', path: '/admin/audit', auth: 'admin' },
  { slug: '44_admin_contracten', path: '/admin/contracten', auth: 'admin' },
];

const VIEWPORTS = [
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
  { name: 'mobile', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true },
];

const DEMO_USERS = {
  customer: {
    id: 'demo-customer',
    name: 'Jan Jansen',
    email: 'jan@example.com',
    role: 'customer',
    avatarUrl: null,
  },
  admin: {
    id: 'demo-admin',
    name: 'Michael Schepenkring',
    email: 'admin@krekelberg.nl',
    role: 'admin',
    avatarUrl: null,
  },
};

async function main() {
  await fs.mkdir(path.join(OUT, 'desktop'), { recursive: true });
  await fs.mkdir(path.join(OUT, 'mobile'), { recursive: true });

  const browser = await chromium.launch();
  console.log(`▸ base: ${BASE}  locale: ${LOCALE}`);

  let total = 0;
  let ok = 0;
  let fail = 0;

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: vp.viewport,
      deviceScaleFactor: vp.deviceScaleFactor || 1,
      isMobile: !!vp.isMobile,
      hasTouch: !!vp.isMobile,
    });

    // Seed a demo session BEFORE any navigation so auth-context bootstraps logged-in
    await ctx.addCookies([
      {
        name: 'krek_locale',
        value: LOCALE,
        url: BASE,
        sameSite: 'Lax',
      },
    ]);

    for (const p of PAGES) {
      if (FILTER && !FILTER.test(p.slug)) continue;
      total++;
      const url = BASE + (p.path === '/' ? `/${LOCALE}` : `/${LOCALE}${p.path}`);
      const dest = path.join(OUT, vp.name, `${p.slug}.png`);

      const page = await ctx.newPage();
      try {
        // Inject demo session if this page requires auth
        if (p.auth) {
          await page.addInitScript(
            ({ user, role }) => {
              try {
                document.cookie = `krek_session=demo::${role}::${Date.now()}; path=/; max-age=86400`;
                localStorage.setItem('krek_demo_user', JSON.stringify(user));
              } catch {}
            },
            { user: DEMO_USERS[p.auth], role: p.auth }
          );
        }

        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        // Allow lazy animations / fonts / images to settle
        await page.waitForTimeout(550);
        await page.screenshot({
          path: dest,
          fullPage: true,
        });
        ok++;
        process.stdout.write(`  ✓ ${vp.name.padEnd(7)} ${p.slug}\n`);
      } catch (err) {
        fail++;
        process.stdout.write(`  ✗ ${vp.name.padEnd(7)} ${p.slug} — ${err.message}\n`);
      } finally {
        await page.close();
      }
    }

    await ctx.close();
  }

  await browser.close();
  console.log(`\nDone. ${ok}/${total} captured · ${fail} failed.`);
  console.log(`Output: ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
