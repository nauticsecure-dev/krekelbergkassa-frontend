import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const install = args[0] === 'install';
const sharedChromium = fs.existsSync(chromium.executablePath()) ? chromium.executablePath() : undefined;
const configSpecified = args.some(arg => arg === '--config' || arg.startsWith('--config='));
const command = install ? ['install', ...(sharedChromium ? [] : ['chromium']), 'firefox', 'webkit', ...args.slice(1)]
  : ['test', ...(configSpecified ? [] : ['--config=playwright.cross-browser.config.ts']), ...args];
const env = { ...process.env, E2E_DEV_LOW_MEMORY: process.env.E2E_DEV_LOW_MEMORY ?? '1',
  PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH ?? path.join(root, '.playwright-browsers') };
if (sharedChromium) env.CROSS_BROWSER_CHROMIUM_EXECUTABLE ??= sharedChromium;
const child = spawn(process.execPath, [path.join(root, 'node_modules/@playwright/test/cli.js'), ...command],
  { cwd: root, env, stdio: 'inherit', windowsHide: true });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
