# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-review.spec.ts >> populated kassa POS, analytics charts and address grids stay inside the viewport [sidebar collapsed]
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
        - generic [ref=e5]: KN
        - button "Zijbalk uitklappen" [ref=e6] [cursor=pointer]:
          - img [ref=e7]
      - navigation [ref=e9]:
        - link "Overzicht" [ref=e10] [cursor=pointer]:
          - /url: /nl/admin
          - img [ref=e11]
        - link "Planning" [ref=e14] [cursor=pointer]:
          - /url: /nl/admin/planning
          - img [ref=e15]
        - link "Kassa" [ref=e17] [cursor=pointer]:
          - /url: /nl/admin/kassa
          - img [ref=e19]
        - link "Stalling" [ref=e23] [cursor=pointer]:
          - /url: /nl/admin/stalling
          - img [ref=e24]
        - link "Klanten" [ref=e27] [cursor=pointer]:
          - /url: /nl/admin/klanten
          - img [ref=e28]
        - link "Boten" [ref=e33] [cursor=pointer]:
          - /url: /nl/admin/boten
          - img [ref=e34]
        - link "Makelaardij" [ref=e38] [cursor=pointer]:
          - /url: /nl/admin/makelaardij
          - img [ref=e39]
        - link "Financieel" [ref=e42] [cursor=pointer]:
          - /url: /nl/admin/financieel
          - img [ref=e43]
        - link "Diensten & Prijzen" [ref=e46] [cursor=pointer]:
          - /url: /nl/admin/diensten-prijzen
          - img [ref=e47]
        - link "Beheer" [ref=e51] [cursor=pointer]:
          - /url: /nl/admin/beheer
          - img [ref=e52]
        - link "Systeembeheer" [ref=e55] [cursor=pointer]:
          - /url: /nl/admin/systeem
          - img [ref=e56]
        - link "Help & ondersteuning" [ref=e59] [cursor=pointer]:
          - /url: /nl/faq
          - img [ref=e60]
      - generic [ref=e64]:
        - generic [ref=e65]: AR
        - generic:
          - generic: Audit Reviewer
          - generic: review@example.test
        - button "Uitloggen" [ref=e66] [cursor=pointer]:
          - img [ref=e67]
    - generic [ref=e70]:
      - generic [ref=e72]:
        - button "Zoeken… ⌘K" [ref=e73] [cursor=pointer]:
          - img [ref=e74]
          - generic [ref=e77]: Zoeken…
          - generic [ref=e78]: ⌘K
        - generic [ref=e79]:
          - button "Nieuw" [ref=e81] [cursor=pointer]:
            - img [ref=e82]
            - generic [ref=e83]: Nieuw
          - link "Website bekijken" [ref=e84] [cursor=pointer]:
            - /url: /nl
            - generic [ref=e85]:
              - img [ref=e86]
              - generic [ref=e89]: Website bekijken
          - button "nl" [ref=e91] [cursor=pointer]:
            - img [ref=e92]
            - generic [ref=e96]: nl
            - img [ref=e97]
          - link "Online" [ref=e99] [cursor=pointer]:
            - /url: /nl/admin/sync
            - generic [ref=e100]:
              - img [ref=e102]
              - text: Online
          - button "Meldingen" [ref=e106] [cursor=pointer]:
            - img [ref=e107]
          - button "AR" [ref=e111] [cursor=pointer]:
            - generic [ref=e112]: AR
            - img [ref=e113]
      - main [ref=e115]:
        - generic [ref=e117]:
          - generic [ref=e118]:
            - generic [ref=e119]:
              - heading "Kassa" [level=1] [ref=e120]
              - paragraph [ref=e121]: Audit Reviewer
            - navigation [ref=e122]:
              - link "Alle verkopen" [ref=e123] [cursor=pointer]:
                - /url: /nl/admin/verkopen
              - link "Kassa analytics" [ref=e124] [cursor=pointer]:
                - /url: /nl/admin/kassa/analytics
              - link "Instellingen" [ref=e125] [cursor=pointer]:
                - /url: /nl/admin/instellingen#payments
          - generic [ref=e126]:
            - generic [ref=e127]:
              - generic [ref=e128]:
                - generic [ref=e129]:
                  - img
                  - searchbox "Zoek boot, klant, product of barcode…" [ref=e130]
                - button "Scan" [ref=e131] [cursor=pointer]:
                  - img [ref=e133]
                  - generic [ref=e138]: Scan
              - generic [ref=e139]:
                - generic [ref=e140]:
                  - generic [ref=e141]:
                    - generic [ref=e142]:
                      - heading "Bavaria 37" [level=2] [ref=e143]
                      - paragraph [ref=e144]: BAV-037
                    - generic [ref=e145]:
                      - generic [ref=e146]:
                        - term [ref=e147]: Lengte
                        - definition [ref=e148]: 11,35 m (1.135 cm)
                      - generic [ref=e149]:
                        - term [ref=e150]: Breedte
                        - definition [ref=e151]: 3,8 m (380 cm)
                      - generic [ref=e152]:
                        - term [ref=e153]: Diepgang
                        - definition [ref=e154]: 1,9 m (190 cm)
                    - paragraph [ref=e155]: Hans Müller
                  - generic [ref=e156]:
                    - button "Klant selecteren" [ref=e157] [cursor=pointer]:
                      - generic [ref=e158]: Klant selecteren
                    - button "Boot kiezen" [ref=e159] [cursor=pointer]:
                      - generic [ref=e160]: Boot kiezen
                - region "Producten" [ref=e161]:
                  - generic [ref=e162]:
                    - button "Alle" [pressed] [ref=e163] [cursor=pointer]:
                      - img [ref=e164]
                      - text: Alle
                    - button "Snel kiezen" [ref=e167] [cursor=pointer]:
                      - img [ref=e168]
                      - text: Snel kiezen
                    - button "Werfdiensten" [ref=e170] [cursor=pointer]:
                      - img [ref=e171]
                      - text: Werfdiensten
                    - button "Stalling" [ref=e175] [cursor=pointer]:
                      - img [ref=e176]
                      - text: Stalling
                    - button "Onderhoud" [ref=e179] [cursor=pointer]:
                      - img [ref=e180]
                      - text: Onderhoud
                  - generic [ref=e182]:
                    - generic [ref=e183]:
                      - button "Kranen uit het water Prijs berekenen" [ref=e184] [cursor=pointer]:
                        - img [ref=e185]
                        - generic [ref=e188]: Kranen uit het water
                        - generic [ref=e189]: Prijs berekenen
                      - button "Favoriet wisselen · Kranen uit het water" [pressed] [ref=e190] [cursor=pointer]:
                        - img [ref=e191]
                    - generic [ref=e193]:
                      - button "Romp afspuiten Prijs berekenen" [ref=e194] [cursor=pointer]:
                        - img [ref=e195]
                        - generic [ref=e198]: Romp afspuiten
                        - generic [ref=e199]: Prijs berekenen
                      - button "Favoriet wisselen · Romp afspuiten" [pressed] [ref=e200] [cursor=pointer]:
                        - img [ref=e201]
                    - generic [ref=e203]:
                      - button "Weekje op wal Prijs berekenen" [ref=e204] [cursor=pointer]:
                        - img [ref=e205]
                        - generic [ref=e209]: Weekje op wal
                        - generic [ref=e210]: Prijs berekenen
                      - button "Favoriet wisselen · Weekje op wal" [pressed] [ref=e211] [cursor=pointer]:
                        - img [ref=e212]
                    - generic [ref=e214]:
                      - button "Winterstalling Prijs berekenen" [ref=e215] [cursor=pointer]:
                        - img [ref=e216]
                        - generic [ref=e219]: Winterstalling
                        - generic [ref=e220]: Prijs berekenen
                      - button "Favoriet wisselen · Winterstalling" [pressed] [ref=e221] [cursor=pointer]:
                        - img [ref=e222]
                    - generic [ref=e224]:
                      - button "Zomerstalling Prijs berekenen" [ref=e225] [cursor=pointer]:
                        - img [ref=e226]
                        - generic [ref=e229]: Zomerstalling
                        - generic [ref=e230]: Prijs berekenen
                      - button "Favoriet wisselen · Zomerstalling" [pressed] [ref=e231] [cursor=pointer]:
                        - img [ref=e232]
                    - generic [ref=e234]:
                      - button "Onderhoud Prijs berekenen" [ref=e235] [cursor=pointer]:
                        - img [ref=e236]
                        - generic [ref=e238]: Onderhoud
                        - generic [ref=e239]: Prijs berekenen
                      - button "Favoriet wisselen · Onderhoud" [pressed] [ref=e240] [cursor=pointer]:
                        - img [ref=e241]
                    - generic [ref=e243]:
                      - button "Superlange-Winterstalling-Klantnaam-Met-Extra-Segmenten-Voor-Overflow-Controle Producttegel € 242,00" [active] [ref=e244] [cursor=pointer]:
                        - img [ref=e245]
                        - generic [ref=e248]: Superlange-Winterstalling-Klantnaam-Met-Extra-Segmenten-Voor-Overflow-Controle Producttegel
                        - generic [ref=e249]: € 242,00
                      - button "Favoriet wisselen · Superlange-Winterstalling-Klantnaam-Met-Extra-Segmenten-Voor-Overflow-Controle Producttegel" [pressed] [ref=e250] [cursor=pointer]:
                        - img [ref=e251]
            - complementary [ref=e253]:
              - generic [ref=e254]:
                - heading "Winkelmand (2)" [level=2] [ref=e255]
                - button "Winkelwagen legen" [ref=e257] [cursor=pointer]:
                  - generic [ref=e258]: Winkelwagen legen
              - paragraph [ref=e259]: Hans Müller
              - generic [ref=e260]:
                - generic [ref=e261]:
                  - generic [ref=e262]:
                    - paragraph [ref=e263]: Kranen uit het water · 1135 cm
                    - paragraph [ref=e264]: Bavaria 37
                    - button "Bewerken" [ref=e265] [cursor=pointer]
                    - paragraph [ref=e266]: € 200,00 · BTW (21%)
                    - generic [ref=e267]:
                      - button "Aantal verlagen" [ref=e268] [cursor=pointer]: −
                      - generic [ref=e269]: "1"
                      - button "Aantal verhogen" [ref=e270] [cursor=pointer]: +
                  - generic [ref=e271]:
                    - paragraph [ref=e272]: € 242,00
                    - button "Verwijder Kranen uit het water · 1135 cm" [ref=e273] [cursor=pointer]:
                      - img [ref=e274]
                - generic [ref=e277]:
                  - generic [ref=e278]:
                    - paragraph [ref=e279]: Superlange-Winterstalling-Klantnaam-Met-Extra-Segmenten-Voor-Overflow-Controle Producttegel
                    - paragraph [ref=e280]: € 200,00 · BTW (21%)
                    - generic [ref=e281]:
                      - button "Aantal verlagen" [ref=e282] [cursor=pointer]: −
                      - generic [ref=e283]: "1"
                      - button "Aantal verhogen" [ref=e284] [cursor=pointer]: +
                  - generic [ref=e285]:
                    - paragraph [ref=e286]: € 242,00
                    - button "Verwijder Superlange-Winterstalling-Klantnaam-Met-Extra-Segmenten-Voor-Overflow-Controle Producttegel" [ref=e287] [cursor=pointer]:
                      - img [ref=e288]
              - generic [ref=e291]:
                - generic [ref=e292]:
                  - generic [ref=e293]: Totaal excl.
                  - generic [ref=e294]: € 400,00
                - group [ref=e295]:
                  - generic "BTW · € 84,00" [ref=e296] [cursor=pointer]
                - generic [ref=e297]:
                  - generic [ref=e298]: Totaal incl. btw
                  - generic [ref=e299]: € 484,00
                - button "Afrekenen € 484,00" [ref=e300] [cursor=pointer]:
                  - img [ref=e302]
                  - generic [ref=e304]: Afrekenen € 484,00
                - button "Opmerking toevoegen" [ref=e305] [cursor=pointer]:
                  - generic [ref=e306]: Opmerking toevoegen
  - alert [ref=e307]
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
> 244 |   await page.setViewportSize({ width: 390, height: 1000 });
      |                                                                                           ^ Error: locator.click: Test timeout of 180000ms exceeded.
  245 |   await page.getByRole('button', { name: new RegExp(text('nl', 'adminNew.kassa.cart')) }).click();
  246 |   await page.getByRole('button', { name: new RegExp(text('nl', 'adminNew.kassa.payNow')) }).click();
  247 |   await expect(page.getByRole('dialog')).toContainText(text('nl', 'adminNew.kassa.pos.manualPin'));
  248 |   await page.keyboard.press('Escape');
  249 |   await page.locator('#cart').getByRole('button', { name: text('nl', 'adminNew.common.close') }).click({ timeout: 8000 });
  250 | 
  251 |   await page.getByRole('button', { name: text('nl', 'adminNew.kassa.selectCustomer'), exact: true }).click();
  252 |   await page.getByRole('button', { name: text('nl', 'adminNew.kassa.newCustomer'), exact: true }).click();
  253 |   const dialog = page.getByRole('dialog');
  254 |   await expect(dialog).toBeVisible();
  255 |   await dialog.getByLabel(text('nl', 'adminNew.common.name'), { exact: false }).first().fill(LONG);
  256 |   await dialog.getByLabel(text('nl', 'adminNew.kassa.street'), { exact: true }).fill(`Zeerlange-Havenstraatnaam-Zonder-Spaties-${LONG}`);
  257 |   await dialog.getByLabel(text('nl', 'adminNew.kassa.houseNumber'), { exact: true }).fill('123A');
  258 |   await dialog.getByLabel(text('nl', 'adminNew.kassa.postalCode'), { exact: true }).fill('1234AB');
  259 |   await dialog.getByLabel(text('nl', 'adminNew.kassa.city'), { exact: true }).fill(`Gemeente-naam-met-extra-lange-toevoeging-${LONG}`);
  260 |   for (const width of [390, 1280, 1536]) {
  261 |     await page.setViewportSize({ width, height: 1000 });
  262 |     const box = await dialog.boundingBox();
  263 |     expect(box).toBeTruthy();
  264 |     expect(box!.x).toBeGreaterThanOrEqual(0);
  265 |     expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
  266 |     for (const field of await dialog.locator('input').all()) {
  267 |       const fieldBox = await field.boundingBox();
  268 |       if (!fieldBox) continue;
  269 |       expect(fieldBox.x).toBeGreaterThanOrEqual(0);
  270 |       expect(fieldBox.x + fieldBox.width).toBeLessThanOrEqual(width + 1);
  271 |     }
  272 |     await page.screenshot({ path: testInfo.outputPath(`kassa-address-grids-${width}.png`), fullPage: true });
  273 |   }
  274 |   await page.keyboard.press('Escape');
  275 | 
  276 |   await page.goto('/nl/admin/kassa/analytics');
  277 |   await setSidebar(page, sidebar);
  278 |   await expect(page.getByText(/Bancontact-via-Mollie/)).toBeVisible();
  279 |   for (const width of [1280, 1536]) {
  280 |     await page.setViewportSize({ width, height: 1000 });
  281 |     await assertNoPageOverflow(page);
  282 |     await page.screenshot({ path: testInfo.outputPath(`kassa-populated-analytics-${width}.png`), fullPage: true });
  283 |   }
  284 |   expect(errors).toEqual([]);
  285 | });
  286 | 
  287 | test(`AdminSplitLayout start sidebar (cash close) holds populated history at lg and xl [sidebar ${sidebar}]`, async ({ page }, testInfo) => {
  288 |   const errors: string[] = [];
  289 |   page.on('pageerror', (error) => errors.push(error.message));
  290 |   await isolatedSession(page);
  291 |   await page.route('**/api/v1/kassa/analytics**', (route) => route.fulfill({
  292 |     json: {
  293 |       payment_methods: [{ method: 'cash', total_cents: 87550, count: 9 }],
  294 |     },
  295 |   }));
  296 |   await page.route('**/api/v1/kassa/cash-closures**', (route) => {
  297 |     if (route.request().method() !== 'GET') return route.fulfill({ status: 201, json: { id: 'closure-new' } });
  298 |     return route.fulfill({
  299 |       json: Array.from({ length: 6 }, (_, i) => ({
  300 |         id: `closure-${i}`,
  301 |         business_date: `2026-10-${String(20 + i).padStart(2, '0')}`,
  302 |         expected_cash_cents: 120000 + i * 1500,
  303 |         counted_cash_cents: 119500 + i * 1400,
  304 |         difference_cents: -500 - i * 100,
  305 |         note: `${LONG} kasverschil-notitie-${i}`,
  306 |       })),
  307 |     });
  308 |   });
  309 |   await page.goto('/nl/admin/kassa/dagafsluiting');
  310 |   await setSidebar(page, sidebar);
  311 |   await expect(page.locator('main h1')).toBeVisible();
  312 |   await expect(page.locator('tbody tr')).toHaveCount(6);
  313 |   await captureWidths(page, testInfo, 'cash-close-split-start');
  314 |   expect(errors).toEqual([]);
  315 | });
  316 | 
  317 | test(`DocumentZoneEditor loaded zones and drag stay inside the viewport [sidebar ${sidebar}]`, async ({ page }, testInfo) => {
  318 |   const errors: string[] = [];
  319 |   page.on('pageerror', (error) => errors.push(error.message));
  320 |   await isolatedSession(page);
  321 |   await page.route('**/fixture-doc.png', (route) => route.fulfill({
  322 |     status: 200,
  323 |     contentType: 'image/png',
  324 |     body: PNG_1X1,
  325 |   }));
  326 |   await page.route('**/api/v1/invoice-extraction-templates/tpl-populated**', (route) => route.fulfill({
  327 |     json: {
  328 |       id: 'tpl-populated',
  329 |       name: `OCR sjabloon ${LONG}`,
  330 |       vendor_name: `Leverancier ${LONG}`,
  331 |       document_type: 'purchase_invoice',
  332 |       field_zones: [
  333 |         { field: 'invoice_number', x: 0.08, y: 0.1, w: 0.35, h: 0.08 },
  334 |         { field: 'supplier_name', x: 0.08, y: 0.22, w: 0.5, h: 0.1 },
  335 |         { field: 'total', x: 0.55, y: 0.75, w: 0.35, h: 0.08 },
  336 |       ],
  337 |     },
  338 |   }));
  339 |   await page.route('**/api/v1/invoice-imports/imp-populated/source-pdf**', (route) => route.fulfill({
  340 |     json: {
  341 |       filename: 'populated-invoice.png',
  342 |       mime_type: 'image/png',
  343 |       signed_url: `${test.info().project.use.baseURL}/fixture-doc.png`,
  344 |     },
```