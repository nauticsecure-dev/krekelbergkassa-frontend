import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('../', import.meta.url));
const cli = fileURLToPath(new URL('../node_modules/@playwright/test/cli.js', import.meta.url));
// Each batch gets a fresh dev server; keep locale reloads separate from route compilation.
const batches = [
  ['previews and page coverage', ['cms-media.spec.ts', '--output', 'artifacts/cms-media-pages']],
  ['persistence and session recovery', ['cms-persistence.spec.ts', 'cms-session-safety.spec.ts',
    '--grep', 'image draft/crop|expired image', '--output', 'artifacts/cms-media-session']],
];
let failed = false;
for (const [name, args] of batches) {
  console.log(`CMS media QA: ${name}`);
  const result = spawnSync(process.execPath, [cli, 'test', '--config', 'playwright.cms-media.config.ts', ...args], {
    cwd, stdio: 'inherit', env: process.env,
  });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) failed = true;
}
process.exitCode = failed ? 1 : 0;
