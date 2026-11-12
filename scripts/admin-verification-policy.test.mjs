import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applicability, applyApplicability, actionInventory, verificationLabel } from './lib/admin-verification-policy.mjs';

test('pending explanations never render as partial passes', () => {
  assert.equal(verificationLabel('pending: API delete exists; UI absent'), 'pending');
  assert.equal(verificationLabel('n/a: redirect'), 'n/a');
  assert.equal(verificationLabel('partial: fixture only'), 'partial');
  assert.equal(verificationLabel('pass: executed'), 'pass');
});

test('redirects and reviewed read-only pages have different obligations', () => {
  assert.ok(applicability({ route:'/admin/contracten', redirect:true }).exclusions['crud.read']);
  assert.ok(applicability({ route:'/admin/calculator/history' }).exclusions.loading);
  const audit = applicability({ route:'/admin/audit' });
  assert.ok(audit.exclusions['crud.delete']);
  assert.equal(audit.exclusions.detail, undefined);
  assert.equal(audit.exclusions.error, undefined);
});
test('unreviewed workflows never become inapplicable by absence of source signals', () => {
  assert.deepEqual(applicability({route:'/admin/new-workflow', actions:[], modals:[]}).exclusions, {});
});
test('applicability overrides smoke credit without suppressing permission obligations', () => {
  const row = {crud:{create:'pending',read:'pass',update:'pending',delete:'pending'}, permissions:{ui:'pending',backend:'pending'},error:'pass: destination error'};
  applyApplicability(row, applicability({route:'/admin/contracten',redirect:true}));
  assert.match(row.error,/^n\/a:/);
  assert.equal(row.permissions.backend,'pending');
});
test('delegated actions retain all owners and independent permission requirements', () => {
  const signal={file:'modal.tsx',line:12,text:'onSubmit={save}'};
  const result=actionInventory([{route:'/a',actions:[signal]},{route:'/b',actions:[signal]}]);
  assert.equal(result.length,1);
  assert.deepEqual(result[0].routes,['/a','/b']);
  assert.equal(result[0].directApiDenial,'pending');
});
