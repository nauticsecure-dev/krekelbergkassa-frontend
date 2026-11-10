import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const slash = value => value.replaceAll('\\', '/');
function files(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(root, entry.name);
    return entry.isDirectory() ? files(file) : [file];
  }).sort();
}
function flatten(value, prefix = '', result = {}) {
  for (const [key, child] of Object.entries(value)) {
    const name = prefix ? `${prefix}.${key}` : key;
    if (typeof child === 'string') result[name] = child;
    else if (child && typeof child === 'object') flatten(child, name, result);
  }
  return result;
}

/** Static inventory deliberately cannot attest browser, database or staging PASS. */
export function scanSource(file, source) {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fields = [], references = [], findings = [], catalog = [];
  function entry(node, kind, extra = {}) {
    const line = tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1;
    const fingerprint = hash(`${slash(file)}\0${node.getText(tree)}`);
    return { file: slash(file), line, kind, fingerprint, ...extra };
  }
  function bound(node) {
    for (let parent = node.parent; parent; parent = parent.parent) {
      if (ts.isJsxElement(parent) && /^(Editable\w+|TranslatedText|CompanyText|LegalPage)$/.test(parent.openingElement.tagName.getText(tree))) return true;
    }
    return false;
  }
  function option(node) {
    for (let parent = node.parent; parent; parent = parent.parent) {
      if (ts.isJsxElement(parent) && parent.openingElement.tagName.getText(tree) === 'option') return true;
    }
    return false;
  }
  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const name = node.tagName.getText(tree);
      if (/^(TranslatedText|EditableText|CompanyText)$/.test(name)) {
        const attributes = Object.fromEntries(node.attributes.properties.filter(ts.isJsxAttribute).map(attr => {
          const value = attr.initializer;
          return [attr.name.getText(tree), value && ts.isStringLiteral(value) ? value.text
            : value && ts.isJsxExpression(value) && value.expression && ts.isStringLiteral(value.expression) ? value.expression.text : null];
        }));
        const key = attributes.textKey ? `i18n.${attributes.textKey}` : attributes.blockKey ?? (attributes.field ? `company.${attributes.field}` : null);
        const catalogOnly = node.attributes.properties.some(attr => ts.isJsxAttribute(attr) && attr.name.getText(tree) === 'inline' && attr.initializer?.getText(tree) === '{false}');
        (catalogOnly ? catalog : fields).push(entry(node, catalogOnly ? 'catalog_binding' : 'binding', { key, expression: key ? null : node.getText(tree),
          source: name === 'CompanyText' ? 'company_settings' : name === 'TranslatedText' ? 'i18n' : 'content_block',
          status: 'UNTESTED', reason: 'Requires real staging edit/database/reload/audit/restore evidence.' }));
        if (attributes.textKey) references.push({ key: attributes.textKey, ...entry(node, 'translation') });
      }
    }
    if (ts.isCallExpression(node) && node.expression.getText(tree) === 't') {
      const key = node.arguments[0];
      if (key && ts.isStringLiteral(key)) references.push({ key: key.text, ...entry(node, 'translation') });
      // Attribute values remain editable through the translation catalog.
      if (option(node) || slash(file).includes('/cms/')) {
        catalog.push(entry(node, 'catalog_translation', { key: key && ts.isStringLiteral(key) ? key.text : null,
          reason: option(node) ? 'Native option text cannot contain inline controls; edit through All texts.' : 'Editor UI translations are managed through All texts to avoid recursively mounting editors.' }));
      } else if (ts.isJsxExpression(node.parent) && !ts.isJsxAttribute(node.parent.parent) && !bound(node)) {
        findings.push(entry(node, 'unbound_translation', { key: key && ts.isStringLiteral(key) ? key.text : null }));
      }
    }
    if (ts.isJsxText(node) && /[\p{L}]/u.test(node.text.replace(/&(?:#\d+|#x[0-9a-f]+|\w+);/gi, '')) && !bound(node)) {
      findings.push(entry(node, 'hardcoded_jsx', { text: node.text.trim() }));
    }
    if (ts.isJsxExpression(node) && node.expression && !ts.isJsxAttribute(node.parent) && !bound(node)
      && (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression))) {
      findings.push(entry(node, 'dynamic_source_review', { expression: node.expression.getText(tree), status: 'UNTESTED' }));
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return { fields, references, findings, catalog };
}

export function audit(root = process.cwd()) {
  const sources = files(path.join(root, 'src')).filter(file => /\.(tsx|ts|json)$/.test(file));
  const config = fs.readFileSync(path.join(root, 'src/i18n/config.ts'), 'utf8');
  const locales = [...config.match(/export const locales = \[([^\]]+)\]/)[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
  const dictionaries = Object.fromEntries(locales.map(locale => [locale, flatten(JSON.parse(fs.readFileSync(path.join(root, `src/i18n/messages/${locale}.json`), 'utf8')))]));
  const fields = [], references = [], findings = [], routes = [], catalog = [];
  const sourceHash = crypto.createHash('sha256');
  for (const file of sources) {
    const relative = slash(path.relative(root, file)), source = fs.readFileSync(file, 'utf8');
    sourceHash.update(relative + '\0' + source);
    if (/\/page\.tsx$/.test(relative)) {
      const route = '/' + relative.replace(/^src\/app\//, '').replace(/\/page\.tsx$/, '').split('/').filter(part => !/^\(.+\)$/.test(part)).join('/');
      routes.push({ file: relative, route, status: 'UNTESTED', reason: /\[(?!locale\])/.test(route) ? 'Needs authorized record fixtures.' : 'Browser crawl and relevant UI states have not been proven.' });
    }
    if (!file.endsWith('.tsx')) continue;
    const result = scanSource(relative, source);
    fields.push(...result.fields); references.push(...result.references); findings.push(...result.findings); catalog.push(...result.catalog);
  }
  const keys = [...new Set([...Object.values(dictionaries).flatMap(dict => Object.keys(dict)), ...references.map(ref => ref.key)])].sort();
  const missing = keys.flatMap(key => locales.filter(locale => !Object.hasOwn(dictionaries[locale], key) || !dictionaries[locale][key].trim()).map(locale => ({ key, locale })));
  const used = new Set(references.map(ref => ref.key));
  const orphanCandidates = keys.filter(key => !used.has(key)); // Dynamic keys prevent declaring these actual orphans.
  const unbound = findings.filter(item => item.kind === 'unbound_translation' || item.kind === 'hardcoded_jsx');
  const roles = ['guest', 'customer', 'employee', 'admin', 'super_admin'];
  const states = ['default', 'loading', 'empty', 'error', 'modal'];
  const routeMatrix = routes.flatMap(route => locales.flatMap(locale => roles.flatMap(role => states.map(state => ({
    id: hash(`${route.file}\0${locale}\0${role}\0${state}`), route: route.route, file: route.file, locale, role, state,
    status: /\[(?!locale\])/.test(route.route) ? 'BLOCKED' : 'UNTESTED',
    reason: /\[(?!locale\])/.test(route.route) ? 'Needs an authorized record fixture.' : 'Needs a browser scenario or a reviewed not-applicable exclusion.',
  })))));
  const requiredFields = fields.flatMap(field => locales.map(locale => ({
    id: `${field.fingerprint}:${locale}`, fingerprint: field.fingerprint, key: field.key, file: field.file, locale,
    source: field.source, status: field.key ? 'UNTESTED' : 'BLOCKED',
    reason: field.key ? field.reason : 'Resolve dynamic binding to canonical record IDs during the route crawl.',
  })));
  return {
    schema: 2, generated_at: new Date().toISOString(), source_hash: sourceHash.digest('hex'),
    required_fields: requiredFields, route_matrix: routeMatrix, roles, states,
    scope: 'Static TSX candidates only. Prop/data-driven copy, Blade/email templates, runtime bindings and all UI states still require discovery and verification.',
    locales, routes, fields, findings, catalog_surfaces: catalog, missing_translations: missing, orphan_candidates: orphanCandidates,
    metrics: {
      i18n: { present: keys.length * locales.length - missing.length, required: keys.length * locales.length, missing: missing.length, fallback_counts_as_translation: false },
      inline: { bound_candidates: fields.length, required_candidates: fields.length + unbound.length, missing_candidates: unbound.length, verified: 0 },
      functional: { pass: 0, fail: 0, blocked: 0, stale: 0, untested: fields.length * locales.length, required: fields.length * locales.length },
      route_states: { pass: 0, untested: routeMatrix.filter(row => row.status === 'UNTESTED').length, blocked: routeMatrix.filter(row => row.status === 'BLOCKED').length, required: routeMatrix.length, ui_state_discovery: 'UNTESTED' },
    },
    release_status: 'BLOCKED', reason: 'Static bindings are not evidence of functional CMS coverage. Staging verification is required.',
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const report = audit();
  const output = process.argv.indexOf('--output');
  if (output >= 0) fs.writeFileSync(process.argv[output + 1], JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ source_hash: report.source_hash, routes: report.routes.length, locales: report.locales, metrics: report.metrics, release_status: report.release_status }, null, 2));
  if (process.argv.includes('--check') && (report.metrics.inline.missing_candidates || report.metrics.i18n.missing)) process.exitCode = 1;
}
