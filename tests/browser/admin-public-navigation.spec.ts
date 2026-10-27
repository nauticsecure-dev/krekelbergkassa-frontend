import { expect, test, type Page } from '@playwright/test';

async function session(page: Page, role = 'admin', listing: string | null = null) {
  const base = test.info().project.use.baseURL!;
  await page.context().addCookies([{name:'krek_session',value:'navigation-fixture',url:base}]);
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== base) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({json:{id:'staff',name:'Navigation User',email:'nav@example.test',role,permissions:['*']}});
    if (/\/boats\/[^/]+$/.test(url.pathname) && route.request().method()==='PATCH') {
      listing=route.request().postDataJSON().public_listing_url;
      return route.fulfill({json:{id:'boat-1',public_listing_url:listing}});
    }
    if (/\/boats\/[^/]+\/dossier$/.test(url.pathname)) return route.fulfill({json:{boat:{id:'boat-1',name:'Test boat',slug:'internal-slug',public_listing_url:listing,public_url:listing},owner:{},stats:{},storage_contracts:[],timeline:[],financial:{invoices:[]}}});
    if (/\/products\/winter-product$/.test(url.pathname)) return route.fulfill({json:{id:'winter-product',name:'Winterstalling',code:'STALL-WINTER',slug:'winterstalling',public_path:'/diensten/winterstalling',active:true}});
    if (url.pathname.endsWith('/admin/settings')) return route.fulfill({json:{company:{},invoicing:{},payments:{},locales:{}}});
    return route.fulfill({json:{data:[],items:[],cards:[],meta:{total:0}}});
  });
}

for (const locale of ['nl','en','de','fr']) {
  test(`contextual destinations preserve ${locale} and open in a new tab`, async ({page}) => {
    await session(page, 'admin', 'https://www.schepenkring.nl/aanbod-boten/listing-123/');
    await page.goto(`/${locale}/admin/boten/boat-1/internal-slug`);
    const link=page.locator('a[target="_blank"]').filter({has:page.locator('svg.lucide-globe')});
    await expect(link).toHaveAttribute('href','https://www.schepenkring.nl/aanbod-boten/listing-123/');
    await expect(link).toHaveAttribute('rel','noopener noreferrer');
    const popupPromise=page.waitForEvent('popup');await link.click();const popup=await popupPromise;await popup.close();
    await expect(page).toHaveURL(new RegExp(`/${locale}/admin/boten/`));
    await page.goto(`/${locale}/admin/producten/winter-product/winterstalling`);
    await expect(link).toHaveAttribute('href',`/${locale}/diensten/winterstalling`);
    await page.goto(`/${locale}/admin/instellingen#contact_subjects`);
    await expect(link).toHaveAttribute('href',`/${locale}/contact`);
    // Switching Settings tabs uses replaceState; the topbar must update too.
    await page.locator('button').filter({has:page.locator('svg.lucide-shield-check')}).last().click();
    await expect(link).toHaveAttribute('href',`/${locale}`);
    await page.locator('button').filter({has:page.locator('svg.lucide-mail')}).filter({hasText:/contact|kontakt/i}).click();
    await expect(link).toHaveAttribute('href',`/${locale}/contact`);
  });
}

test('an internal boat slug without a listing falls back to homepage', async ({page})=>{
  await session(page);await page.goto('/de/admin/boten/boat-1/internal-slug');
  await expect(page.locator('a[target="_blank"]').filter({has:page.locator('svg.lucide-globe')})).toHaveAttribute('href','/de');
});

for (const role of ['admin','customer']) {
  test(`public header fits 1024–1279px with ${role} session`,async({page})=>{
    await session(page,role);
    for (const locale of ['nl','en','de','fr']) {
      await page.goto(`/${locale}/contact`);
      const header=page.locator('header').first();
      for(const width of [1024,1152,1279,1280]){
        await page.setViewportSize({width,height:900});
        await expect(header).toBeVisible();
        const boxes=await header.locator('a,button').evaluateAll(elements=>elements.filter(e=>{
          const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&!(e.tagName==='BUTTON'&&e.closest('a'));
        }).map(e=>{const r=e.getBoundingClientRect();return {text:e.textContent,left:r.left,right:r.right,top:r.top,bottom:r.bottom};}));
        for(const box of boxes){expect(box.left,JSON.stringify(box)).toBeGreaterThanOrEqual(0);expect(box.right,JSON.stringify(box)).toBeLessThanOrEqual(width);}
        const overlaps=boxes.flatMap((a,i)=>boxes.slice(i+1).filter(b=>a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1).map(b=>[a.text,b.text]));
        expect(overlaps, locale+' '+width).toEqual([]);
        if(role==='admin'&&locale==='de'&&[1024,1279].includes(width)) {
          await page.screenshot({path:'artifacts/navigation/header-'+width+'.png'});
        }
      }
      await page.setViewportSize({width:1024,height:900});
      await header.locator('button').filter({has:page.locator('svg.lucide-menu')}).click();
      await expect(header.locator(`a[href="/${locale}/${role==='admin'?'admin':'feed'}"]:visible`)).toBeVisible();
    }
  });
}

test('saving a listing URL updates the topbar immediately',async({page})=>{
  await session(page);await page.goto('/nl/admin/boten/boat-1/internal-slug');
  const link=page.locator('a[target="_blank"]').filter({has:page.locator('svg.lucide-globe')});
  await expect(link).toHaveAttribute('href','/nl');
  await page.getByRole('button',{name:'Bewerken',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Openbare advertentie-URL').fill('https://www.schepenkring.nl/aanbod-boten/saved-listing/');
  await dialog.getByRole('button',{name:'Opslaan',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  await expect(link).toHaveAttribute('href','https://www.schepenkring.nl/aanbod-boten/saved-listing/');
});
