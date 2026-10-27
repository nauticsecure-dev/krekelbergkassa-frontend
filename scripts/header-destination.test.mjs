import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../src/components/cms/header-destination.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { normalizeHeaderDestination, headerHref } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
test('header routes have exactly one active locale prefix', () => {
  for (const input of ['diensten/winterstalling', '/diensten/winterstalling', ' /nl/diensten/winterstalling ', '/de/diensten/winterstalling']) {
    assert.equal(normalizeHeaderDestination(input), 'diensten/winterstalling');
    for (const locale of ['nl', 'en', 'de', 'fr']) assert.equal(headerHref(input, locale), `/${locale}/diensten/winterstalling`);
  }
  assert.equal(headerHref('/nl', 'fr'), '/fr/');
});
test('invalid destinations are rejected and public rendering falls back safely', () => {
  for (const input of ['//example.com', 'https://example.com', 'javascript:alert(1)', '../admin', '/a/%2e%2e/admin', '/a\\b', '/a b', '/%2fexample.com', '/%zz']) {
    assert.throws(() => normalizeHeaderDestination(input), input);
    assert.equal(headerHref(input, 'de'), '/de/diensten/winterstalling');
  }
});
