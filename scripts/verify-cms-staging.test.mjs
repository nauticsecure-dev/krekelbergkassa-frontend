import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { scenarioFor } from './lib/cms-scenarios.mjs';

test('public route scenarios assert the current route and CMS authorization', () => {
  const row = { id: 'route-id', file: 'src/app/[locale]/(site)/diensten/[slug]/page.tsx',
    route: '/[locale]/diensten/[slug]', role: 'super_admin', state: 'default' };
  const config = { routeFixtures: { [row.route]: '/[locale]/diensten/kranen' } };
  assert.equal(scenarioFor(row, config).expectedURL, '/[locale]/diensten/kranen');
  assert.deepEqual(scenarioFor(row, config).assertions.at(-1), { enabled: '[data-cms-toggle]' });
  assert.deepEqual(scenarioFor({ ...row, role: 'guest' }, config).assertions.at(-1), { hidden: '[data-cms-toggle]' });
  assert.equal(scenarioFor({ ...row, state: 'modal' }, config).readOnly, true);
  assert.equal(scenarioFor({ ...row, state: 'error' }, config), null);
  const override = { assertions: [{ visible: 'article' }] };
  assert.equal(scenarioFor(row, { ...config, scenarios: { [row.id]: override } }), override);
});

for (const [environment, baseURL] of [['staging', 'https://staging.example.test'], ['local', 'http://127.0.0.1:3030']]) {
  test(`frozen source optimization rejects ${environment} without an isolated snapshot`, () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cms-source-policy-'));
    try {
      const fixtures = path.join(directory, 'fixtures.json');
      fs.writeFileSync(fixtures, JSON.stringify({ environment, baseURL, frozenLocalSource: true }));
      const result = spawnSync(process.execPath, ['scripts/verify-cms-staging.mjs', '--fixtures', fixtures], {
        encoding: 'utf8', env: { ...process.env, CMS_TEXT_ISOLATED: '1' }, windowsHide: true,
      });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Frozen source optimization requires an isolated local snapshot/);
    } finally { fs.rmSync(directory, { recursive: true, force: true }); }
  });
}
