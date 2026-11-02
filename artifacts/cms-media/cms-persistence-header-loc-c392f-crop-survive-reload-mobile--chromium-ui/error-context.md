# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cms-persistence.spec.ts >> header locales and image draft/crop survive reload (mobile)
- Location: tests\browser\cms-persistence.spec.ts:59:7

# Error details

```
Test timeout of 240000ms exceeded.
```

```
Error: expect(locator).toBeAttached() failed

Locator: locator('header a[href="/de/admin"]').first()
Expected: attached
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeAttached" with timeout 20000ms
  - waiting for locator('header a[href="/de/admin"]').first()

```

```yaml
- banner:
  - link "Krekelberg Nautic":
    - /url: /de
    - img "Krekelberg Nautic logo"
    - text: KREKELBERG Nautic · Jachtmakelaar
  - button "de":
    - text: de
    - img
  - button "Hauptmenü":
    - img
- main:
  - text: Yachtmakler · Lagerung · DIY-Werft
  - heading "Jachtwerft & Yachtmakler in Roermond" [level=1]
  - paragraph: Von Kran und Lagerung bis Verkaufsvermittlung und Selbstwartung – Krekelberg Nautic bietet alles für Ihr Schiff an einem professionellen Standort an den Maasplassen.
  - link "Verkaufen Sie Ihr Boot":
    - /url: /de/verkoop
    - text: Verkaufen Sie Ihr Boot
    - img
  - link "Werftleistungen ansehen":
    - /url: /de/diensten
  - img
  - text: Seit 1972 aktiv
  - img
  - text: 30-Tonnen Kran
  - img
  - text: 200+ Stellplätze
  - img
  - text: 60+ Verkaufsschiffe Unsere Leistungen
  - heading "Alles für Ihr Boot auf einer Werft" [level=2]
  - paragraph: Von Kran bis Verkauf, alles aus einer Hand an den Maasplassen.
  - link "Alle Leistungen ansehen":
    - /url: /de/diensten
    - text: Alle Leistungen ansehen
    - img
  - link "Kran bis 30 Tonnen Boot ins oder aus dem Wasser Professioneller Kran-Service mit unserem 30-Tonnen-Mobilkran und erfahrenem Team.":
    - /url: /de/kraanafspraak
    - text: Kran bis 30 Tonnen Boot ins oder aus dem Wasser
    - paragraph: Professioneller Kran-Service mit unserem 30-Tonnen-Mobilkran und erfahrenem Team.
    - img
  - link "Rumpfreinigung Direkt nach dem Kran Umweltfreundliche Reinigung mit gefiltertem Abwasser, bereit für Lagerung oder Antifouling.":
    - /url: /de/diensten/afspuiten
    - text: Rumpfreinigung Direkt nach dem Kran
    - paragraph: Umweltfreundliche Reinigung mit gefiltertem Abwasser, bereit für Lagerung oder Antifouling.
    - img
  - link "Winterlagerung Innen & außen Sicher und versichert auf 10.000 m² Werftgelände mit Kameraüberwachung.":
    - /url: /de/diensten/winterstalling
    - text: Winterlagerung Innen & außen
    - paragraph: Sicher und versichert auf 10.000 m² Werftgelände mit Kameraüberwachung.
    - img
  - link "Selbst arbeiten DIY-freundliche Werft Werkplätze mit Strom, Wasser und unseren Mechanikern auf Anfrage.":
    - /url: /de/diensten/zelf-werken
    - text: Selbst arbeiten DIY-freundliche Werft
    - paragraph: Werkplätze mit Strom, Wasser und unseren Mechanikern auf Anfrage.
    - img
  - link "Boot verkaufen Über Schepenkring Roermond Verkauf an unserem physischen Standort mit professioneller Vermittlung und durchgehender Sichtbarkeit.":
    - /url: /de/verkoop
    - text: Boot verkaufen Über Schepenkring Roermond
    - paragraph: Verkauf an unserem physischen Standort mit professioneller Vermittlung und durchgehender Sichtbarkeit.
    - img
  - link "Eine Woche an Land Eine Woche Zeit für Ihr Boot Holen Sie Ihr Boot aus dem Wasser und nehmen Sie sich Zeit für Wartungsarbeiten auf unserer Werft.":
    - /url: /de/diensten/weekje-op-wal
    - text: Eine Woche an Land Eine Woche Zeit für Ihr Boot
    - paragraph: Holen Sie Ihr Boot aus dem Wasser und nehmen Sie sich Zeit für Wartungsarbeiten auf unserer Werft.
    - img
  - text: HISWA zertifiziert HISWA · 1976 Werftleistungen
  - heading "Komplette Werft aus einer Hand" [level=2]
  - paragraph: Unsere Werft ist für DIY-Schiffer und Kunden eingerichtet, die die komplette Wartung abgeben möchten. Alles an einem Standort an den Maasplassen in Roermond.
  - paragraph: Wir vereinen Familienbetriebs-Handwerkskunst mit modernen Einrichtungen — Ihr Boot bleibt das ganze Jahr in Topzustand.
  - list:
    - listitem:
      - img
      - text: Kran & Reinigung 30-Tonnen Kran und Hochdruckreinigung
    - listitem:
      - img
      - text: Wartung Antifouling, Polieren, Motorenservice
    - listitem:
      - img
      - text: Innen- & Außenlagerung Für Boote bis 14m+
    - listitem:
      - img
      - text: DIY-Werft Werkplätze mit Strom und Wasser
  - link "Werftleistungen ansehen":
    - /url: /de/diensten
    - text: Werftleistungen ansehen
    - img
  - link "Termin buchen":
    - /url: /de/kraanafspraak
  - text: Schepenkring Roermond
  - heading "Auf der Suche nach einem (neuen) Boot?" [level=2]
  - paragraph: Wir sind der größte Yachtmakler in Limburg mit mindestens 75 Verkaufsschiffen vor Ort. Das komplette Angebot finden Sie online über unseren Schepenkring-Partner.
  - text: 60+ Verkaufsschiffe 3-6 mnd Durchschnittliche Verkaufszeit 100% Begleitung
  - link "Bootsangebot ansehen":
    - /url: https://www.schepenkring.nl/aanbod-boten/?kantoor=Roermond
    - text: Bootsangebot ansehen
    - img
  - link "Boot anmelden":
    - /url: /de/verkoop
  - text: Kontakt & Standort
  - heading "Planen Sie Ihren Werftbesuch" [level=3]
  - list:
    - listitem:
      - img
      - text: Hertenerweg 2, 6049AA Herten
    - listitem:
      - img
      - link "0475 315 661":
        - /url: tel:0475315661
    - listitem:
      - img
      - text: Mo–Fr 09:00–17:30 · Mi geschlossen · Sa + So 10:00–17:00
  - link "Termin buchen":
    - /url: /de/contact
    - text: Termin buchen
    - img
  - text: Bereit loszulegen?
  - heading "Reservieren Sie Ihren Krantermin oder Lagerplatz" [level=3]
  - paragraph: Kombinieren Sie mehrere Leistungen und buchen Sie einfach online. Unsere Werftplanung ist live einsehbar.
  - link "Krantermin buchen":
    - /url: /de/kraanafspraak
    - text: Krantermin buchen
    - img
  - link "Kontakt aufnehmen":
    - /url: /de/contact
- contentinfo:
  - img "Krekelberg Nautic logo"
  - text: KREKELBERG Nautic · Jachtmakelaar
  - paragraph: Jachtwerft, Lagerung und Yachtmakler in Roermond. Vakmanschap, planning en stalling sinds 1972.
  - text: Leistungen
  - list:
    - listitem:
      - link "Kran":
        - /url: /de/kraanafspraak
    - listitem:
      - link "Abspritzen":
        - /url: /de/diensten/afspuiten
    - listitem:
      - link "Winterlager":
        - /url: /de/diensten/winterstalling
    - listitem:
      - link "Eine Woche an Land":
        - /url: /de/diensten/weekje-op-wal
    - listitem:
      - link "Boot verkaufen":
        - /url: /de/verkoop
  - text: Unternehmen
  - list:
    - listitem:
      - link "Über uns":
        - /url: /de/over-ons
    - listitem:
      - link "Häufig gestellte Fragen":
        - /url: /de/faq
    - listitem:
      - link "Kontakt":
        - /url: /de/contact
    - listitem:
      - link "Aktivitäten":
        - /url: /de/feed
    - listitem:
      - link "Anmelden":
        - /url: /de/login
  - text: Contact
  - list:
    - listitem:
      - img
      - text: Hertenerweg 2, 6049AA Herten
    - listitem:
      - img
      - link "0475 315 661":
        - /url: tel:0475315661
    - listitem:
      - img
      - link "roermond@schepenkring.nl":
        - /url: mailto:roermond@schepenkring.nl
  - text: © 2026 Krekelberg Nautic — Alle Rechte vorbehalten.
  - link "Privacy":
    - /url: /de/privacy
  - link "Voorwaarden":
    - /url: /de/voorwaarden
  - link "Cookies":
    - /url: /de/cookies
```

# Test source

```ts
  36  |     if (url.pathname.includes('/media-blocks/')) {
  37  |       const parts = url.pathname.split('/');
  38  |       const upload = parts.at(-1) === 'upload';
  39  |       const key = decodeURIComponent(parts.at(upload ? -2 : -1)!);
  40  |       media[key] ??= { key, image_url: '/img/krek/werf-hero.webp', alt: '', focal_point: { x: 50, y: 50 }, overlay: 0 };
  41  |       if (upload) {
  42  |         uploads++;
  43  |         // Mirror the upload API's separate desktop/mobile records.
  44  |         const mobile = route.request().postDataBuffer()?.toString().includes('name="variant"\r\n\r\nmobile');
  45  |         if (mobile) Object.assign(media[key], {
  46  |           mobile_file_id: 'mobile-fixture', mobile_image_url: '/img/krek/werf-hero.webp?mobile=1',
  47  |         });
  48  |         else media[key].image_url = '/img/krek/werf-hero.webp?uploaded=1';
  49  |       }
  50  |       else Object.assign(media[key], route.request().postDataJSON());
  51  |       return route.fulfill({ json: media[key] });
  52  |     }
  53  |     return route.fulfill({ json: { data: [], settings: {}, items: [] } });
  54  |   });
  55  |   return { globals, media, uploads: () => uploads };
  56  | }
  57  | 
  58  | for (const mobile of [false, true]) {
  59  |   test(`header locales and image draft/crop survive reload (${mobile ? 'mobile' : 'desktop'})`, async ({ page }) => {
  60  |     test.setTimeout(240_000);
  61  |     await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
  62  |     const state = await fixture(page);
  63  |     const messages = JSON.parse(fs.readFileSync('src/i18n/messages/en.json', 'utf8')).cms;
  64  |     await page.goto('/en');
  65  |     await page.getByRole('button', { name: messages.enterEdit, exact: true }).click();
  66  |     if (mobile) await page.locator('header button').filter({ has: page.locator('svg.lucide-menu') }).click();
  67  |     const url = page.url();
  68  |     await page.locator('header').getByRole('button', { name: messages.editCta, exact: true }).filter({ visible: true }).first().click();
  69  |     const dialog = page.getByRole('dialog');
  70  |     for (const [tag, value] of [['NL', 'Stalling'], ['EN', 'Storage'], ['DE', 'Lagerung'], ['FR', 'Hivernage']]) {
  71  |       await dialog.getByRole('tab', { name: tag, exact: true }).click();
  72  |       await dialog.getByRole('textbox', { name: new RegExp(`${tag}$`) }).fill(value);
  73  |     }
  74  |     await dialog.getByRole('button', { name: messages.global.headerCtaPath, exact: true }).click();
  75  |     await page.getByRole('option', { name: 'diensten/winterstalling', exact: true }).click();
  76  |     await dialog.getByRole('button', { name: messages.save, exact: true }).click();
  77  |     await expect(dialog).toHaveCount(0);
  78  |     expect(page.url()).toBe(url);
  79  |     expect(state.globals['header.cta.path']).toBe('diensten/winterstalling');
  80  |     if (mobile) await page.locator('header button').filter({ has: page.locator('svg.lucide-x') }).click();
  81  |     const image = page.locator('[data-cms-block="home.hero.image"]');
  82  |     await image.getByRole('button', { name: messages.editImage, exact: true }).click();
  83  |     await dialog.locator('input[type=file]').first().setInputFiles('public/img/krek/werf-hero.webp');
  84  |     expect(state.uploads()).toBe(0);
  85  |     await dialog.getByRole('button', { name: messages.cancel, exact: true }).click();
  86  |     expect(state.uploads()).toBe(0);
  87  |     await image.getByRole('button', { name: messages.editImage, exact: true }).click();
  88  |     await dialog.locator('input[type=file]').first().setInputFiles('public/img/krek/werf-hero.webp');
  89  |     await expect(dialog.locator('.reactEasyCrop_Image')).toBeVisible();
  90  |     await dialog.getByRole('slider', { name: messages.zoom, exact: true }).focus();
  91  |     await dialog.getByRole('slider', { name: messages.zoom, exact: true }).press('End');
  92  |     await dialog.getByLabel(messages.uploadMobileImage, { exact: true }).setInputFiles('public/img/krek/werf-hero.webp');
  93  |     expect(state.uploads()).toBe(0);
  94  |     for (const [label, value] of [
  95  |       [messages.brightness, '115'], [messages.contrast, '90'], [messages.saturation, '80'],
  96  |       [messages.mobileFocal.replace('{axis}', 'x'), '20'],
  97  |       [messages.mobileFocal.replace('{axis}', 'y'), '80'],
  98  |       [messages.gradientStart, '0.2'], [messages.gradientMiddle, '0.4'], [messages.gradientEnd, '0.6'],
  99  |     ]) await dialog.getByRole('slider', { name: label, exact: true }).fill(value);
  100 |     await dialog.getByRole('button', { name: messages.gradient, exact: true }).click();
  101 |     await page.getByRole('option', { name: messages.gradientBottom, exact: true }).click();
  102 |     await page.waitForTimeout(200);
  103 |     await dialog.getByRole('button', { name: messages.save, exact: true }).click();
  104 |     await expect(dialog).toHaveCount(0);
  105 |     expect(state.uploads()).toBe(2);
  106 |     expect(state.media['home.hero.image']).toMatchObject({
  107 |       mobile_file_id: 'mobile-fixture', mobile_focal_point: { x: 20, y: 80 },
  108 |       image_style: { brightness: 115, contrast: 90, saturation: 80,
  109 |         gradient: 'bottom', gradient_start: 0.2, gradient_middle: 0.4, gradient_end: 0.6 },
  110 |     });
  111 |     const savedCrop = state.media['home.hero.image'].crop_data;
  112 |     expect(savedCrop.unit).toBe('percent');
  113 |     expect(savedCrop.width).toBeLessThan(100);
  114 |     await page.reload();
  115 |     await expect(image.locator('img')).toHaveCSS('filter', 'brightness(1.15) contrast(0.9) saturate(0.8)');
  116 |     await expect(image.locator('span[aria-hidden]').first()).toHaveCSS('background-image',
  117 |       'linear-gradient(rgba(8, 19, 38, 0.2), rgba(8, 19, 38, 0.4), rgba(8, 19, 38, 0.6))');
  118 |     if (mobile) {
  119 |       await expect.poll(() => image.locator('img').evaluate((el: HTMLImageElement) => el.currentSrc)).toContain('?mobile=1');
  120 |       await expect(image.locator('img')).toHaveCSS('object-position', '20% 80%');
  121 |     } else await expect(image.locator('img')).toHaveCSS('position', 'absolute');
  122 |     await page.getByRole('button', { name: messages.enterEdit, exact: true }).click();
  123 |     await image.getByRole('button', { name: messages.editImage, exact: true }).click();
  124 |     await expect(dialog.locator('.reactEasyCrop_Image')).toBeVisible();
  125 |     await expect(dialog.getByRole('slider', { name: messages.brightness, exact: true })).toHaveValue('115');
  126 |     await expect(dialog.getByRole('button', { name: messages.gradient, exact: true })).toContainText(messages.gradientBottom);
  127 |     await expect(dialog.getByRole('slider', { name: messages.gradientEnd, exact: true })).toHaveValue('0.6');
  128 |     await expect(dialog.getByRole('slider', { name: messages.mobileFocal.replace('{axis}', 'x'), exact: true })).toHaveValue('20');
  129 |     await expect(dialog.getByRole('slider', { name: messages.mobileFocal.replace('{axis}', 'y'), exact: true })).toHaveValue('80');
  130 |     await dialog.getByRole('button', { name: messages.save, exact: true }).click();
  131 |     await expect(dialog).toHaveCount(0);
  132 |     expect(state.media['home.hero.image'].crop_data.width).toBeCloseTo(savedCrop.width, 0);
  133 |     for (const [locale, label] of [['nl', 'Stalling'], ['en', 'Storage'], ['de', 'Lagerung'], ['fr', 'Hivernage']]) {
  134 |       await page.goto(`/${locale}`, {waitUntil:'domcontentloaded'});
  135 |       if (mobile) {
> 136 |         // Wait for the authenticated client header before opening its drawer.
      |                                                                                 ^ Error: expect(locator).toBeAttached() failed
  137 |         // Initial pathname effects can otherwise close a pre-hydration click.
  138 |         await expect(page.locator(`header a[href="/${locale}/admin"]`).first()).toBeAttached();
  139 |         await page.locator('header button').filter({ has: page.locator('svg.lucide-menu') }).click();
  140 |         await expect(page.locator('header svg.lucide-x')).toBeVisible();
  141 |       }
  142 |       const link = page.locator('header').getByRole('link', { name: label, exact: true });
  143 |       await expect(link).toBeVisible();
  144 |       await expect(link).toHaveAttribute('href', `/${locale}/diensten/winterstalling`);
  145 |     }
  146 |   });
  147 | }
  148 | 
  149 | for (const mobile of [false, true]) {
  150 |   test(`hero CTA text and destination survive save/reload/reopening (${mobile ? 'mobile' : 'desktop'})`, async ({ page }) => {
  151 |     await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
  152 |     await fixture(page);
  153 |     const messages = JSON.parse(fs.readFileSync('src/i18n/messages/en.json', 'utf8')).cms;
  154 |     await page.goto('/en');
  155 |     await page.getByRole('button', { name: messages.enterEdit, exact: true }).click();
  156 |     const dialog = page.getByRole('dialog');
  157 |     await page.locator('[data-cms-block="home.hero.cta_primary"]').getByRole('button', { name: messages.editCta, exact: true }).click();
  158 |     await dialog.getByRole('textbox', { name: messages.ctaLabel, exact: true }).fill('Explore winter storage');
  159 |     await dialog.getByRole('button', { name: messages.ctaRoute, exact: true }).click();
  160 |     await page.getByRole('option', { name: 'diensten/winterstalling', exact: true }).click();
  161 |     await dialog.getByRole('button', { name: messages.save, exact: true }).click();
  162 |     await expect(dialog).toHaveCount(0);
  163 |     await expect(page).toHaveURL('/en');
  164 |     await page.reload();
  165 |     await expect(page.getByRole('link', { name: 'Explore winter storage', exact: true }))
  166 |       .toHaveAttribute('href', '/en/diensten/winterstalling');
  167 |     await page.getByRole('button', { name: messages.enterEdit, exact: true }).click();
  168 |     await page.locator('[data-cms-block="home.hero.cta_primary"]').getByRole('button', { name: messages.editCta, exact: true }).click();
  169 |     await expect(dialog.getByRole('textbox', { name: messages.ctaLabel, exact: true })).toHaveValue('Explore winter storage');
  170 |     await expect(dialog.getByRole('button', { name: messages.ctaRoute, exact: true })).toContainText('diensten/winterstalling');
  171 |   });
  172 | }
  173 | 
  174 | test('shared translated text can be edited inline and from the catalog, then reloaded', async ({ page }) => {
  175 |   await fixture(page);
  176 |   const messages = JSON.parse(fs.readFileSync('src/i18n/messages/en.json', 'utf8')).cms;
  177 |   await page.goto('/en');
  178 |   await page.getByRole('button', { name: messages.enterEdit, exact: true }).click();
  179 |   await page.locator('header [data-cms-translation="nav.salesLocation"]').first().click();
  180 |   const dialog = page.getByRole('dialog');
  181 |   await expect(dialog.getByRole('textbox')).toBeEnabled();
  182 |   await dialog.getByRole('textbox').fill('Local boat sales');
  183 |   await dialog.getByRole('button', { name: messages.save, exact: true }).click();
  184 |   await expect(dialog).toHaveCount(0);
  185 |   await expect(page.locator('header [data-cms-translation="nav.salesLocation"]').first()).toHaveText('Local boat sales');
  186 |   await page.getByRole('button', { name: messages.allTranslations, exact: true }).click();
  187 |   await dialog.getByRole('textbox', { name: messages.searchTranslations, exact: true }).fill('nav.contact');
  188 |   await dialog.getByRole('button').filter({ hasText: 'nav.contact' }).click();
  189 |   await expect(dialog.getByRole('textbox')).toBeEnabled();
  190 |   await dialog.getByRole('textbox').fill('Get in touch');
  191 |   await dialog.getByRole('button', { name: messages.save, exact: true }).click();
  192 |   await page.reload();
  193 |   await expect(page.locator('header').getByRole('link', { name: 'Local boat sales', exact: true })).toBeVisible();
  194 |   await expect(page.locator('header').getByRole('link', { name: 'Get in touch', exact: true })).toBeVisible();
  195 | });
  196 | 
  197 |  test('editor tabs follow active language settings', async ({page}) => {
  198 |   await fixture(page, ['nl-NL','de-DE']);
  199 |   const messages = JSON.parse(fs.readFileSync('src/i18n/messages/en.json','utf8')).cms;
  200 |   await page.goto('/en');
  201 |   await page.getByRole('button',{name:messages.enterEdit,exact:true}).click();
  202 |   await page.locator('[data-cms-block="home.hero.image"]').getByRole('button',{name:messages.editImage,exact:true}).click();
  203 |   const dialog=page.getByRole('dialog');
  204 |   await expect(dialog.getByRole('tab')).toHaveText(['NL','DE']);
  205 |   await expect(dialog.getByRole('tab',{name:'NL',exact:true})).toHaveAttribute('aria-selected','true');
  206 |   await dialog.getByRole('button', { name: messages.cancel, exact: true }).click();
  207 |   await page.locator('[data-cms-block="home.hero.title"] button').click();
  208 |   await expect(dialog.getByRole('tab')).toHaveText(['NL', 'DE']);
  209 |   await expect(dialog.getByRole('tab', { name: 'NL', exact: true })).toHaveAttribute('aria-selected', 'true');
  210 |   await dialog.getByRole('button', { name: messages.cancel, exact: true }).click();
  211 |   await page.locator('[data-cms-block="home.hero.cta_primary"]').getByRole('button', { name: messages.editCta, exact: true }).click();
  212 |   await expect(dialog.getByRole('tab')).toHaveText(['NL', 'DE']);
  213 |   await expect(dialog.getByRole('tab', { name: 'NL', exact: true })).toHaveAttribute('aria-selected', 'true');
  214 | });
  215 | 
  216 | test('saved styling and responsive mobile source render after reload', async ({page}) => {
  217 |   const state = await fixture(page);
  218 |   state.media['home.hero.image'] = {
  219 |     key:'home.hero.image', image_url:'/img/krek/werf-hero.webp', alt:'Responsive hero',
  220 |     focal_point:{x:50,y:50}, overlay:0,
  221 |     crop_data:{x:20,y:20,width:50,height:50,unit:'percent'},
  222 |     mobile_image_url:'/img/krek/werf-hero.webp?mobile=1', mobile_focal_point:{x:20,y:80},
  223 |     image_style:{brightness:115,contrast:90,saturation:80,gradient:'none'},
  224 |   };
  225 |   await page.setViewportSize({width:1440,height:1000});
  226 |   await page.goto('/en');
  227 |   const image=page.locator('[data-cms-block="home.hero.image"] img');
  228 |   await expect(image).toHaveCSS('position','absolute');
  229 |   await expect(image).toHaveCSS('filter','brightness(1.15) contrast(0.9) saturate(0.8)');
  230 |   await page.setViewportSize({width:390,height:844});
  231 |   await expect.poll(() => image.evaluate((el:HTMLImageElement)=>el.currentSrc)).toContain('?mobile=1');
  232 |   await expect(image).toHaveCSS('object-position','20% 80%');
  233 |   await page.reload();
  234 |   await expect(image).toHaveCSS('object-position','20% 80%');
  235 |   await expect.poll(() => image.evaluate((el:HTMLImageElement)=>el.currentSrc)).toContain('?mobile=1');
  236 | });
```