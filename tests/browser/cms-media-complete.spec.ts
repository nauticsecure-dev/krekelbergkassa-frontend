import {expect, test} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import en from '../../src/i18n/messages/en.json';

test.skip(process.env.CMS_MEDIA_LIVE !== '1', 'Requires the isolated Laravel runner.');
const cms = en.cms;
const backend = path.resolve('../krekelbergkassa-backend');
const boot = 'require "vendor/autoload.php"; $app=require "bootstrap/app.php"; $app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap(); if (!$app->environment("local") || config("database.default") !== "sqlite") throw new RuntimeException("Isolated SQLite required"); ';
const php = (code:string) => execFileSync('php',['-r',boot+code],{cwd:backend,encoding:'utf8'}).trim();
const digest = (bytes:Buffer|string) => createHash('sha256').update(bytes).digest('hex');
const qaImage = process.env.CMS_MEDIA_LIVE === '1' ? Buffer.from(php('$g=imagecreatetruecolor(600,400); imagefilledrectangle($g,0,0,299,399,imagecolorallocate($g,30,90,150)); imagefilledrectangle($g,300,0,599,399,imagecolorallocate($g,240,170,40)); ob_start(); imagepng($g); echo base64_encode(ob_get_clean()); imagedestroy($g);'),'base64') : Buffer.alloc(0);
const inventory = (process.env.CMS_MEDIA_INVENTORY_FILE ? JSON.parse(fs.readFileSync(process.env.CMS_MEDIA_INVENTORY_FILE,'utf8')) : {images:[]}) as {images:Array<{classification:string;key:string;page:string}>};
const routes = [...new Set<string>(inventory.images.filter((r:{classification:string}) => r.classification === 'cms').map((r:{page:string}) => r.page))].sort((a,b) => inventory.images.filter(r => r.classification === 'cms' && r.page === b).length - inventory.images.filter(r => r.classification === 'cms' && r.page === a).length);
const steps = ['upload','webp','render','alt','crop','rotation','styles','mobile','save','database','reload','audit','restore'];

for (const route of routes) {
  test(`every CMS image completes publication and restoration: ${route} desktop and mobile`, async ({page,request}, info) => {
    test.setTimeout(900_000);
    const token = php('$u=App\\Models\\User::where("role","super_admin")->firstOrFail(); echo $u->createToken("media-complete")->plainTextToken;');
    await page.context().addCookies([{name:'krek_session',value:token,url:String(info.project.use.baseURL)}]);
    if (route === 'diensten') await page.route('**/service-catalog/services*', request => request.abort('failed'));
    for (const device of ['desktop','mobile']) {
    await page.setViewportSize(device === 'mobile' ? {width:390,height:844} : {width:1440,height:1000});
    const url = '/en'+(route === 'home' ? '' : '/'+route);
    await page.goto(url);
    await page.getByRole('button',{name:cms.enterEdit,exact:true}).click();
    const expected = inventory.images.filter((r:{classification:string;page:string}) => r.classification === 'cms' && r.page === route).map((r:{key:string}) => r.key);
    await expect.poll(() => page.locator('[data-cms-image]').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-cms-block')).sort())).toEqual([...expected].sort());
    for (const key of expected) {
      await test.step(key, async () => {
        const block = page.locator('[data-cms-image]').filter({has:page.locator('[data-cms-edit]')}).and(page.locator(`[data-cms-block="${key}"]`));
        await block.getByRole('button',{name:cms.editImage,exact:true}).click();
        const dialog = page.getByRole('dialog');
        await dialog.locator('input[type=file]').first().setInputFiles({name:'media-qa.png',mimeType:'image/png',buffer:qaImage});
        await dialog.getByLabel(cms.uploadMobileImage,{exact:true}).setInputFiles({name:'mobile-qa.png',mimeType:'image/png',buffer:qaImage});
        await dialog.getByLabel(cms.cropPreset,{exact:true}).selectOption('1');
        await dialog.getByRole('button',{name:cms.rotateRight,exact:true}).first().click();
        await dialog.getByRole('slider',{name:cms.zoom,exact:true}).fill('1.2');
        await dialog.getByRole('slider',{name:cms.mobileZoom,exact:true}).fill('1.3');
        await dialog.getByRole('slider',{name:cms.brightness,exact:true}).fill('110');
        await dialog.getByRole('slider',{name:cms.contrast,exact:true}).fill('90');
        await dialog.getByRole('slider',{name:cms.overlay,exact:true}).fill('0.25');
        for (const tag of ['NL','EN','DE','FR']) {
          await dialog.getByRole('tab',{name:tag,exact:true}).click();
          await dialog.getByLabel(cms.altText+' '+tag,{exact:true}).fill('QA '+key+' '+tag);
        }
        if (key === 'home.hero.image' && device === 'desktop') {
          await dialog.getByLabel(cms.pageContextPreview,{exact:true}).check();
          const preview = page.frameLocator('iframe').first();
          await expect(preview.locator('[data-cms-block="home.hero.image"] img')).toHaveAttribute('alt','QA '+key+' FR');
          await page.screenshot({path:info.outputPath('page-context-preview.png')});
          await dialog.getByLabel(cms.pageContextPreview,{exact:true}).uncheck();
        }
        const publish = page.waitForResponse(r => r.url().endsWith('/'+encodeURIComponent(key)+'/process') && r.request().method() === 'POST');
        await dialog.getByRole('button',{name:cms.save,exact:true}).click();
        const response = await publish;
        expect(response.ok(),await response.text()).toBe(true);
        let saved = await response.json();
        if (!saved.revision) await expect.poll(async () => {
          const status = await request.get('/api/v1/admin/cms/media-processing/'+saved.request_id,{headers:{Authorization:'Bearer '+token}});
          const result = await status.json();
          if (result.status === 'failed') throw new Error(JSON.stringify(result.error));
          if (result.revision) { saved = result; return true; } return false;
        },{timeout:180000,intervals:[1000,2000]}).toBe(true);
        const previous = saved.revision - 1;
        expect(saved.rotation).toBe(90); expect(saved.crop_data.unit).toBe('percent');
        expect(saved.image_style.brightness).toBe(110); expect(saved.mobile_file_id).toBeTruthy();
        for (const assetUrl of [saved.image_url,saved.mobile_image_url,...saved.src_set.split(', ').map((s:string) => s.split(' ')[0])]) {
          const asset = await request.get(assetUrl); expect(asset.ok()).toBe(true);
          const bytes = await asset.body(); expect(bytes.subarray(0,4).toString()).toBe('RIFF'); expect(bytes.subarray(8,12).toString()).toBe('WEBP');
        }
        await expect(dialog).toHaveCount(0);
        await page.reload();
        const rendered = page.locator(`[data-cms-block="${key}"] img`);
        await rendered.scrollIntoViewIfNeeded();
        await expect(rendered).toHaveAttribute('alt','QA '+key+' EN');
        await expect.poll(() => rendered.evaluate((img:HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
        await expect(rendered).toHaveCSS('filter','none');
        const database = JSON.parse(php('$b=App\\Models\\MediaBlock::where("key",'+JSON.stringify(key)+')->firstOrFail(); $a=App\\Models\\AuditLog::where("entity_id",$b->id)->where("action","cms.media_block.published")->latest("created_at")->firstOrFail(); echo json_encode(["block"=>$b,"audit"=>["before"=>$a->before_data,"after"=>$a->after_data]]);'));
        expect(database.block.revision).toBe(saved.revision);
        expect(database.block.file_id).toBe(saved.file_id);
        expect(database.audit.after.file_id).toBe(saved.file_id);
        const shot = info.outputPath((key.replaceAll('/','_')+'-'+device)+'-published.png');
        await page.screenshot({path:shot});
        await page.getByRole('button',{name:cms.enterEdit,exact:true}).click();
        await page.locator(`[data-cms-block="${key}"] [data-cms-edit]`).click();
        await expect(dialog.getByRole('slider',{name:cms.brightness,exact:true})).toHaveValue('110');
        await dialog.getByLabel(cms.previousVersion,{exact:true}).selectOption(String(previous));
        const restoredResponse = page.waitForResponse(r => r.url().endsWith('/'+encodeURIComponent(key)+'/restore') && r.request().method() === 'POST');
        await dialog.getByRole('button',{name:cms.restoreVersion,exact:true}).click();
        const restored = await restoredResponse; if (!restored.ok()) throw new Error(await restored.text()); expect(restored.ok()).toBe(true);
        await page.waitForLoadState('networkidle');
        await expect(dialog).toHaveCount(0);
        const restoration = JSON.parse(php('$b=App\\Models\\MediaBlock::where("key",'+JSON.stringify(key)+')->firstOrFail(); $v=Illuminate\\Support\\Facades\\DB::table("media_block_versions")->where("media_block_id",$b->id)->where("revision",'+previous+')->first(); $s=json_decode($v->snapshot,true); echo json_encode(["expected"=>$s,"actual"=>$b->only(array_keys($s))]);'));
        expect(restoration.actual).toEqual(restoration.expected);
        const artifact = info.outputPath((key.replaceAll('/','_')+'-'+device)+'-evidence.json');
        fs.writeFileSync(artifact,JSON.stringify({key,device,route,scenario:route === 'diensten' ? 'catalog network unavailable' : 'normal',saved,database,restoration,steps:Object.fromEntries(steps.map(s => [s,true]))},null,2));
        // Runner aggregates only completed assertions. Failed tests never emit a PASS row.
        fs.writeFileSync(info.outputPath((key.replaceAll('/','_')+'-'+device)+'-proof.json'),JSON.stringify({id:'cms:'+key,status:'PASS',run_id:path.basename(process.env.ISOLATED_TEST_RESULTS!),device,steps:Object.fromEntries(steps.map(s => [s,true])),artifacts:[{path:artifact,sha256:digest(fs.readFileSync(artifact))},{path:shot,sha256:digest(fs.readFileSync(shot))}]}));
        await page.getByRole('button',{name:cms.enterEdit,exact:true}).click();
      });
    }
    }
  });
}
