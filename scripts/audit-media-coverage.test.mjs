import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {mediaInventory} from './audit-media-coverage.mjs';

test('discovers literal, loop, shared-service, runtime and vector images without attesting PASS', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'media-inventory-'));
  const dir = path.join(root,'src/app/[locale]/(site)'); fs.mkdirSync(dir,{recursive:true});
  try {
    fs.writeFileSync(path.join(dir,'page.tsx'), 'const CMS_PAGE="home"; const services=[{key:"wash",img:"/wash.webp"},{key:"crane",img:"/crane.webp"}]; export default <><EditableImage blockKey="home.hero.image" page={CMS_PAGE} fallbackSrc="/hero.webp" />{services.map(s=><EditableImage blockKey={`home.svc.${s.key}.image`} page={CMS_PAGE} fallbackSrc={s.img}/>) }<ServicePage cmsPage="diensten/test" inlineImage="/inline.webp" editableHeroImage={<span/>}/><img src={remote}/><svg/></>;');
    const inventory = mediaInventory(root);
    assert.deepEqual(inventory.images.filter(r=>r.classification==='cms').map(r=>r.key).sort(),['diensten/test.inline.image','home.hero.image','home.svc.crane.image','home.svc.wash.image']);
    assert.equal(inventory.counts.runtime,1); assert.equal(inventory.counts.vector,1);
    assert.ok(inventory.images.every(row=>row.status !== 'PASS'));
    const previous = inventory.source_hash; fs.appendFileSync(path.join(dir,'page.tsx'),'\n// changed');
    assert.notEqual(mediaInventory(root).source_hash,previous);
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
});
