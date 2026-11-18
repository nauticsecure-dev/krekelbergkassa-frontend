import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';

// Restart Next between small groups so its compiled route cache stays bounded.
// Keep separate reports: a later batch must never erase earlier evidence.
fs.mkdirSync('artifacts/admin-audit', { recursive: true });
const grep = process.env.ADMIN_AUDIT_GREP;
const total = grep ? 1 : 12;
const port = process.env.ADMIN_AUDIT_PORT ?? '3047';
const frontendUrl = `http://127.0.0.1:${port}/sw.js`;
const hash = createHash('sha256');
function fingerprint(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes:true }).sort((a,b)=>a.name.localeCompare(b.name))) {
    const file = `${directory}/${entry.name}`;
    if(entry.isDirectory()) fingerprint(file);
    else { hash.update(file); hash.update(fs.readFileSync(file)); }
  }
}
fingerprint('src');
for(const file of ['tests/browser/admin-audit.spec.ts','tests/browser/admin-review.spec.ts','tests/browser/pricing-permissions.spec.ts','playwright.admin-audit.config.ts','scripts/verify-admin-batches.mjs','scripts/admin-audit-server.cjs','scripts/isolated-next-server.cjs','next.config.mjs','tsconfig.json','package.json']) { hash.update(file); hash.update(fs.readFileSync(file)); }
const matrix = JSON.parse(fs.readFileSync('artifacts/admin-audit/source-matrix.json', 'utf8'));
hash.update(JSON.stringify(matrix.pages.map(({ route, redirect }) => ({ route, redirect }))));
const sourceFingerprint = hash.digest('hex');
let failed = false;
for (let batch = 1; batch <= total; batch++) {
  const suffix = grep ? `filtered-${createHash('sha256').update(grep).digest('hex').slice(0, 12)}` : `batch-${batch}`;
  const output = `artifacts/admin-audit/${suffix}`;
  const report = `${output}-results.json`;
  const stamp = `${output}-source.txt`;
  if (fs.existsSync(report) && fs.existsSync(stamp) && fs.readFileSync(stamp,'utf8').trim()===sourceFingerprint) {
    const result = JSON.parse(fs.readFileSync(report, 'utf8'));
    if (result.stats.unexpected === 0 && result.stats.interrupted === 0 && !result.errors.length) {
      console.log(`Batch ${batch}/${total}: existing passing evidence retained.`);
      continue;
    }
  }
  console.log(`Batch ${batch}/${total}: starting.`);
  const log = fs.openSync(`${output}.txt`, 'w');
  const env = { ...process.env, ADMIN_AUDIT_OUTPUT: output, ADMIN_AUDIT_PORT: port, ADMIN_AUDIT_EXTERNAL_SERVER: '1',
    RAYON_NUM_THREADS: '1', UV_THREADPOOL_SIZE: '1', NEXT_TELEMETRY_DISABLED: '1',
    NEXT_DIST_DIR: '.next-admin-audit', NEXT_PUBLIC_API_URL: '/api', API_PROXY_TARGET: 'http://127.0.0.1:9',
    NEXT_FONT_GOOGLE_MOCKED_RESPONSES: path.resolve('tests/fixtures/journey-fonts.cjs') };
  const options = { stdio: ['ignore', log, log], env, windowsHide: true };
  let web;
  let code;
  try {
    const existingServer = await fetch(frontendUrl, { signal: AbortSignal.timeout(2000) }).catch(() => null);
    if (existingServer) throw new Error(`Admin audit port ${port} is already in use.`);
    // Playwright's process-tree shutdown can hang on Windows when taskkill is unavailable.
    web = spawn(process.execPath, ['--v8-pool-size=1', 'scripts/admin-audit-server.cjs'], options);
    let webFailure;
    web.once('error', error => { webFailure = error; });
    const deadline = Date.now() + 300_000;
    while (true) {
      if (webFailure || web.exitCode !== null || web.signalCode !== null || Date.now() > deadline) {
        throw new Error(`Admin audit server did not start. See ${output}.txt`, { cause: webFailure });
      }
      const response = await fetch(frontendUrl, { signal: AbortSignal.timeout(5000) }).catch(() => null);
      if (response?.ok) break;
      await delay(250);
    }
    const args = grep ? ['--grep', grep] : [`--shard=${batch}/${total}`];
    const child = spawn(process.execPath, ['--v8-pool-size=1', 'node_modules/@playwright/test/cli.js', 'test', '--config', 'playwright.admin-audit.config.ts', ...args], options);
    [code] = await once(child, 'exit');
  } finally {
    if (web?.pid && web.exitCode === null && web.signalCode === null) {
      const stopped = once(web, 'exit');
      if (web.kill()) await stopped;
    }
    fs.closeSync(log);
  }
  console.log(`Batch ${batch}/${total}: exit ${code}. Report: ${report}`);
  failed ||= code !== 0;
  if (!fs.existsSync(report)) throw new Error(`Batch ${batch} produced no report; resolve the server/browser startup failure before continuing.`);
  if (code === 0) fs.writeFileSync(stamp, sourceFingerprint+'\n');
}
process.exitCode = failed ? 1 : 0;
