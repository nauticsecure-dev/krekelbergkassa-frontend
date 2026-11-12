import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { randomBytes, createHash } from 'node:crypto';
import {mediaInventory} from './audit-media-coverage.mjs';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const frontend = fileURLToPath(new URL('../', import.meta.url));
const backend = path.resolve(frontend, '../krekelbergkassa-backend');
const audit = path.resolve(frontend, '../_audit');
// A fresh directory and DB file on every invocation; never use the local .env DB.
const runtime = fs.mkdtempSync(path.join(audit, 'isolated-live-'));
const database = path.join(runtime, 'fixtures.sqlite');
fs.writeFileSync(database, '');
const password = randomBytes(24).toString('base64url');
const email = 'e2e-admin@example.test';
const children = [];
const env = {
  ...process.env,
  APP_ENV: 'local', APP_DEBUG: 'false', APP_KEY: `base64:${randomBytes(32).toString('base64')}`,
  APP_CONFIG_CACHE: path.join(runtime, 'config.php'), DB_CONNECTION: 'sqlite', DB_DATABASE: database, DB_URL: '', DB_BUSY_TIMEOUT:'30000', DB_JOURNAL_MODE:'WAL', DB_TRANSACTION_MODE:'IMMEDIATE',
  CACHE_STORE: 'array', SESSION_DRIVER: 'array', MAIL_MAILER: 'array', BROADCAST_CONNECTION: 'null', QUEUE_CONNECTION: process.env.CMS_MEDIA_LIVE === '1' ? 'database' : 'sync', XDEBUG_MODE:'off',
  FILESYSTEM_DISK: 'local', FILESYSTEM_PUBLIC_ROOT:path.join(runtime,'public-media'), FILESYSTEM_LOCAL_ROOT:path.join(runtime,'private-media'), SEED_ADMIN_PASSWORD: password,
  MOLLIE_KEY: '', OPENAI_API_KEY: '', ANTHROPIC_API_KEY: '', TWILIO_ACCOUNT_SID: '', TWILIO_AUTH_TOKEN: '',
  AWS_ACCESS_KEY_ID: '', AWS_SECRET_ACCESS_KEY: '', SENTRY_LARAVEL_DSN: '', SENTRY_DSN: '',
  E2E_ADMIN_EMAIL: email, E2E_ADMIN_PASSWORD: password, PRICING_LIVE: '1',
  E2E_EXPECT_TIMEOUT: '60000',
};

function run(command, args, cwd, logName) {
  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8', windowsHide: true, maxBuffer: 10 * 1024 * 1024 });
  fs.writeFileSync(path.join(runtime, logName), (result.stdout ?? '') + (result.stderr ?? ''));
  if (result.error || result.status !== 0) throw new Error(`${logName} failed; inspect ${runtime}`);
}
function mediaEvidence(inventory, buildHash) {
  const walk = dir => fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry => entry.isDirectory() ? walk(path.join(dir,entry.name)) : [path.join(dir,entry.name)]);
  const directory = path.join(backend,'storage/quality-private');
  const runId = path.basename(runtime), artifactsDir = path.join(directory,'media-runs',runId);
  fs.mkdirSync(artifactsDir,{recursive:true});
  const proofs = walk(path.join(runtime,'pricing-results')).filter(file => file.endsWith('-proof.json')).map(file => JSON.parse(fs.readFileSync(file,'utf8')));
  const images = inventory.images.filter(row => row.classification === 'cms').map(row => {
    const matches = proofs.filter(proof => proof.id === row.id);
    const devices = new Set(matches.map(proof => proof.device));
    const artifacts = [];
    for (const proof of matches) for (const artifact of proof.artifacts) {
      const relative = path.relative(runtime,artifact.path);
      if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Evidence escaped isolated runtime');
      const destination = path.join(artifactsDir,relative); fs.mkdirSync(path.dirname(destination),{recursive:true}); fs.copyFileSync(artifact.path,destination);
      artifacts.push({path:path.relative(directory,destination).replaceAll('\\','/'),sha256:createHash('sha256').update(fs.readFileSync(destination)).digest('hex')});
    }
    const complete = devices.has('desktop') && devices.has('mobile');
    return {id:row.id,status:complete?'PASS':'UNTESTED',reason:complete?'Real Laravel browser publication and restoration on desktop and mobile.':'Both viewport executions are required.',run_id:runId,devices:[...devices],steps:complete?matches[0].steps:{},artifacts};
  });
  fs.writeFileSync(path.join(directory,'cms-media-static.json'),JSON.stringify({build_hash:buildHash,inventory},null,2));
  fs.writeFileSync(path.join(directory,'cms-media-functional.json'),JSON.stringify({build_hash:buildHash,inventory_hash:inventory.source_hash,environment:'local',images},null,2));
  fs.writeFileSync(path.join(runtime,'media-coverage.json'),JSON.stringify({scope:inventory.scope,discovered:images.length,verified:images.filter(row=>row.status==='PASS').length,images},null,2));
}
async function port() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const value = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return value;
}
function start(command, args, cwd, name) {
  const fd = fs.openSync(path.join(runtime, name), 'a');
  const child = spawn(command, args, { cwd, env, windowsHide: true, stdio: ['ignore', fd, fd] });
  fs.closeSync(fd);
  children.push(child);
  return child;
}
async function ready(url, child, headers) {
  const deadline = Date.now() + 240000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Test server exited: ${url}`);
    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
      if (response.ok && new URL(response.url).pathname === new URL(url).pathname) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Test server did not become ready: ${url}`);
}

try {
  console.log('Creating isolated SQLite tables and dummy users, products and tariffs.');
  run('php', ['artisan', 'migrate', '--force', '--no-interaction'], backend, 'migrations.txt');
  for (const name of (process.env.CMS_MEDIA_LIVE === '1' ? ['UserSeeder'] : ['UserSeeder', 'ProductSeeder', 'SettingsSeeder'])) {
    run('php', ['artisan', 'db:seed', `--class=${name}`, '--force', '--no-interaction'], backend, `${name}.txt`);
  }
  run('php', ['-r', 'require "vendor/autoload.php"; $app=require "bootstrap/app.php"; $app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap(); $user=App\\Models\\User::factory()->admin()->create(["email"=>getenv("E2E_ADMIN_EMAIL"),"password_hash"=>Illuminate\\Support\\Facades\\Hash::make(getenv("E2E_ADMIN_PASSWORD")),"locale"=>"nl-NL"]); $user->assignRole("admin");'], backend, 'dummy-admin.txt');

  const backendPort = await port();
  env.APP_URL = `http://127.0.0.1:${backendPort}`;
  // Cache Laravel bytecode: Windows PHP serves one request at a time, and
  // repeatedly compiling vendor files can exhaust the browser request timeout.
  const uploadTemporary = path.join(runtime,'upload-tmp'); fs.mkdirSync(uploadTemporary,{recursive:true});
  fs.mkdirSync(env.FILESYSTEM_PUBLIC_ROOT,{recursive:true}); fs.mkdirSync(env.FILESYSTEM_LOCAL_ROOT,{recursive:true});
  const router = path.join(runtime,'server.php');
  fs.writeFileSync(router, '<?php\n$path = rawurldecode(parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH));\nif (str_starts_with($path, "/storage/")) { $root=realpath(getenv("FILESYSTEM_PUBLIC_ROOT")); $file=realpath($root.substr($path,8)); if ($root && $file && str_starts_with(str_replace("\\\\", "/", $file), str_replace("\\\\", "/", $root)."/") && is_file($file)) { header("Content-Type: ".mime_content_type($file)); header("X-Content-Type-Options: nosniff"); readfile($file); return true; } http_response_code(404); return true; }\nrequire '+JSON.stringify(path.join(backend,'vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php').replaceAll('\\','/'))+';');
  if (process.env.CMS_MEDIA_LIVE === '1') start('php', ['-d','memory_limit=512M','artisan','queue:work','--sleep=1','--tries=3','--timeout=180'], backend, 'media-worker.txt');
  const api = start('php', ['-d', 'memory_limit=512M', '-d', 'upload_tmp_dir='+uploadTemporary, '-d', 'display_errors=0', '-d', 'display_startup_errors=0', '-d', 'zend_extension=opcache', '-d', 'opcache.enable_cli=1', '-S', '127.0.0.1:'+backendPort, router], path.join(backend, 'public'), 'backend.txt');
  await ready(`${env.APP_URL}/api/health`, api);

  const frontendPort = await port();
  env.ISOLATED_BASE_URL = env.E2E_BASE_URL = `http://127.0.0.1:${frontendPort}`;
  env.API_PROXY_TARGET = env.APP_URL;
  env.NEXT_PUBLIC_API_URL = '/api';
  env.NEXT_DIST_DIR = process.env.CMS_MEDIA_LIVE === '1' ? `.next-cms-live-${path.basename(runtime)}` : '.next-isolated-live';
  env.NEXT_FONT_GOOGLE_MOCKED_RESPONSES = path.join(frontend, 'tests/fixtures/journey-fonts.cjs');
  env.ISOLATED_TEST_RESULTS = path.join(runtime, 'pricing-results');
  const web = start(process.execPath, ['scripts/isolated-next-server.cjs', String(frontendPort)], frontend, 'frontend.txt');
  await ready(`${env.ISOLATED_BASE_URL}/nl`, web);
  // Compile the routes before timed browser actions on a cold Windows dev server.
  for (const route of (process.env.CMS_MEDIA_LIVE === '1' ? ['/en','/de','/fr'] : ['/nl/login?role=manager', '/nl/admin', '/nl/diensten/winterstalling', '/nl/admin/calculator/pricing'])) {
    console.log(`Warming isolated route: ${route}`);
    // Middleware requires cookie presence even for a compile-only HTTP request.
    // The browser tests still authenticate against Laravel with the real dummy account.
    const headers = route.startsWith('/nl/admin') ? { Cookie: 'krek_session=compile-only' } : undefined;
    await ready(`${env.ISOLATED_BASE_URL}${route}`, web, headers);
  }

  if (process.env.CMS_MEDIA_LIVE === '1') {
    env.CMS_MEDIA_LIVE = '1';
    run('php', ['scripts/cms-media-audit.php'], backend, 'cms-media-audit.json');
    const inventory = mediaInventory(frontend);
    env.CMS_MEDIA_INVENTORY_FILE = path.join(runtime,'media-inventory.json'); fs.writeFileSync(env.CMS_MEDIA_INVENTORY_FILE,JSON.stringify(inventory));
    const hash = spawnSync('php',['-r','require "vendor/autoload.php"; $app=require "bootstrap/app.php"; $app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap(); echo app(App\\Services\\Quality\\QualityCenter::class)->build()["source_hash"];'],{cwd:backend,env,encoding:'utf8',windowsHide:true});
    if (hash.status !== 0) throw new Error('Could not fingerprint the media build');
    const fixturesOnly = process.env.CMS_MEDIA_FIXTURES === '1';
    if (process.env.CMS_MEDIA_COMPLETE === '1' && !process.env.CMS_MEDIA_GREP && !fixturesOnly) {
      env.CMS_MEDIA_PREFLIGHT = '1'; env.ISOLATED_TEST_RESULTS = path.join(runtime,'preflight-results');
      run(process.execPath, ['node_modules/@playwright/test/cli.js','test','--config','playwright.cms-media-fixtures.config.ts'], frontend, 'cms-media-preflight.txt');
      env.CMS_MEDIA_PREFLIGHT = '0'; env.ISOLATED_TEST_RESULTS = path.join(runtime,'pricing-results');
    }
    try { run(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', '--config', fixturesOnly ? 'playwright.cms-media-fixtures.config.ts' : 'playwright.cms-media-live.config.ts'], frontend, 'cms-media-test.txt'); }
    finally { if (process.env.CMS_MEDIA_COMPLETE === '1') mediaEvidence(inventory,hash.stdout.trim()); }
    if (process.env.CMS_MEDIA_COMPLETE === '1' && !process.env.CMS_MEDIA_GREP && !fixturesOnly) {
      env.CMS_MEDIA_COMPLETE = '0';
      env.ISOLATED_TEST_RESULTS = path.join(runtime,'locale-results');
      run(process.execPath, ['node_modules/@playwright/test/cli.js','test','--config','playwright.cms-media-live.config.ts'], frontend, 'cms-media-locales.txt');
      env.ISOLATED_TEST_RESULTS = path.join(runtime,'fixture-results');
      run(process.execPath, ['node_modules/@playwright/test/cli.js','test','--config','playwright.cms-media-fixtures.config.ts'], frontend, 'cms-media-fixtures.txt');
    }
    fs.writeFileSync(path.join(runtime, 'result.json'), JSON.stringify({status:'passed', tests:fixturesOnly ? ['20 CMS media UI fixture cases'] : ['Laravel CMS media save/reload/reopen', ...(process.env.CMS_MEDIA_COMPLETE === '1' && !process.env.CMS_MEDIA_GREP ? ['39 images on desktop and mobile with exact restore', 'four real locale persistence cases', '20 UI fixture and session-recovery cases'] : [])], productionWrites:false}, null, 2));
    console.log('CMS media tests passed: ' + runtime);
  } else {
  console.log('Testing real staff login against the isolated backend.');
  run(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', '--config', 'playwright.config.ts', '--timeout', '120000'], frontend, 'login-test.txt');
  console.log('Testing employee tariff save, public reload, denied write and restoration.');
  run(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', '--config', 'playwright.isolated-live.config.ts'], frontend, 'pricing-test.txt');
  env.PLAYWRIGHT_BASE_URL = env.ISOLATED_BASE_URL;
  console.log('Testing pricing permission controls in the browser.');
  run(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', '--config', 'playwright.ui.config.ts', 'pricing-permissions.spec.ts'], frontend, 'pricing-permissions-test.txt');
  fs.writeFileSync(path.join(runtime, 'result.json'), JSON.stringify({ status: 'passed', tests: ['staff login', 'employee pricing save/reload/permissions/restore', 'four browser pricing permission checks'], database, productionWrites: false }, null, 2));
  console.log(`Isolated live tests passed. Results: ${runtime}`);
  }
} catch (error) {
  fs.writeFileSync(path.join(runtime, 'result.json'), JSON.stringify({ status: 'failed', error: error.message, database, productionWrites: false }, null, 2));
  console.error(error.message);
  process.exitCode = 1;
} finally {
  for (const child of children.reverse()) {
    if (child.exitCode !== null) continue;
    child.kill('SIGTERM');
    child.unref();
  }
}
