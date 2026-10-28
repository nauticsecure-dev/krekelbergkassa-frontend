import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function moduleUrl(source) {
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext },
  }).outputText;
  return `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`;
}

const routes = moduleUrl(fs.readFileSync(new URL('../src/config/admin-routes.ts', import.meta.url), 'utf8'));
const source = fs.readFileSync(new URL('../src/lib/invoice-provenance.ts', import.meta.url), 'utf8')
  .replace("'@/config/admin-routes'", JSON.stringify(routes));
const { invoiceProvenance } = await import(moduleUrl(source));

test('wallet invoices use the nested customer returned by the invoice API', () => {
  assert.deepEqual(invoiceProvenance('de', {
    id: 'invoice-1', source: 'manual', source_type: 'wallet',
    customer: { id: 'customer-uuid', public_id: 'CUST-001', slug: 'customer-name' },
  }), { href: '/de/admin/klanten/CUST-001/customer-name', label: 'Rekeningoverzicht' });
  assert.equal(invoiceProvenance('de', {
    id: 'invoice-1', source: 'manual', source_type: 'wallet',
  }), null);
});

test('work order provenance uses the work order route without an unsupported entity section', () => {
  assert.deepEqual(invoiceProvenance('fr', {
    id: 'invoice-1', source: 'manual', source_type: 'work_order', source_id: 'work order/1',
  }), { href: '/fr/admin/werkorders/work%20order%2F1', label: 'Werkorder' });
});

test('storage provenance supports public IDs and the source ID fallback', () => {
  assert.equal(invoiceProvenance('en', {
    id: 'invoice-1', source: 'stalling', stalling_contract_id: 'contract-uuid',
    stalling_contract: { id: 'contract-uuid', public_id: 'ST-001', slug: 'winter', contract_number: 'ST-001' },
  }).href, '/en/admin/stalling/ST-001/winter');
  assert.equal(invoiceProvenance('nl', {
    id: 'invoice-1', source: 'stalling', stalling_contract_id: 'contract-uuid',
  }).href, '/nl/admin/stalling/contract-uuid');
});
