import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

// Explicit opt-in: this test changes a local database tariff and restores it in finally.
test.skip(process.env.PRICING_LIVE !== '1', 'Requires a running local Laravel database and frontend');
const backend = path.resolve('../krekelbergkassa-backend');
const boot = 'require "vendor/autoload.php"; $app=require "bootstrap/app.php"; $app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap(); if (!$app->environment("local")) { throw new RuntimeException("Local environment required"); } ';
function php(code: string, args: string[] = []) {
  return execFileSync('php', ['-r', boot + code, ...args], { cwd: backend, encoding: 'utf8' });
}

test('real employee saves Winterstalling, sees public tariff, and unauthorized writes fail', async ({ page, request }, testInfo) => {
  test.setTimeout(180_000);
  let credentials: { token: string; tokenId: number } | undefined;
  let original: any;
  let changed = false;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    credentials = JSON.parse(php('$u=App\\Models\\User::where("role","employee")->where("active",true)->firstOrFail(); if (!$u->can("pricing.update")) { throw new RuntimeException("Employee lacks pricing.update"); } $t=$u->createToken("pricing-browser-verification",["*"],now()->addMinutes(10)); echo json_encode(["token"=>$t->plainTextToken,"tokenId"=>$t->accessToken->id]);'));
    const headers = { Authorization: `Bearer ${credentials!.token}` };
    const list = await request.get('/api/v1/pricing/rules?product=STALL-WINTER&include_inactive=true', { headers });
    expect(list.ok(), await list.text()).toBe(true);
    original = (await list.json()).find((rule: any) => rule.active && rule.channel === 'all' && rule.range_from_cm === 0);
    expect(original).toBeTruthy();
    const cents = original.price_incl_vat + 123;
    const euros = (cents / 100).toFixed(2);
    await page.context().addCookies([{ name: 'krek_session', value: credentials!.token, url: String(testInfo.project.use.baseURL) }]);
    await page.goto('/nl/diensten/winterstalling');
    await page.getByRole('link', { name: 'Tarieven aanpassen' }).click();
    await expect(page).toHaveURL(/admin\/calculator\/pricing\?product=STALL-WINTER/);
    const row = page.locator('tbody tr').filter({ hasText: '0 – 499 cm' });
    await row.getByRole('button', { name: 'Bewerken', exact: true }).click();
    await page.getByRole('spinbutton', { name: 'Prijs incl. BTW (€)' }).fill(euros);
    const save = page.waitForResponse((response) => response.url().includes(`/pricing/rules/${original.id}`) && response.request().method() === 'PATCH');
    await page.getByRole('button', { name: 'Opslaan', exact: true }).click();
    const saved = await save;
    changed = saved.ok();
    expect(saved.ok(), await saved.text()).toBe(true);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.reload();
    const formatted = new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100);
    await expect(page.locator('tbody tr').filter({ hasText: '0 – 499 cm' })).toContainText(formatted);
    await page.goto('/nl/diensten/winterstalling');
    await expect(page.getByText(`€ ${formatted}`, { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('winterstalling-public-updated.png'), fullPage: true });
    const denied = await request.patch(`/api/v1/pricing/rules/${original.id}`, { headers: { Accept: 'application/json' }, data: { price_incl_vat: 1 } });
    expect([401, 403]).toContain(denied.status());
    const evidence = JSON.parse(php('$a=App\\Models\\AuditLog::where("action","pricing_rule.updated")->where("entity_id",$argv[1])->latest("created_at")->firstOrFail(); echo json_encode(["before"=>$a->before_data["price_incl_vat"],"after"=>$a->after_data["price_incl_vat"],"actor"=>$a->user_id !== null]);', [original.id]));
    expect(evidence).toEqual({ before: original.price_incl_vat, after: cents, actor: true });
    expect(errors).toEqual([]);
  } finally {
    if (changed && credentials && original) {
      const restored = await request.patch(`/api/v1/pricing/rules/${original.id}`, {
        headers: { Authorization: `Bearer ${credentials.token}` },
        data: { price_incl_vat: original.price_incl_vat, price_excl_vat: original.price_excl_vat },
      });
      expect(restored.ok(), 'Restore original Winterstalling price').toBe(true);
    }
    if (credentials) php('Laravel\\Sanctum\\PersonalAccessToken::whereKey($argv[1])->delete();', [String(credentials.tokenId)]);
  }
});
