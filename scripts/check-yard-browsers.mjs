import { chromium, firefox, webkit } from 'playwright';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

// Exercise content-process creation, not just browser launch. Restricted Windows
// process tokens can launch Firefox but prevent every tab subprocess from starting.
export async function checkYardBrowsers(chromiumExecutable) {
  const results = [];
  for (const type of [webkit, firefox, chromium]) {
    let browser;
    try {
      browser = await type.launch(type === chromium && chromiumExecutable ? { executablePath: chromiumExecutable } : {});
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.setContent('<title>Yard browser startup</title>');
      if (await page.title() !== 'Yard browser startup') throw new Error('Content process did not respond');
      results.push({ engine: type.name(), version: browser.version(), status: 'PASS' });
    } catch (error) {
      throw new Error(`${type.name()} content-process startup failed: ${error.message}. On restricted Windows runners, allow browser child processes in the execution environment; keep the browser sandbox enabled.`);
    } finally {
      await browser?.close();
    }
  }
  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const results = await checkYardBrowsers(process.env.CROSS_BROWSER_CHROMIUM_EXECUTABLE);
    if (process.env.YARD_STARTUP_REPORT_FILE) fs.writeFileSync(process.env.YARD_STARTUP_REPORT_FILE, JSON.stringify(results, null, 2));
    console.log('PASS: WebKit, Firefox and Chromium content processes started.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
