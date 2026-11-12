import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import en from '../../src/i18n/messages/en.json';
import nl from '../../src/i18n/messages/nl.json';
import de from '../../src/i18n/messages/de.json';
import fr from '../../src/i18n/messages/fr.json';

test.skip(process.env.CMS_MEDIA_LIVE !== '1', 'Run with CMS_MEDIA_LIVE=1 node scripts/test-isolated-live.mjs');
const boot = 'require "vendor/autoload.php"; $app=require "bootstrap/app.php"; $app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap(); if (!$app->environment("local") || config("database.default") !== "sqlite") { throw new RuntimeException("Isolated SQLite required"); } ';
function php(code: string) {
  return execFileSync('php', ['-r', boot + code], {cwd:path.resolve('../krekelbergkassa-backend'), encoding:'utf8'});
}
for (const [locale, {cms}] of Object.entries({nl,en,de,fr})) {
  test(`Laravel media uploads, styles and independent crops survive reload and reopen (${locale})`, async ({page, request}, info) => {
    const token = php('$u=App\\Models\\User::where("role","super_admin")->firstOrFail(); echo $u->createToken("cms-browser")->plainTextToken;').trim();
    await page.context().addCookies([{name:'krek_session',value:token,url:String(info.project.use.baseURL)}]);
    await page.goto(`/${locale}`);
    await page.getByRole('button',{name:cms.enterEdit,exact:true}).click();
    const image = page.locator('[data-cms-block="home.hero.image"]');
    await image.getByRole('button',{name:cms.editImage,exact:true}).click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('input[type=file]').first().setInputFiles('public/img/krek/werf-hero.webp');
    await dialog.getByLabel(cms.uploadMobileImage,{exact:true}).setInputFiles('public/img/krek/verkoop-schip.webp');
    await dialog.getByRole('slider',{name:cms.zoom,exact:true}).fill('1.4');
    await dialog.getByRole('slider',{name:cms.mobileZoom,exact:true}).fill('1.8');
    await dialog.getByRole('button',{name:cms.alignment,exact:true}).click();
    await page.getByRole('option',{name:cms.alignRight,exact:true}).click();
    await dialog.getByRole('slider',{name:cms.desktopFocal.replace('{axis}','x'),exact:true}).fill('32');
    await dialog.getByRole('slider',{name:cms.mobileFocal.replace('{axis}','x'),exact:true}).fill('73');
    await dialog.getByRole('slider',{name:cms.brightness,exact:true}).fill('125');
    await dialog.getByRole('slider',{name:cms.contrast,exact:true}).fill('85');
    await dialog.getByRole('slider',{name:cms.saturation,exact:true}).fill('70');
    await dialog.getByRole('slider',{name:cms.overlay,exact:true}).fill('0.35');
    await dialog.getByRole('button',{name:cms.gradient,exact:true}).click();
    await page.getByRole('option',{name:cms.gradientBottom,exact:true}).click();
    await dialog.getByRole('slider',{name:cms.gradientStart,exact:true}).fill('0.8');
    await dialog.getByRole('slider',{name:cms.gradientMiddle,exact:true}).fill('0.5');
    await dialog.getByRole('slider',{name:cms.gradientEnd,exact:true}).fill('0.2');
    for (const tag of ['NL','EN','DE','FR']) {
      await dialog.getByRole('tab',{name:tag,exact:true}).click();
      await dialog.getByLabel(cms.altText+' '+tag,{exact:true}).fill('QA boat '+tag);
    }
    const saved = page.waitForResponse(r=>r.url().includes('/media-blocks/home.hero.image') && r.url().endsWith('/process') && r.request().method()==='POST');
    await dialog.getByRole('button',{name:cms.save,exact:true}).click();
    const response = await saved;
    expect(response.ok(),await response.text()).toBe(true);
    let data = await response.json();
    if (!data.revision) await expect.poll(async () => {
      const status = await request.get('/api/v1/admin/cms/media-processing/'+data.request_id,{headers:{Authorization:'Bearer '+token}});
      const result = await status.json(); if (result.status === 'failed') throw new Error(JSON.stringify(result.error));
      if (result.revision) {data=result;return true;} return false;
    },{timeout:180000,intervals:[1000,2000]}).toBe(true);
    expect(data.focal_point.x).toBe(32);
    expect(data.mobile_focal_point.x).toBe(73);
    expect(data.mobile_crop_data.unit).toBe('percent');
    expect(data.mobile_crop_data).not.toEqual(data.crop_data);
    expect(data.mobile_file_id).toBeTruthy();
    for (const url of [data.image_url,data.mobile_image_url]) {
      const asset = await request.get(url); expect(asset.ok()).toBe(true);
      expect(asset.headers()['content-type']).toContain('image/');
    }
    await expect(dialog).toHaveCount(0);
    await page.reload();
    await page.getByRole('button',{name:cms.enterEdit,exact:true}).click();
    await image.getByRole('button',{name:cms.editImage,exact:true}).click();
    for (const [label,value] of [[cms.brightness,'125'],[cms.contrast,'85'],[cms.saturation,'70'],[cms.overlay,'0.35'],[cms.gradientStart,'0.8'],[cms.gradientMiddle,'0.5'],[cms.gradientEnd,'0.2']]) await expect(dialog.getByRole('slider',{name:label,exact:true})).toHaveValue(value);
    await expect(dialog.getByRole('slider',{name:cms.desktopFocal.replace('{axis}','x'),exact:true})).toHaveValue('32');
    await expect(dialog.getByRole('slider',{name:cms.mobileFocal.replace('{axis}','x'),exact:true})).toHaveValue('73');
    await expect(dialog.getByRole('button',{name:cms.alignment,exact:true})).toContainText(cms.customAlignment);
    await expect(dialog.locator('[data-cms-image-preview="mobile"] img')).toHaveCSS('filter','brightness(1.25) contrast(0.85) saturate(0.7)');
    const again = page.waitForResponse(r=>r.url().includes('/media-blocks/home.hero.image') && r.url().endsWith('/process') && r.request().method()==='POST');
    await dialog.getByRole('button',{name:cms.save,exact:true}).click();
    let reopened = await (await again).json();
    if (!reopened.revision) await expect.poll(async () => {
      const status = await request.get('/api/v1/admin/cms/media-processing/'+reopened.request_id,{headers:{Authorization:'Bearer '+token}});
      const result = await status.json(); if (result.status === 'failed') throw new Error(JSON.stringify(result.error));
      if (result.revision) {reopened=result;return true;} return false;
    },{timeout:180000,intervals:[1000,2000]}).toBe(true);
    for (const field of ['crop_data','mobile_crop_data']) {
      for (const axis of ['x','y','width','height']) expect(reopened[field][axis]).toBeCloseTo(data[field][axis],1);
    }
    const audit = JSON.parse(php('$a=App\\Models\\AuditLog::where("action","cms.media_block.published")->latest("created_at")->firstOrFail(); echo json_encode(["before"=>$a->before_data,"after"=>$a->after_data]);'));
    for (const snapshot of [audit.before,audit.after]) for (const field of ['image_style','file_id','mobile_file_id','mobile_crop_data','mobile_focal_point','crop_data','focal_x']) expect(snapshot).toHaveProperty(field);
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:info.outputPath(`${locale}-mobile.png`)});
  });
}
