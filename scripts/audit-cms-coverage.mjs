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
      if (['EditableHeroCta', 'EditableCertificationBadge', 'EditableHiswaCard', 'EditableHeaderCta', 'EditableImage', 'EditableGlobalText', 'CompanyHoursSummary'].includes(name)) {
        const attributes = Object.fromEntries(node.attributes.properties.filter(ts.isJsxAttribute).map(attr => {
          const value = attr.initializer;
          return [attr.name.getText(tree), value && ts.isStringLiteral(value) ? value.text
            : value && ts.isJsxExpression(value) && value.expression && ts.isStringLiteral(value.expression) ? value.expression.text : null];
        }));
        const keys = name === 'EditableGlobalText' ? [attributes.settingKey]
          : name === 'CompanyHoursSummary' ? ['opening_hours.regular']
          : name === 'EditableCertificationBadge' ? ['home.werf.cert', 'home.werf.cert_sub']
          : name === 'EditableHiswaCard' ? ['over-ons.hiswa.title', 'over-ons.hiswa.desc']
          : name === 'EditableHeaderCta' ? ['header.cta.label', 'header.cta.path']
          : name === 'EditableHeroCta' ? [attributes.labelBlockKey ?? (attributes.blockKey ? `${attributes.blockKey}.label` : null), attributes.blockKey ? `${attributes.blockKey}.link` : null]
          : [attributes.blockKey ? `${attributes.blockKey}:alt_by_locale` : null, attributes.blockKey ? `${attributes.blockKey}:seo_title_by_locale` : null];
        keys.forEach((key, index) => fields.push(entry(node, 'binding', { key,
          fingerprint: hash(`${slash(file)}\0${node.getText(tree)}\0${key ?? index}`),
          editor: name, source: ['EditableHeaderCta', 'EditableGlobalText'].includes(name) ? 'company_settings' : name === 'CompanyHoursSummary' ? 'opening_hours' : name === 'EditableImage' ? 'media_block' : 'content_block',
          status: 'UNTESTED', reason: 'Requires the specialized editor, canonical database and versioned restore adapter.',
        })));
      }
      if (/^(TranslatedText|EditableText|CompanyText)$/.test(name)) {
        const attributes = Object.fromEntries(node.attributes.properties.filter(ts.isJsxAttribute).map(attr => {
          const value = attr.initializer;
          return [attr.name.getText(tree), value && ts.isStringLiteral(value) ? value.text
            : value && ts.isJsxExpression(value) && value.expression && ts.isStringLiteral(value.expression) ? value.expression.text : null];
        }));
        const key = attributes.textKey ? `i18n.${attributes.textKey}` : attributes.blockKey ?? (attributes.field ? `company.${attributes.field}` : null);
        const keyAttribute = node.attributes.properties.find(attr => ts.isJsxAttribute(attr) && ['textKey', 'blockKey'].includes(attr.name.getText(tree)));
        const expression = keyAttribute?.initializer && ts.isJsxExpression(keyAttribute.initializer) ? keyAttribute.initializer.expression : null;
        const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const keyPattern = expression && ts.isTemplateExpression(expression) ? '^' + (keyAttribute.name.getText(tree) === 'textKey' ? 'i18n\\.' : '')
          + escape(expression.head.text) + expression.templateSpans.map(span => '[a-zA-Z0-9_/-]+' + escape(span.literal.text)).join('') + '$' : null;
        const catalogOnly = node.attributes.properties.some(attr => ts.isJsxAttribute(attr) && attr.name.getText(tree) === 'inline' && attr.initializer?.getText(tree) === '{false}');
        (catalogOnly ? catalog : fields).push(entry(node, catalogOnly ? 'catalog_binding' : 'binding', { key, key_pattern: keyPattern, expression: key ? null : node.getText(tree),
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
  const fields = [], references = [], findings = [], routes = [], catalog = [], stateCandidates = [];
  const dependencies = new Map();
  const sourcePaths = new Set(sources.map(file => slash(path.relative(root, file))));
  const sourceHash = crypto.createHash('sha256');
  sourceHash.update(fs.readFileSync(fileURLToPath(import.meta.url)));
  for (const file of sources) {
    const relative = slash(path.relative(root, file)), source = fs.readFileSync(file, 'utf8');
    sourceHash.update(relative + '\0' + source);
    if (/\.(tsx|ts)$/.test(file)) {
      const tree = ts.createSourceFile(relative, source, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      const imports = [];
      function inspect(node) {
        if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          const name = node.moduleSpecifier.text;
          if (name.startsWith('@/') || name.startsWith('.')) {
            const base = name.startsWith('@/') ? 'src/' + name.slice(2) : slash(path.posix.normalize(path.posix.join(path.posix.dirname(relative), name)));
            const resolved = [base, base + '.tsx', base + '.ts', base + '/index.tsx', base + '/index.ts'].find(candidate => sourcePaths.has(candidate));
            if (resolved) imports.push(resolved);
          }
        }
        if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && /(?:Modal|Dialog|Drawer|Sheet)$/.test(node.tagName.getText(tree))) {
          const line = tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1;
          stateCandidates.push({ id: hash(`${relative}\0${node.getText(tree)}`), file: relative, line, component: node.tagName.getText(tree), state: 'modal' });
        }
        ts.forEachChild(node, inspect);
      }
      inspect(tree); dependencies.set(relative, imports);
    }
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
  const roleSource = fs.readFileSync(path.join(root, 'src/lib/auth-context.tsx'), 'utf8').match(/export type Role = ([^;]+);/)?.[1] ?? '';
  const roles = [...new Set(['guest', 'customer', ...[...roleSource.matchAll(/'([^']+)'/g)].map(match => match[1])])];
  const states = ['default', 'loading', 'empty', 'error', 'modal'];
  for (const route of routes) {
    const reachable = new Set();
    const visit = file => { if (reachable.has(file)) return; reachable.add(file); for (const child of dependencies.get(file) ?? []) visit(child); };
    visit(route.file);
    for (let directory = path.posix.dirname(route.file); directory.startsWith('src/app'); directory = path.posix.dirname(directory)) {
      for (const boundary of ['layout.tsx', 'loading.tsx', 'error.tsx', 'not-found.tsx']) if (sourcePaths.has(`${directory}/${boundary}`)) visit(`${directory}/${boundary}`);
    }
    route.dependencies = [...reachable].sort();
    route.modal_candidates = [...new Set(stateCandidates.filter(candidate => reachable.has(candidate.file)).map(candidate => candidate.id))];
  }
  const routeMatrix = routes.flatMap(route => locales.flatMap(locale => roles.flatMap(role => [...states, ...route.modal_candidates.map(id => `modal:${id}`)].map(state => ({
    id: hash(`${route.file}\0${locale}\0${role}\0${state}`), route: route.route, file: route.file, locale, role, state,
    status: /\[(?!locale\])/.test(route.route) ? 'BLOCKED' : 'UNTESTED',
    reason: /\[(?!locale\])/.test(route.route) ? 'Needs an authorized record fixture.' : 'Needs a browser scenario or a reviewed not-applicable exclusion.',
  })))));
  const resolvedFields = fields.flatMap(field => {
    if (field.key || !field.key_pattern) return [field];
    const candidates = keys.flatMap(key => [key, `i18n.${key}`]).filter(key => new RegExp(field.key_pattern).test(key));
    return candidates.length ? candidates.map(key => ({ ...field, key, fingerprint: hash(`${field.fingerprint}\0${key}`) })) : [field];
  });
  const requiredFields = [...new Map(resolvedFields.map(field => [field.fingerprint, field])).values()].flatMap(field => locales.map(locale => ({
    id: `${field.fingerprint}:${locale}`, fingerprint: field.fingerprint, key: field.key, file: field.file, locale,
    source: field.source, editor: field.editor, status: field.key ? 'UNTESTED' : 'BLOCKED',
    reason: field.key ? field.reason : 'Resolve dynamic binding to canonical record IDs during the route crawl.',
  })));
  const boundKeys = new Set(fields.map(field => field.key));
  for (const key of keys.filter(key => !boundKeys.has(`i18n.${key}`))) {
    const fingerprint = hash(`catalog\0${key}`);
    for (const locale of locales) requiredFields.push({ id: `${fingerprint}:${locale}`, fingerprint,
      key: `i18n.${key}`, file: 'src/i18n/messages', locale, source: 'content_block', surface: 'catalog',
      status: 'UNTESTED', reason: 'Requires translation catalog edit/save/database/reload/audit/restore verification.' });
  }
  return {
    schema: 2, generated_at: new Date().toISOString(), source_hash: sourceHash.digest('hex'),
    required_fields: requiredFields, route_matrix: routeMatrix, roles, states, state_candidates: stateCandidates,
    scope: 'Static TSX candidates only. Prop/data-driven copy, Blade/email templates, runtime bindings and all UI states still require discovery and verification.',
    locales, routes, fields, findings, catalog_surfaces: catalog, missing_translations: missing, orphan_candidates: orphanCandidates,
    metrics: {
      i18n: { present: keys.length * locales.length - missing.length, required: keys.length * locales.length, missing: missing.length, fallback_counts_as_translation: false },
      inline: { bound_candidates: fields.length, required_candidates: fields.length + unbound.length, missing_candidates: unbound.length, verified: 0 },
      functional: { pass: 0, fail: 0, blocked: requiredFields.filter(field => field.status === 'BLOCKED').length, stale: 0,
        untested: requiredFields.filter(field => field.status === 'UNTESTED').length, required: requiredFields.length },
      route_states: { pass: 0, untested: routeMatrix.filter(row => row.status === 'UNTESTED').length, blocked: routeMatrix.filter(row => row.status === 'BLOCKED').length, required: routeMatrix.length, ui_state_discovery: 'UNTESTED' },
    },
    release_status: 'BLOCKED', reason: 'Static bindings are not evidence of functional CMS coverage. Staging verification is required.',
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const report = audit();
  const output = process.argv.indexOf('--output');
  if (output >= 0) {
    const file = process.argv[output + 1];
    let serialized = report;
    if (process.argv.includes('--split')) {
      const manifest = (suffix, rows) => {
        const target = file + '.' + suffix + '.ndjson';
        fs.writeFileSync(target, [...rows].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0).map(row => JSON.stringify(row)).join('\n') + '\n');
        return { file: path.basename(target), sha256: hash(fs.readFileSync(target)), count: rows.length };
      };
      serialized = { ...report, required_fields: undefined, route_matrix: undefined,
        field_manifest: manifest('fields', report.required_fields), route_manifest: manifest('routes', report.route_matrix) };
    }
    fs.writeFileSync(file, JSON.stringify(serialized, null, 2) + '\n');
  }
  console.log(JSON.stringify({ source_hash: report.source_hash, routes: report.routes.length, locales: report.locales, metrics: report.metrics, release_status: report.release_status }, null, 2));
  if (process.argv.includes('--check') && (report.metrics.inline.missing_candidates || report.metrics.i18n.missing)) process.exitCode = 1;
}
