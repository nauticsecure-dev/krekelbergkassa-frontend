# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-review.spec.ts >> populated kassa POS, analytics charts and address grids stay inside the viewport [sidebar expanded]
- Location: tests\browser\admin-review.spec.ts:157:5

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: locator.click: Test timeout of 180000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /Winkelmand/ })

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - generic [ref=e4]:
        - generic "Krekelberg Nautic" [ref=e5]:
          - img "Krekelberg Nautic logo" [ref=e7]
          - generic [ref=e8]:
            - generic [ref=e9]: KREKELBERG
            - generic [ref=e10]: Nautic · Jachtmakelaar
        - button "Zijbalk inklappen" [expanded] [ref=e11] [cursor=pointer]:
          - img [ref=e12]
      - navigation [ref=e14]:
        - link "Overzicht" [ref=e15] [cursor=pointer]:
          - /url: /nl/admin
          - img [ref=e16]
          - generic [ref=e19]: Overzicht
        - link "Planning" [ref=e20] [cursor=pointer]:
          - /url: /nl/admin/planning
          - img [ref=e21]
          - generic [ref=e23]: Planning
        - link "Kassa" [ref=e24] [cursor=pointer]:
          - /url: /nl/admin/kassa
          - img [ref=e26]
          - generic [ref=e30]: Kassa
        - link "Stalling" [ref=e31] [cursor=pointer]:
          - /url: /nl/admin/stalling
          - img [ref=e32]
          - generic [ref=e35]: Stalling
        - link "Klanten" [ref=e36] [cursor=pointer]:
          - /url: /nl/admin/klanten
          - img [ref=e37]
          - generic [ref=e42]: Klanten
        - link "Boten" [ref=e43] [cursor=pointer]:
          - /url: /nl/admin/boten
          - img [ref=e44]
          - generic [ref=e48]: Boten
        - link "Makelaardij" [ref=e49] [cursor=pointer]:
          - /url: /nl/admin/makelaardij
          - img [ref=e50]
          - generic [ref=e53]: Makelaardij
        - link "Financieel" [ref=e54] [cursor=pointer]:
          - /url: /nl/admin/financieel
          - img [ref=e55]
          - generic [ref=e58]: Financieel
        - link "Diensten & Prijzen" [ref=e59] [cursor=pointer]:
          - /url: /nl/admin/diensten-prijzen
          - img [ref=e60]
          - generic [ref=e64]: Diensten & Prijzen
        - link "Beheer" [ref=e65] [cursor=pointer]:
          - /url: /nl/admin/beheer
          - img [ref=e66]
          - generic [ref=e69]: Beheer
        - link "Systeembeheer" [ref=e70] [cursor=pointer]:
          - /url: /nl/admin/systeem
          - img [ref=e71]
          - generic [ref=e73]: Systeembeheer
        - link "Help & ondersteuning" [ref=e75] [cursor=pointer]:
          - /url: /nl/faq
          - img [ref=e76]
          - generic [ref=e79]: Help & ondersteuning
      - generic [ref=e81]:
        - generic [ref=e82]: AR
        - generic [ref=e83]:
          - generic [ref=e84]: Audit Reviewer
          - generic [ref=e85]: review@example.test
        - button "Uitloggen" [ref=e86] [cursor=pointer]:
          - img [ref=e87]
    - generic [ref=e90]:
      - generic [ref=e92]:
        - button "Zoeken… ⌘K" [ref=e93] [cursor=pointer]:
          - img [ref=e94]
          - generic [ref=e97]: Zoeken…
          - generic [ref=e98]: ⌘K
        - generic [ref=e99]:
          - button "Nieuw" [ref=e101] [cursor=pointer]:
            - img [ref=e102]
            - generic [ref=e103]: Nieuw
          - link "Website bekijken" [ref=e104] [cursor=pointer]:
            - /url: /nl
            - generic [ref=e105]:
              - img [ref=e106]
              - generic [ref=e109]: Website bekijken
          - button "nl" [ref=e111] [cursor=pointer]:
            - img [ref=e112]
            - generic [ref=e116]: nl
            - img [ref=e117]
          - link "Online" [ref=e119] [cursor=pointer]:
            - /url: /nl/admin/sync
            - generic [ref=e120]:
              - img [ref=e122]
              - text: Online
          - button "Meldingen" [ref=e126] [cursor=pointer]:
            - img [ref=e127]
          - button "AR" [ref=e131] [cursor=pointer]:
            - generic [ref=e132]: AR
            - img [ref=e133]
      - main [ref=e135]:
        - generic [ref=e137]:
          - generic [ref=e138]:
            - generic [ref=e139]:
              - heading "Kassa" [level=1] [ref=e140]
              - paragraph [ref=e141]: Audit Reviewer
            - navigation [ref=e142]:
              - link "Alle verkopen" [ref=e143] [cursor=pointer]:
                - /url: /nl/admin/verkopen
              - link "Kassa analytics" [ref=e144] [cursor=pointer]:
                - /url: /nl/admin/kassa/analytics
              - link "Instellingen" [ref=e145] [cursor=pointer]:
                - /url: /nl/admin/instellingen#payments
          - generic [ref=e146]:
            - generic [ref=e147]:
              - generic [ref=e148]:
                - generic [ref=e149]:
                  - img
                  - searchbox "Zoek boot, klant, product of barcode…" [ref=e150]
                - button "Scan" [ref=e151] [cursor=pointer]:
                  - img [ref=e153]
                  - generic [ref=e158]: Scan
              - generic [ref=e159]:
                - generic [ref=e160]:
                  - generic [ref=e161]:
                    - generic [ref=e162]:
                      - heading "Bavaria 37" [level=2] [ref=e163]
                      - paragraph [ref=e164]: BAV-037
                    - generic [ref=e165]:
                      - generic [ref=e166]:
                        - term [ref=e167]: Lengte
                        - definition [ref=e168]: 11,35 m (1.135 cm)
                      - generic [ref=e169]:
                        - term [ref=e170]: Breedte
                        - definition [ref=e171]: 3,8 m (380 cm)
                      - generic [ref=e172]:
                        - term [ref=e173]: Diepgang
                        - definition [ref=e174]: 1,9 m (190 cm)
                    - paragraph [ref=e175]: Hans Müller
                  - generic [ref=e176]:
                    - button "Klant selecteren" [ref=e177] [cursor=pointer]:
                      - generic [ref=e178]: Klant selecteren
                    - button "Boot kiezen" [ref=e179] [cursor=pointer]:
                      - generic [ref=e180]: Boot kiezen
                - region "Producten" [ref=e181]:
                  - generic [ref=e182]:
                    - button "Alle" [pressed] [ref=e183] [cursor=pointer]:
                      - img [ref=e184]
                      - text: Alle
                    - button "Snel kiezen" [ref=e187] [cursor=pointer]:
                      - img [ref=e188]
                      - text: Snel kiezen
                    - button "Werfdiensten" [ref=e190] [cursor=pointer]:
                      - img [ref=e191]
                      - text: Werfdiensten
                    - button "Stalling" [ref=e195] [cursor=pointer]:
                      - img [ref=e196]
                      - text: Stalling
                    - button "Onderhoud" [ref=e199] [cursor=pointer]:
                      - img [ref=e200]
                      - text: Onderhoud
                  - generic [ref=e202]:
                    - generic [ref=e203]:
                      - button "Kranen uit het water Prijs berekenen" [ref=e204] [cursor=pointer]:
                        - img [ref=e205]
                        - generic [ref=e208]: Kranen uit het water
                        - generic [ref=e209]: Prijs berekenen
                      - button "Favoriet wisselen · Kranen uit het water" [pressed] [ref=e210] [cursor=pointer]:
                        - img [ref=e211]
                    - generic [ref=e213]:
                      - button "Romp afspuiten Prijs berekenen" [ref=e214] [cursor=pointer]:
                        - img [ref=e215]
                        - generic [ref=e218]: Romp afspuiten
                        - generic [ref=e219]: Prijs berekenen
                      - button "Favoriet wisselen · Romp afspuiten" [pressed] [ref=e220] [cursor=pointer]:
                        - img [ref=e221]
                    - generic [ref=e223]:
                      - button "Weekje op wal Prijs berekenen" [ref=e224] [cursor=pointer]:
                        - img [ref=e225]
                        - generic [ref=e229]: Weekje op wal
                        - generic [ref=e230]: Prijs berekenen
                      - button "Favoriet wisselen · Weekje op wal" [pressed] [ref=e231] [cursor=pointer]:
                        - img [ref=e232]
                    - generic [ref=e234]:
                      - button "Winterstalling Prijs berekenen" [ref=e235] [cursor=pointer]:
                        - img [ref=e236]
                        - generic [ref=e239]: Winterstalling
                        - generic [ref=e240]: Prijs berekenen
                      - button "Favoriet wisselen · Winterstalling" [pressed] [ref=e241] [cursor=pointer]:
                        - img [ref=e242]
                    - generic [ref=e244]:
                      - button "Zomerstalling Prijs berekenen" [ref=e245] [cursor=pointer]:
                        - img [ref=e246]
                        - generic [ref=e249]: Zomerstalling
                        - generic [ref=e250]: Prijs berekenen
                      - button "Favoriet wisselen · Zomerstalling" [pressed] [ref=e251] [cursor=pointer]:
                        - img [ref=e252]
                    - generic [ref=e254]:
                      - button "Onderhoud Prijs berekenen" [ref=e255] [cursor=pointer]:
                        - img [ref=e256]
                        - generic [ref=e258]: Onderhoud
                        - generic [ref=e259]: Prijs berekenen
                      - button "Favoriet wisselen · Onderhoud" [pressed] [ref=e260] [cursor=pointer]:
                        - img [ref=e261]
                    - generic [ref=e263]:
                      - button "Superlange-Winterstalling-Klantnaam-Met-Extra-Segmenten-Voor-Overflow-Controle Producttegel € 242,00" [active] [ref=e264] [cursor=pointer]:
                        - img [ref=e265]
                        - generic [ref=e268]: Superlange-Winterstalling-Klantnaam-Met-Extra-Segmenten-Voor-Overflow-Controle Producttegel
                        - generic [ref=e269]: € 242,00
                      - button "Favoriet wisselen · Superlange-Winterstalling-Klantnaam-Met-Extra-Segmenten-Voor-Overflow-Controle Producttegel" [pressed] [ref=e270] [cursor=pointer]:
                        - img [ref=e271]
            - complementary [ref=e273]:
              - generic [ref=e274]:
                - heading "Winkelmand (2)" [level=2] [ref=e275]
                - button "Winkelwagen legen" [ref=e277] [cursor=pointer]:
                  - generic [ref=e278]: Winkelwagen legen
              - paragraph [ref=e279]: Hans Müller
              - generic [ref=e280]:
                - generic [ref=e281]:
                  - generic [ref=e282]:
                    - paragraph [ref=e283]: Kranen uit het water · 1135 cm
                    - paragraph [ref=e284]: Bavaria 37
                    - button "Bewerken" [ref=e285] [cursor=pointer]
                    - paragraph [ref=e286]: € 200,00 · BTW (21%)
                    - generic [ref=e287]:
                      - button "Aantal verlagen" [ref=e288] [cursor=pointer]: −
                      - generic [ref=e289]: "1"
                      - button "Aantal verhogen" [ref=e290] [cursor=pointer]: +
                  - generic [ref=e291]:
                    - paragraph [ref=e292]: € 242,00
                    - button "Verwijder Kranen uit het water · 1135 cm" [ref=e293] [cursor=pointer]:
                      - img [ref=e294]
                - generic [ref=e297]:
                  - generic [ref=e298]:
                    - paragraph [ref=e299]: Superlange-Winterstalling-Klantnaam-Met-Extra-Segmenten-Voor-Overflow-Controle Producttegel
                    - paragraph [ref=e300]: € 200,00 · BTW (21%)
                    - generic [ref=e301]:
                      - button "Aantal verlagen" [ref=e302] [cursor=pointer]: −
                      - generic [ref=e303]: "1"
                      - button "Aantal verhogen" [ref=e304] [cursor=pointer]: +
                  - generic [ref=e305]:
                    - paragraph [ref=e306]: € 242,00
                    - button "Verwijder Superlange-Winterstalling-Klantnaam-Met-Extra-Segmenten-Voor-Overflow-Controle Producttegel" [ref=e307] [cursor=pointer]:
                      - img [ref=e308]
              - generic [ref=e311]:
                - generic [ref=e312]:
                  - generic [ref=e313]: Totaal excl.
                  - generic [ref=e314]: € 400,00
                - group [ref=e315]:
                  - generic "BTW · € 84,00" [ref=e316] [cursor=pointer]
                - generic [ref=e317]:
                  - generic [ref=e318]: Totaal incl. btw
                  - generic [ref=e319]: € 484,00
                - button "Afrekenen € 484,00" [ref=e320] [cursor=pointer]:
                  - img [ref=e322]
                  - generic [ref=e324]: Afrekenen € 484,00
                - button "Opmerking toevoegen" [ref=e325] [cursor=pointer]:
                  - generic [ref=e326]: Opmerking toevoegen
  - alert [ref=e327]
```

# Test source

```ts
  144 |   if (await toggle.getAttribute('aria-expanded') !== String(state === 'expanded')) await toggle.click();
  145 |   await expect(toggle).toHaveAttribute('aria-expanded', String(state === 'expanded'));
  146 | }
  147 | 
  148 | async function captureWidths(page: Page, testInfo: { outputPath: (name: string) => string }, prefix: string, widths = [390, 1280, 1536]) {
  149 |   for (const width of widths) {
  150 |     await page.setViewportSize({ width, height: 1000 });
  151 |     await assertNoPageOverflow(page);
  152 |     await page.screenshot({ path: testInfo.outputPath(`${prefix}-${width}.png`), fullPage: true });
  153 |   }
  154 | }
  155 | 
  156 | for (const sidebar of ['expanded', 'collapsed'] as const) {
  157 | test(`populated kassa POS, analytics charts and address grids stay inside the viewport [sidebar ${sidebar}]`, async ({ page }, testInfo) => {
  158 |   const errors: string[] = [];
  159 |   page.on('pageerror', (error) => errors.push(error.message));
  160 |   await isolatedSession(page);
  161 |   const product = {
  162 |     id: 'prod-long',
  163 |     name: `${LONG} Producttegel`,
  164 |     code: 'LONG-PROD-001',
  165 |     price_incl_vat: 24200,
  166 |     price_excl_vat: 20000,
  167 |     active: true,
  168 |     is_favorite: true,
  169 |   };
  170 |   const services = ['Kranen uit het water', 'Romp afspuiten', 'Weekje op wal', 'Winterstalling', 'Zomerstalling', 'Onderhoud']
  171 |     .map((name, index) => ({
  172 |       ...product, id: 'service-' + index, code: 'SERVICE-' + index, name,
  173 |       category: index < 3 ? 'Werfdiensten' : index < 5 ? 'Stalling' : 'Onderhoud',
  174 |       price_excl_vat: 0, price_incl_vat: 0, pricing_type: 'length_range',
  175 |     }));
  176 |   await page.route('**/api/v1/products**', (route) => {
  177 |     if (route.request().method() !== 'GET') return route.fulfill({ status: 201, json: {} });
  178 |     return route.fulfill({ json: { data: [...services, product], meta: { total: 7, current_page: 1, last_page: 1 } } });
  179 |   });
  180 |   await page.route('**/api/v1/boats?**', (route) => route.fulfill({
  181 |     json: { data: [{ id: 'boat-1', name: 'Bavaria 37', customer_id: 'customer-1',
  182 |       length_cm: 1135, width_cm: 380, draft_cm: 190, registration_number: 'BAV-037',
  183 |       customer: { id: 'customer-1', name: 'Hans Müller' } }] },
  184 |   }));
  185 |   await page.route('**/api/v1/kassa/analytics**', (route) => route.fulfill({
  186 |     json: {
  187 |       totals: { turnover_cents: 1284500, transaction_count: 42, avg_ticket_cents: 30583, refund_count: 2 },
  188 |       series: [
  189 |         { label: 'ma 27', value_cents: 180000 },
  190 |         { label: 'di 28', value_cents: 245000 },
  191 |         { label: 'wo 29', value_cents: 312500 },
  192 |         { label: 'do 30', value_cents: 278000 },
  193 |         { label: 'vr 31', value_cents: 269000 },
  194 |       ],
  195 |       by_payment_method: [
  196 |         { method: `Bancontact-via-Mollie-met-zeer-lange-labelnaam-${LONG}`, count: 18, amount_cents: 720000 },
  197 |         { method: 'Contant-kassalade-secundaire-locatie-havenkantoor', count: 11, amount_cents: 312500 },
  198 |         { method: 'Creditcard-American-Express-Corporate-Fleet', count: 8, amount_cents: 252000 },
  199 |       ],
  200 |       period: 'today',
  201 |     },
  202 |   }));
  203 |   await page.route('**/api/v1/kassa/recent-sales**', (route) => route.fulfill({
  204 |     json: {
  205 |       data: [{
  206 |         id: 'sale-1',
  207 |         invoice_number: 'FAC-2026-LONG-OVERFLOW-001',
  208 |         customer_name: LONG,
  209 |         total_amount_cents: 24200,
  210 |         created_at: '2026-10-28T10:00:00Z',
  211 |       }],
  212 |     },
  213 |   }));
  214 | 
  215 |   await page.route('**/api/v1/kassa/quote', (route) => {
  216 |     const items = route.request().postDataJSON().items as Array<{ metadata?: { length_cm?: number } }>;
  217 |     if (items[0]?.metadata) expect(items[0].metadata.length_cm).toBe(1135);
  218 |     return route.fulfill({
  219 |       json: { subtotal_cents: 20000 * items.length, vat_amount_cents: 4200 * items.length, total_cents: 24200 * items.length,
  220 |         lines: items.map(() => ({ unit_price: 20000, vat_rate: 21, vat_amount: 4200, line_total: 24200 })) },
  221 |     });
  222 |   });
  223 |   await page.route('**/api/v1/kassa/payment-methods', (route) => route.fulfill({
  224 |     json: { pos: ['cash', 'pin', 'invoice'], online: [] },
  225 |   }));
  226 |   await page.goto('/nl/admin/kassa');
  227 |   await setSidebar(page, sidebar);
  228 |   await expect(page.locator('main h1')).toBeVisible();
  229 |   await expect(page.getByText(/Bancontact-via-Mollie/)).toHaveCount(0);
  230 |   await page.getByRole('searchbox', { name: text('nl', 'adminNew.kassa.pos.search') }).fill('BAV-037');
  231 |   await page.getByRole('button', { name: /Bavaria 37.*BAV-037/ }).click();
  232 |   await page.getByRole('button', { name: /Kranen uit het water.*Prijs berekenen/ }).click();
  233 |   await expect(page.getByRole('spinbutton', { name: /Lengte/ })).toHaveValue('1135');
  234 |   await page.getByRole('dialog').getByRole('button', { name: text('nl', 'adminNew.kassa.pos.calculate'), exact: true }).click();
  235 |   await expect(page.locator('#cart')).toContainText(/242,00/);
  236 |   await page.locator('main').getByRole('button', { name: new RegExp(product.name) }).first().click();
  237 |   await expect(page.locator('#cart')).toContainText(/484,00/);
  238 | 
  239 |   for (const width of [390, 1280, 1536]) {
  240 |     await page.setViewportSize({ width, height: 1000 });
  241 |     await assertNoPageOverflow(page);
  242 |     await page.screenshot({ path: testInfo.outputPath(`kassa-pos-${width}.png`), fullPage: true });
  243 |   }
> 244 |   await page.getByRole('button', { name: new RegExp(text('nl', 'adminNew.kassa.cart')) }).click();
      |                                                                                           ^ Error: locator.click: Test timeout of 180000ms exceeded.
  245 |   await page.getByRole('button', { name: new RegExp(text('nl', 'adminNew.kassa.payNow')) }).click();
  246 |   await expect(page.getByRole('dialog')).toContainText(text('nl', 'adminNew.kassa.pos.manualPin'));
  247 |   await page.keyboard.press('Escape');
  248 |   await page.locator('#cart').getByRole('button', { name: text('nl', 'adminNew.common.close') }).click({ timeout: 8000 });
  249 | 
  250 |   await page.getByRole('button', { name: text('nl', 'adminNew.kassa.selectCustomer'), exact: true }).click();
  251 |   await page.getByRole('button', { name: text('nl', 'adminNew.kassa.newCustomer'), exact: true }).click();
  252 |   const dialog = page.getByRole('dialog');
  253 |   await expect(dialog).toBeVisible();
  254 |   await dialog.getByLabel(text('nl', 'adminNew.common.name'), { exact: false }).first().fill(LONG);
  255 |   await dialog.getByLabel(text('nl', 'adminNew.kassa.street'), { exact: true }).fill(`Zeerlange-Havenstraatnaam-Zonder-Spaties-${LONG}`);
  256 |   await dialog.getByLabel(text('nl', 'adminNew.kassa.houseNumber'), { exact: true }).fill('123A');
  257 |   await dialog.getByLabel(text('nl', 'adminNew.kassa.postalCode'), { exact: true }).fill('1234AB');
  258 |   await dialog.getByLabel(text('nl', 'adminNew.kassa.city'), { exact: true }).fill(`Gemeente-naam-met-extra-lange-toevoeging-${LONG}`);
  259 |   for (const width of [390, 1280, 1536]) {
  260 |     await page.setViewportSize({ width, height: 1000 });
  261 |     const box = await dialog.boundingBox();
  262 |     expect(box).toBeTruthy();
  263 |     expect(box!.x).toBeGreaterThanOrEqual(0);
  264 |     expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
  265 |     for (const field of await dialog.locator('input').all()) {
  266 |       const fieldBox = await field.boundingBox();
  267 |       if (!fieldBox) continue;
  268 |       expect(fieldBox.x).toBeGreaterThanOrEqual(0);
  269 |       expect(fieldBox.x + fieldBox.width).toBeLessThanOrEqual(width + 1);
  270 |     }
  271 |     await page.screenshot({ path: testInfo.outputPath(`kassa-address-grids-${width}.png`), fullPage: true });
  272 |   }
  273 |   await page.keyboard.press('Escape');
  274 | 
  275 |   await page.goto('/nl/admin/kassa/analytics');
  276 |   await setSidebar(page, sidebar);
  277 |   await expect(page.getByText(/Bancontact-via-Mollie/)).toBeVisible();
  278 |   for (const width of [1280, 1536]) {
  279 |     await page.setViewportSize({ width, height: 1000 });
  280 |     await assertNoPageOverflow(page);
  281 |     await page.screenshot({ path: testInfo.outputPath(`kassa-populated-analytics-${width}.png`), fullPage: true });
  282 |   }
  283 |   expect(errors).toEqual([]);
  284 | });
  285 | 
  286 | test(`AdminSplitLayout start sidebar (cash close) holds populated history at lg and xl [sidebar ${sidebar}]`, async ({ page }, testInfo) => {
  287 |   const errors: string[] = [];
  288 |   page.on('pageerror', (error) => errors.push(error.message));
  289 |   await isolatedSession(page);
  290 |   await page.route('**/api/v1/kassa/analytics**', (route) => route.fulfill({
  291 |     json: {
  292 |       payment_methods: [{ method: 'cash', total_cents: 87550, count: 9 }],
  293 |     },
  294 |   }));
  295 |   await page.route('**/api/v1/kassa/cash-closures**', (route) => {
  296 |     if (route.request().method() !== 'GET') return route.fulfill({ status: 201, json: { id: 'closure-new' } });
  297 |     return route.fulfill({
  298 |       json: Array.from({ length: 6 }, (_, i) => ({
  299 |         id: `closure-${i}`,
  300 |         business_date: `2026-10-${String(20 + i).padStart(2, '0')}`,
  301 |         expected_cash_cents: 120000 + i * 1500,
  302 |         counted_cash_cents: 119500 + i * 1400,
  303 |         difference_cents: -500 - i * 100,
  304 |         note: `${LONG} kasverschil-notitie-${i}`,
  305 |       })),
  306 |     });
  307 |   });
  308 |   await page.goto('/nl/admin/kassa/dagafsluiting');
  309 |   await setSidebar(page, sidebar);
  310 |   await expect(page.locator('main h1')).toBeVisible();
  311 |   await expect(page.locator('tbody tr')).toHaveCount(6);
  312 |   await captureWidths(page, testInfo, 'cash-close-split-start');
  313 |   expect(errors).toEqual([]);
  314 | });
  315 | 
  316 | test(`DocumentZoneEditor loaded zones and drag stay inside the viewport [sidebar ${sidebar}]`, async ({ page }, testInfo) => {
  317 |   const errors: string[] = [];
  318 |   page.on('pageerror', (error) => errors.push(error.message));
  319 |   await isolatedSession(page);
  320 |   await page.route('**/fixture-doc.png', (route) => route.fulfill({
  321 |     status: 200,
  322 |     contentType: 'image/png',
  323 |     body: PNG_1X1,
  324 |   }));
  325 |   await page.route('**/api/v1/invoice-extraction-templates/tpl-populated**', (route) => route.fulfill({
  326 |     json: {
  327 |       id: 'tpl-populated',
  328 |       name: `OCR sjabloon ${LONG}`,
  329 |       vendor_name: `Leverancier ${LONG}`,
  330 |       document_type: 'purchase_invoice',
  331 |       field_zones: [
  332 |         { field: 'invoice_number', x: 0.08, y: 0.1, w: 0.35, h: 0.08 },
  333 |         { field: 'supplier_name', x: 0.08, y: 0.22, w: 0.5, h: 0.1 },
  334 |         { field: 'total', x: 0.55, y: 0.75, w: 0.35, h: 0.08 },
  335 |       ],
  336 |     },
  337 |   }));
  338 |   await page.route('**/api/v1/invoice-imports/imp-populated/source-pdf**', (route) => route.fulfill({
  339 |     json: {
  340 |       filename: 'populated-invoice.png',
  341 |       mime_type: 'image/png',
  342 |       signed_url: `${test.info().project.use.baseURL}/fixture-doc.png`,
  343 |     },
  344 |   }));
```