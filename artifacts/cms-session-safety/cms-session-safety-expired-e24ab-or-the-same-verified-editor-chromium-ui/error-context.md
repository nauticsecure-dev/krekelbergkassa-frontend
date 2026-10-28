# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cms-session-safety.spec.ts >> expired save retains the draft and resumes only for the same verified editor
- Location: tests\browser\cms-session-safety.spec.ts:48:5

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: locator.fill: Test timeout of 180000ms exceeded.
Call log:
  - waiting for locator('[role="dialog"] textarea')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - toolbar "CMS toolbar" [ref=e2]:
    - button "Enable edit mode" [ref=e3] [cursor=pointer]:
      - img [ref=e4]
      - generic [ref=e7]: Edit
    - button "SEO" [disabled] [ref=e9]:
      - img [ref=e10]
    - button "Global settings" [disabled] [ref=e13]:
      - img [ref=e14]
    - link "Opening hours" [ref=e17] [cursor=pointer]:
      - /url: /en/admin/kalender
      - img [ref=e18]
  - generic [ref=e21]:
    - banner [ref=e22]:
      - generic [ref=e23]:
        - link "Krekelberg Nautic" [ref=e24] [cursor=pointer]:
          - /url: /en
          - generic "Krekelberg Nautic" [ref=e25]:
            - img "Krekelberg Nautic logo" [ref=e27]
            - generic [ref=e28]:
              - generic [ref=e29]: KREKELBERG
              - generic [ref=e30]: Nautic · Jachtmakelaar
        - navigation [ref=e31]:
          - list [ref=e32]:
            - listitem [ref=e33]:
              - link "Yard & services" [ref=e34] [cursor=pointer]:
                - /url: /en/diensten
                - generic [ref=e35]: Yard & services
                - img [ref=e36]
            - listitem [ref=e38]:
              - link "Sales" [ref=e39] [cursor=pointer]:
                - /url: /en/verkoop
                - generic [ref=e40]: Sales
            - listitem [ref=e41]:
              - link "About" [ref=e42] [cursor=pointer]:
                - /url: /en/over-ons
                - generic [ref=e43]: About
            - listitem [ref=e44]:
              - link "Contact" [ref=e45] [cursor=pointer]:
                - /url: /en/contact
                - generic [ref=e46]: Contact
        - generic [ref=e47]:
          - button "en" [ref=e49] [cursor=pointer]:
            - img [ref=e50]
            - generic [ref=e56]: en
            - img [ref=e57]
          - link "Admin dashboard" [ref=e59] [cursor=pointer]:
            - /url: /en/admin
            - button "Admin dashboard" [ref=e60]:
              - generic [ref=e61]: Admin dashboard
          - link "Stalling" [ref=e63] [cursor=pointer]:
            - /url: /en/diensten/winterstalling
            - text: Stalling
            - img [ref=e64]
    - main [ref=e66]:
      - generic [ref=e67]:
        - img "Krekelberg Nautic jachtwerf" [ref=e72]
        - generic:
          - generic [ref=e75]: Brokerage · Storage · DIY yard
          - heading "Yacht yard & brokerage in Roermond" [level=1] [ref=e76]
          - paragraph [ref=e77]: From craning and storage to sales support and DIY maintenance — Krekelberg Nautic delivers everything your vessel needs at one professional location on the Maasplassen.
          - generic:
            - link "Sell your boat" [ref=e78] [cursor=pointer]:
              - /url: /en/verkoop
              - generic [ref=e79]: Sell your boat
              - img [ref=e81]
            - link "View yard services" [ref=e83] [cursor=pointer]:
              - /url: /en/diensten
              - generic [ref=e84]: View yard services
          - generic [ref=e85]:
            - generic [ref=e86]:
              - img [ref=e87]
              - generic [ref=e90]: Active since 1972
            - generic [ref=e91]:
              - img [ref=e92]
              - generic [ref=e96]: 30-ton crane
            - generic [ref=e97]:
              - img [ref=e98]
              - generic [ref=e101]: 200+ stands
            - generic [ref=e102]:
              - img [ref=e103]
              - generic [ref=e106]: 60+ listings
      - generic [ref=e107]:
        - generic [ref=e108]:
          - generic [ref=e109]:
            - generic [ref=e111]: Our services
            - heading "Everything for your boat at one yard" [level=2] [ref=e112]
            - paragraph [ref=e113]: From crane to sales, all in one place at the Maasplassen.
          - link "View all services" [ref=e114] [cursor=pointer]:
            - /url: /en/diensten
            - generic [ref=e115]: View all services
            - img [ref=e117]
        - generic [ref=e119]:
          - link "Crane up to 30 tons Crane up to 30 tons Boat in or out of water Professional craning with our 30-ton mobile crane and experienced team." [ref=e120] [cursor=pointer]:
            - /url: /en/kraanafspraak
            - generic [ref=e121]:
              - generic [ref=e122]:
                - img "Crane up to 30 tons" [ref=e127]
                - generic:
                  - generic:
                    - img
                - generic:
                  - generic: Crane up to 30 tons
                  - generic: Boat in or out of water
              - generic [ref=e128]:
                - paragraph [ref=e129]: Professional craning with our 30-ton mobile crane and experienced team.
                - img [ref=e130]
          - link "Hull pressure wash Hull pressure wash Right after craning Environmentally friendly washing with filtered runoff, ready for storage or antifouling." [ref=e132] [cursor=pointer]:
            - /url: /en/diensten/afspuiten
            - generic [ref=e133]:
              - generic [ref=e134]:
                - img "Hull pressure wash" [ref=e139]
                - generic:
                  - generic:
                    - img
                - generic:
                  - generic: Hull pressure wash
                  - generic: Right after craning
              - generic [ref=e140]:
                - paragraph [ref=e141]: Environmentally friendly washing with filtered runoff, ready for storage or antifouling.
                - img [ref=e142]
          - link "Winter storage Winter storage Indoor & outdoor Safe and insured at the 10,000 m² yard, monitored 24/7." [ref=e144] [cursor=pointer]:
            - /url: /en/diensten/winterstalling
            - generic [ref=e145]:
              - generic [ref=e146]:
                - img "Winter storage" [ref=e151]
                - generic:
                  - generic:
                    - img
                - generic:
                  - generic: Winter storage
                  - generic: Indoor & outdoor
              - generic [ref=e152]:
                - paragraph [ref=e153]: Safe and insured at the 10,000 m² yard, monitored 24/7.
                - img [ref=e154]
          - link "Work on your own boat Work on your own boat DIY-friendly yard Workspaces with power, water and our mechanics on request — work independently." [ref=e156] [cursor=pointer]:
            - /url: /en/diensten/zelf-werken
            - generic [ref=e157]:
              - generic [ref=e158]:
                - img "Work on your own boat" [ref=e163]
                - generic:
                  - generic:
                    - img
                - generic:
                  - generic: Work on your own boat
                  - generic: DIY-friendly yard
              - generic [ref=e164]:
                - paragraph [ref=e165]: Workspaces with power, water and our mechanics on request — work independently.
                - img [ref=e166]
          - link "Sell your boat Sell your boat Via Schepenkring Roermond Sell at our physical location with professional brokerage and continuous visibility." [ref=e168] [cursor=pointer]:
            - /url: /en/verkoop
            - generic [ref=e169]:
              - generic [ref=e170]:
                - img "Sell your boat" [ref=e175]
                - generic:
                  - generic:
                    - img
                - generic:
                  - generic: Sell your boat
                  - generic: Via Schepenkring Roermond
              - generic [ref=e176]:
                - paragraph [ref=e177]: Sell at our physical location with professional brokerage and continuous visibility.
                - img [ref=e178]
          - link "A week ashore A week ashore A week to work on your boat Bring your boat ashore and take time for maintenance at our yard." [ref=e180] [cursor=pointer]:
            - /url: /en/diensten/weekje-op-wal
            - generic [ref=e181]:
              - generic [ref=e182]:
                - img "A week ashore" [ref=e187]
                - generic:
                  - generic:
                    - img
                - generic:
                  - generic: A week ashore
                  - generic: A week to work on your boat
              - generic [ref=e188]:
                - paragraph [ref=e189]: Bring your boat ashore and take time for maintenance at our yard.
                - img [ref=e190]
      - generic [ref=e193]:
        - generic [ref=e194]:
          - img "Boot kranen op de werf van Krekelberg Nautic" [ref=e199]
          - generic [ref=e200]:
            - img [ref=e201]
            - generic [ref=e204]: HISWA certified
            - generic [ref=e205]: HISWA · 1976
        - generic [ref=e206]:
          - generic [ref=e208]: Yard services
          - heading "A complete yard, managed in-house" [level=2] [ref=e209]
          - paragraph [ref=e210]: Our yard is set up for both DIY boaters and clients who hand over the full maintenance. Everything in one location at the Maasplassen in Roermond.
          - paragraph [ref=e211]: We combine family-business craftsmanship with modern facilities — keeping your boat in top condition year-round.
          - list [ref=e212]:
            - listitem [ref=e213]:
              - img [ref=e215]
              - generic [ref=e219]:
                - generic [ref=e220]: Crane & wash
                - generic [ref=e221]: 30-ton crane and high-pressure wash
            - listitem [ref=e222]:
              - img [ref=e224]
              - generic [ref=e227]:
                - generic [ref=e228]: Maintenance
                - generic [ref=e229]: Antifouling, polishing, engine service
            - listitem [ref=e230]:
              - img [ref=e232]
              - generic [ref=e235]:
                - generic [ref=e236]: Indoor & outdoor storage
                - generic [ref=e237]: For boats up to 14m+
            - listitem [ref=e238]:
              - img [ref=e240]
              - generic [ref=e242]:
                - generic [ref=e243]: DIY yard
                - generic [ref=e244]: Workspaces with power and water
          - generic [ref=e245]:
            - link "View yard services" [ref=e246] [cursor=pointer]:
              - /url: /en/diensten
              - generic [ref=e247]: View yard services
              - img [ref=e249]
            - link "Book appointment" [ref=e251] [cursor=pointer]:
              - /url: /en/kraanafspraak
              - generic [ref=e252]: Book appointment
      - generic [ref=e255]:
        - img "Boot te koop via Krekelberg Nautic" [ref=e261]
        - generic [ref=e262]:
          - generic [ref=e264]: Schepenkring Roermond
          - heading "Looking for a (new) boat?" [level=2] [ref=e265]
          - paragraph [ref=e266]: We are the largest yacht broker in Limburg with at least 75 boats for sale on location. The full catalogue is online via our Schepenkring partner.
          - generic [ref=e267]:
            - generic [ref=e268]:
              - generic [ref=e269]: 60+
              - generic [ref=e270]: Boats for sale
            - generic [ref=e271]:
              - generic [ref=e272]: 3-6 mnd
              - generic [ref=e273]: Avg sale time
            - generic [ref=e274]:
              - generic [ref=e275]: 100%
              - generic [ref=e276]: Guided process
          - generic [ref=e277]:
            - link "View boats for sale" [ref=e278] [cursor=pointer]:
              - /url: https://www.schepenkring.nl/aanbod-boten/?kantoor=Roermond
              - generic [ref=e279]: View boats for sale
              - img [ref=e281]
            - link "List your boat" [ref=e283] [cursor=pointer]:
              - /url: /en/verkoop
              - generic [ref=e284]: List your boat
      - generic [ref=e286]:
        - img "Jachthaven Krekelberg Nautic Roermond" [ref=e291]
        - generic [ref=e292]:
          - generic [ref=e294]: Contact & location
          - heading "Plan your visit to the yard" [level=3] [ref=e295]
          - list [ref=e296]:
            - listitem [ref=e297]:
              - img [ref=e298]
              - text: Hertenerweg 2, 6049AA Herten
            - listitem [ref=e301]:
              - img [ref=e302]
              - link "0475 315 661" [ref=e304] [cursor=pointer]:
                - /url: tel:+31475315661
            - listitem [ref=e305]:
              - img [ref=e306]
              - generic [ref=e309]: Mon–Fri 09:00–17:30 · Wed closed · Sat + Sun 10:00–17:00
          - link "Book appointment" [ref=e311] [cursor=pointer]:
            - /url: /en/contact
            - generic [ref=e312]: Book appointment
            - img [ref=e314]
      - generic [ref=e317]:
        - generic:
          - generic:
            - generic [ref=e324]: Ready to start?
            - heading "Reserve your crane slot or storage" [level=3] [ref=e325]
            - paragraph [ref=e326]: Combine multiple services and book easily online. Our yard planning is live.
          - generic:
            - link "Book a crane slot" [ref=e327] [cursor=pointer]:
              - /url: /en/kraanafspraak
              - generic [ref=e328]: Book a crane slot
              - img [ref=e330]
            - link "Get in touch" [ref=e332] [cursor=pointer]:
              - /url: /en/contact
              - generic [ref=e333]: Get in touch
    - contentinfo [ref=e334]:
      - generic [ref=e335]:
        - generic [ref=e336]:
          - generic "Krekelberg Nautic" [ref=e337]:
            - img "Krekelberg Nautic logo" [ref=e339]
            - generic [ref=e340]:
              - generic [ref=e341]: KREKELBERG
              - generic [ref=e342]: Nautic · Jachtmakelaar
          - paragraph [ref=e343]: Yacht yard, storage and brokerage in Roermond. Vakmanschap, planning en stalling sinds 1972.
        - generic [ref=e344]:
          - generic [ref=e345]: Services
          - list [ref=e346]:
            - listitem [ref=e347]:
              - link "Crane" [ref=e348] [cursor=pointer]:
                - /url: /en/kraanafspraak
            - listitem [ref=e349]:
              - link "Pressure wash" [ref=e350] [cursor=pointer]:
                - /url: /en/diensten/afspuiten
            - listitem [ref=e351]:
              - link "Winter storage" [ref=e352] [cursor=pointer]:
                - /url: /en/diensten/winterstalling
            - listitem [ref=e353]:
              - link "A week ashore" [ref=e354] [cursor=pointer]:
                - /url: /en/diensten/weekje-op-wal
            - listitem [ref=e355]:
              - link "Sell your boat" [ref=e356] [cursor=pointer]:
                - /url: /en/verkoop
        - generic [ref=e357]:
          - generic [ref=e358]: Company
          - list [ref=e359]:
            - listitem [ref=e360]:
              - link "About" [ref=e361] [cursor=pointer]:
                - /url: /en/over-ons
            - listitem [ref=e362]:
              - link "Frequently asked questions" [ref=e363] [cursor=pointer]:
                - /url: /en/faq
            - listitem [ref=e364]:
              - link "Contact" [ref=e365] [cursor=pointer]:
                - /url: /en/contact
            - listitem [ref=e366]:
              - link "Timeline" [ref=e367] [cursor=pointer]:
                - /url: /en/feed
            - listitem [ref=e368]:
              - link "Login" [ref=e369] [cursor=pointer]:
                - /url: /en/login
        - generic [ref=e370]:
          - generic [ref=e371]: Contact
          - list [ref=e372]:
            - listitem [ref=e373]:
              - img [ref=e374]
              - generic [ref=e377]: Hertenerweg 2, 6049AA Herten
            - listitem [ref=e378]:
              - img [ref=e379]
              - link "0475 315 661" [ref=e381] [cursor=pointer]:
                - /url: tel:+31475315661
            - listitem [ref=e382]:
              - img [ref=e383]
              - link "marketing@answer24.nl" [ref=e386] [cursor=pointer]:
                - /url: mailto:info@krekelberg-nautic.nl
      - generic [ref=e388]:
        - generic [ref=e389]: © 2026 Krekelberg Nautic — All rights reserved.
        - generic [ref=e390]:
          - link "Privacy" [ref=e391] [cursor=pointer]:
            - /url: /en/privacy
          - link "Voorwaarden" [ref=e392] [cursor=pointer]:
            - /url: /en/voorwaarden
          - link "Cookies" [ref=e393] [cursor=pointer]:
            - /url: /en/cookies
  - alert [ref=e394]
```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test';
  2   | import en from '../../src/i18n/messages/en.json';
  3   | 
  4   | const cms = en.cms;
  5   | const editor = { id: 'cms-editor', name: 'Editor', email: 'editor@example.test', role: 'super_admin', permissions: ['cms.manage'] };
  6   | 
  7   | async function fixture(page: Page) {
  8   |   const baseURL = test.info().project.use.baseURL!;
  9   |   await page.context().addCookies([{ name: 'krek_session', value: 'cms-fixture', url: baseURL }]);
  10  |   await page.route('**/*', route => {
  11  |     const url = new URL(route.request().url());
  12  |     if (url.origin !== new URL(baseURL).origin) return route.abort();
  13  |     if (!url.pathname.startsWith('/api/')) return route.continue();
  14  |     if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: editor });
  15  |     return route.fulfill({ json: { content_blocks: [], media_blocks: [], settings: {}, items: [], data: [] } });
  16  |   });
  17  | }
  18  | 
  19  | for (const response of ['valid', 'revoked', 'expired', 'offline']) {
  20  |   test(`cached CMS permissions stay hidden until verification: ${response}`, async ({ page }) => {
  21  |     await fixture(page);
  22  |     await page.addInitScript(user => sessionStorage.setItem('krek_user_cache', JSON.stringify(user)), editor);
  23  |     let release!: () => void;
  24  |     const pending = new Promise<void>(resolve => { release = resolve; });
  25  |     await page.route('**/auth/me', async route => {
  26  |       await pending;
  27  |       if (response === 'offline') return route.abort();
  28  |       await route.fulfill({ status: response === 'expired' ? 401 : 200,
  29  |         json: response === 'revoked' ? { ...editor, permissions: [] } : editor });
  30  |     });
  31  |     expect((await page.goto('/en/kraanafspraak'))?.status()).toBe(200);
  32  |     await expect(page.getByRole('heading').first()).toBeVisible();
  33  |     await expect(page.getByRole('toolbar')).toHaveCount(0);
  34  |     await expect(page.locator('[data-cms-edit]')).toHaveCount(0);
  35  |     const settled = response === 'offline'
  36  |       ? page.waitForEvent('requestfailed', request => request.url().endsWith('/auth/me'))
  37  |       : page.waitForResponse(result => result.url().endsWith('/auth/me'));
  38  |     release();
  39  |     await settled;
  40  |     if (response === 'valid') await expect(page.getByRole('toolbar')).toBeVisible();
  41  |     else {
  42  |       await expect.poll(() => page.evaluate(() => document.querySelectorAll('[role="toolbar"]').length)).toBe(0);
  43  |       await expect(page.locator('[data-cms-edit]')).toHaveCount(0);
  44  |     }
  45  |   });
  46  | }
  47  | 
  48  | test('expired save retains the draft and resumes only for the same verified editor', async ({ page }) => {
  49  |   await fixture(page);
  50  |   let expired = true;
  51  |   let saved: unknown;
  52  |   await page.route('**/admin/cms/content-blocks/home.werf.cta', route => {
  53  |     saved = route.request().postDataJSON();
  54  |     return route.fulfill({ status: expired ? 401 : 200, json: {} });
  55  |   });
  56  |   expect((await page.goto('/en'))?.status()).toBe(200);
  57  |   await page.getByRole('button', { name: cms.enterEdit, exact: true }).click();
  58  |   await page.locator('[data-cms-block="home.werf.cta"] button').click();
  59  |   const input = page.locator('[role="dialog"] textarea');
> 60  |   await input.fill('Keep this unsaved label');
      |               ^ Error: locator.fill: Test timeout of 180000ms exceeded.
  61  |   await page.getByRole('button', { name: cms.save, exact: true }).click();
  62  |   const recovery = page.locator('dialog[open]');
  63  |   await expect(recovery).toContainText(cms.draftRetained);
  64  |   await expect(recovery.getByRole('link', { name: cms.signInAgain })).toHaveAttribute('target', '_blank');
  65  |   await page.keyboard.press('Escape');
  66  |   await expect(recovery).toBeVisible();
  67  |   await expect(input).toHaveValue('Keep this unsaved label');
  68  |   // Another account must not inherit or save this draft.
  69  |   await page.context().addCookies([{ name: 'krek_session', value: 'new-session', url: test.info().project.use.baseURL! }]);
  70  |   await page.route('**/auth/me', route => route.fulfill({ json: { ...editor, id: 'other-editor' } }));
  71  |   await recovery.getByRole('button', { name: cms.resumeEditing }).click();
  72  |   await expect(recovery).toBeVisible();
  73  |   await expect(recovery).toContainText(cms.sessionNotRestored);
  74  |   await page.route('**/auth/me', route => route.fulfill({ json: editor }));
  75  |   expired = false;
  76  |   await recovery.getByRole('button', { name: cms.resumeEditing }).click();
  77  |   await expect(recovery).toHaveCount(0);
  78  |   await expect(input).toHaveValue('Keep this unsaved label');
  79  |   await page.getByRole('button', { name: cms.save, exact: true }).click();
  80  |   await expect(page.getByRole('dialog')).toHaveCount(0);
  81  |   expect(saved).toMatchObject({ value_by_locale: { 'en-GB': 'Keep this unsaved label' } });
  82  | });
  83  | 
  84  | test('route changes close stale dialogs and disable page actions without a registration', async ({ page }) => {
  85  |   await fixture(page);
  86  |   expect((await page.goto('/en'))?.status()).toBe(200);
  87  |   await expect(page.getByRole('button', { name: cms.seoTitle, exact: true })).toBeDisabled();
  88  |   await page.getByRole('button', { name: cms.enterEdit, exact: true }).click();
  89  |   await page.getByRole('button', { name: cms.seoTitle, exact: true }).click();
  90  |   await expect(page.getByRole('dialog')).toBeVisible();
  91  |   // Native history changes are integrated with the Next app router. Exercise
  92  |   // several route changes without waiting for registration effects in between.
  93  |   await page.evaluate(() => {
  94  |     history.pushState(null, '', '/en/contact');
  95  |     history.pushState(null, '', '/en/kraanafspraak');
  96  |     history.pushState(null, '', '/en/missing-cms-route');
  97  |   });
  98  |   await expect(page.getByRole('dialog')).toHaveCount(0);
  99  | });
  100 | 
  101 | test('translated links have one keyboard target and edit without following their destination', async ({ page }) => {
  102 |   await fixture(page);
  103 |   expect((await page.goto('/en'))?.status()).toBe(200);
  104 |   await page.getByRole('button', { name: cms.enterEdit, exact: true }).click();
  105 |   const text = page.locator('footer [data-cms-translation="services.crane.title"]');
  106 |   const link = text.locator('..');
  107 |   await expect(text).not.toHaveAttribute('role', 'button');
  108 |   await link.focus();
  109 |   await link.press('Enter');
  110 |   await expect(page.getByRole('dialog')).toBeVisible();
  111 |   await expect(page).toHaveURL(/\/en$/);
  112 |   await page.getByRole('dialog').getByRole('button', { name: cms.cancel, exact: true }).click();
  113 |   await link.click();
  114 |   await expect(page.getByRole('dialog')).toBeVisible();
  115 |   await expect(page).toHaveURL(/\/en$/);
  116 |   await expect(page.locator('a button[data-cms-edit], button button[data-cms-edit], a [role="button"], button [role="button"]')).toHaveCount(0);
  117 | });
  118 | 
  119 | test('revoked permission removes controls and closes an open editor after revalidation', async ({ page }) => {
  120 |   await fixture(page);
  121 |   expect((await page.goto('/en'))?.status()).toBe(200);
  122 |   await page.getByRole('button', { name: cms.enterEdit, exact: true }).click();
  123 |   await page.locator('[data-cms-block="home.werf.cta"] button').click();
  124 |   await expect(page.getByRole('dialog')).toBeVisible();
  125 |   await page.route('**/auth/me', route => route.fulfill({ json: { ...editor, permissions: [] } }));
  126 |   await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  127 |   await expect(page.getByRole('toolbar')).toHaveCount(0);
  128 |   await expect(page.getByRole('dialog')).toHaveCount(0);
  129 |   await expect(page.locator('[data-cms-edit]')).toHaveCount(0);
  130 | });
  131 | 
  132 | test('expired image upload retains its selected file and metadata for retry', async ({ page }) => {
  133 |   await fixture(page);
  134 |   let expired = true;
  135 |   let uploads = 0;
  136 |   await page.route('**/admin/cms/media-blocks/*/upload', route => {
  137 |     uploads++;
  138 |     return route.fulfill({ status: expired ? 401 : 200, json: { image_url: '/img/krek/werf-hero.webp' } });
  139 |   });
  140 |   expect((await page.goto('/en'))?.status()).toBe(200);
  141 |   await page.getByRole('button', { name: cms.enterEdit, exact: true }).click();
  142 |   await page.locator('[data-cms-block="home.hero.image"] button').click();
  143 |   const dialog = page.locator('[role="dialog"]');
  144 |   await dialog.locator('input[type=file]').setInputFiles('public/img/krek/werf-hero.webp');
  145 |   const alt = dialog.getByRole('textbox', { name: `${cms.altText} EN`, exact: true });
  146 |   await alt.fill('Retained image description');
  147 |   await dialog.getByRole('button', { name: cms.save, exact: true }).click();
  148 |   await expect(page.locator('dialog[open]')).toBeVisible();
  149 |   await expect(dialog.locator('img[src^="blob:"]').first()).toBeAttached();
  150 |   await page.context().addCookies([{ name: 'krek_session', value: 'renewed-image-session', url: test.info().project.use.baseURL! }]);
  151 |   expired = false;
  152 |   await page.locator('dialog[open]').getByRole('button', { name: cms.resumeEditing }).click();
  153 |   await expect(page.locator('dialog[open]')).toHaveCount(0);
  154 |   await expect(alt).toHaveValue('Retained image description');
  155 |   await dialog.getByRole('button', { name: cms.save, exact: true }).click();
  156 |   await expect(dialog).toHaveCount(0);
  157 |   expect(uploads).toBe(2);
  158 | });
  159 | 
```