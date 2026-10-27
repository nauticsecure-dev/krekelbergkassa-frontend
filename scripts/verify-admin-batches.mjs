import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

// Restart Next between small groups so its compiled route cache stays bounded.
// Keep separate reports: a later batch must never erase earlier evidence.
fs.mkdirSync('artifacts/admin-audit', { recursive: true });
const total = 12;
const hash = createHash('sha256');
function fingerprint(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes:true }).sort((a,b)=>a.name.localeCompare(b.name))) {
    const file = `${directory}/${entry.name}`;
    if(entry.isDirectory()) fingerprint(file);
    else { hash.update(file); hash.update(fs.readFileSync(file)); }
  }
}
fingerprint('src');
for(const file of ['tests/browser/admin-audit.spec.ts','tests/browser/admin-review.spec.ts','tests/browser/pricing-permissions.spec.ts','playwright.admin-audit.config.ts','scripts/admin-audit-server.cjs','scripts/isolated-next-server.cjs','next.config.mjs','tsconfig.json','package.json']) { hash.update(file); hash.update(fs.readFileSync(file)); }
const sourceFingerprint = hash.digest('hex');
let failed = false;
for (let batch = 1; batch <= total; batch++) {
  const output = `artifacts/admin-audit/batch-${batch}`;
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
  fs.writeFileSync(stamp, sourceFingerprint+'\n');
  const child = spawn(process.execPath, ['--v8-pool-size=1', 'node_modules/@playwright/test/cli.js', 'test', '--config', 'playwright.admin-audit.config.ts', `--shard=${batch}/${total}`], {
    stdio: ['ignore', log, log],
    env: { ...process.env, ADMIN_AUDIT_OUTPUT: output, RAYON_NUM_THREADS: '1', UV_THREADPOOL_SIZE: '1', NEXT_TELEMETRY_DISABLED: '1' },
  });
  const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
  fs.closeSync(log);
  console.log(`Batch ${batch}/${total}: exit ${code}. Report: ${report}`);
  failed ||= code !== 0;
  if (!fs.existsSync(report)) throw new Error(`Batch ${batch} produced no report; resolve the server/browser startup failure before continuing.`);
}
process.exitCode = failed ? 1 : 0;
