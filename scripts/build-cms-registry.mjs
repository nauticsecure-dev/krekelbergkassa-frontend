import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const escape = value => value.replace(/[.*+?^${}()|[\]\\~]/g, '\\$&');
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
  ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const flatten = (value, prefix = '') => Object.entries(value).flatMap(([key, child]) => typeof child === 'string'
  ? [prefix + key] : child && typeof child === 'object' ? flatten(child, prefix + key + '.') : []);

export function buildRegistry(root) {
  const patterns = new Set();
  const keys = new Set();
  const dictionaryKeys = new Set();
  const bindings = [];
  for (const file of walk(path.join(root, 'src')).filter(file => file.endsWith('.tsx')).sort()) {
    const tree = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const constants = new Map();
    const collect = node => { if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) constants.set(node.name.text, node.initializer); ts.forEachChild(node, collect); };
    collect(tree);
    const resolve = node => node && ts.isIdentifier(node) ? constants.get(node.text) ?? node : node;
    const addFields = (stems, fields) => {
      for (const stem of stems) for (const field of fields) keys.add(`${stem}.${field}`);
    };
    // TEAM is indexed by its rendered row position. Read the finite set from
    // the same array used by the page so a new card gets writable keys.
    if (file.replaceAll('\\', '/').endsWith('/(site)/over-ons/page.tsx')) {
      const team = constants.get('TEAM');
      const rows = team && ts.isAsExpression(team) ? team.expression : team;
      if (rows && ts.isArrayLiteralExpression(rows)) addFields(rows.elements.map((_, index) => `over-ons.team.${index}`), ['name', 'role']);
    }
    const attrValue = (node, name) => { const attr = node.attributes.properties.find(attr => ts.isJsxAttribute(attr) && attr.name.getText(tree) === name); return resolve(attr?.initializer && ts.isJsxExpression(attr.initializer) ? attr.initializer.expression : attr?.initializer); };
    function visit(node) {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const component = node.tagName.getText(tree);
        if (component === 'ServicePage' || component === 'LegalPage') {
          const pageNode = attrValue(node, component === 'ServicePage' ? 'cmsPage' : 'page');
          const page = pageNode && ts.isStringLiteral(pageNode) ? pageNode.text : null;
          if (page) {
            if (component === 'ServicePage') {
              for (const suffix of ['hero.badge', 'hero.title', 'hero.subtitle', 'body', 'cta.label', 'cta.title', 'cta.desc', 'price.footnote']) keys.add(`${page}.${suffix}`);
              for (const cta of ['hero.cta_primary', 'hero.cta_secondary']) for (const suffix of ['label', 'link']) keys.add(`${page}.${cta}.${suffix}`);
              for (const [prop, stem, fields] of [['features', 'feature', ['title', 'desc']], ['faqs', 'faq', ['q', 'a']]]) {
                const array = attrValue(node, prop);
                if (array && ts.isArrayLiteralExpression(array)) array.elements.forEach((_, i) => fields.forEach(field => keys.add(`${page}.${stem}.${i}.${field}`)));
              }
            } else {
              for (const suffix of ['badge', 'title', 'subtitle', 'contents', 'updated_label', 'updated_on']) keys.add(`${page}.${suffix}`);
              const sections = attrValue(node, 'sections');
              if (sections && ts.isArrayLiteralExpression(sections)) sections.elements.forEach((section, i) => {
                for (const field of ['number', 'heading']) keys.add(`${page}.section.${i}.${field}`);
                if (ts.isObjectLiteralExpression(section)) {
                  const body = section.properties.find(prop => ts.isPropertyAssignment(prop) && prop.name.getText(tree) === 'body');
                  if (body && ts.isArrayLiteralExpression(body.initializer)) body.initializer.elements.forEach((_, j) => keys.add(`${page}.section.${i}.body.${j}`));
                }
              });
            }
          }
        }
      }
      if (ts.isJsxAttribute(node) && /(?:blockKey|BlockKey)$/.test(node.name.getText(tree)) && node.initializer) {
        const expr = ts.isJsxExpression(node.initializer) ? node.initializer.expression : node.initializer;
        let pattern;
        if (expr && (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr))) { pattern = escape(expr.text); keys.add(expr.text); }
        else if (expr && ts.isTemplateExpression(expr)) pattern = escape(expr.head.text) + expr.templateSpans.map(span => '[a-zA-Z0-9_/-]+' + escape(span.literal.text)).join('');
        if (pattern) {
          patterns.add('^' + pattern + '$');
          if (node.name.getText(tree) === 'blockKey' && node.parent.parent.tagName?.getText(tree) === 'EditableHeroCta') {
            patterns.add('^' + pattern + '\\.link$'); patterns.add('^' + pattern + '\\.label$');
            if (expr && ts.isStringLiteral(expr)) { keys.add(expr.text + '.link'); keys.add(expr.text + '.label'); }
          }
          bindings.push({ pattern, file: path.relative(root, file).replaceAll('\\', '/'), component: node.parent.parent.tagName?.getText(tree) });
        }
      }
      if (ts.isStringLiteral(node) && /^(home|over-ons|diensten|verkoop|contact|faq|privacy|voorwaarden|cookies|kraanafspraak)\.[\w.-]+$/.test(node.text)) {
        const property = ts.isPropertyAssignment(node.parent) && /^(key|blockKey)$/.test(node.parent.name.getText(tree));
        let owner = node.parent;
        while (owner && !ts.isVariableDeclaration(owner) && !ts.isCallExpression(owner)) owner = owner.parent;
        const fieldArray = ts.isArrayLiteralExpression(node.parent) && owner && ts.isVariableDeclaration(owner) && /^(fields|keys)$/i.test(owner.name.getText(tree));
        if (property || fieldArray) { patterns.add('^' + escape(node.text) + '$'); keys.add(node.text); }
      }
      ts.forEachChild(node, visit);
    }
    visit(tree);
  }
  for (const name of fs.readdirSync(path.join(root, 'src/i18n/messages'))) {
    if (!name.endsWith('.json')) continue;
    for (const key of flatten(JSON.parse(fs.readFileSync(path.join(root, 'src/i18n/messages', name), 'utf8')))) { patterns.add('^' + escape('i18n.' + key) + '$'); keys.add('i18n.' + key); dictionaryKeys.add(key); }
  }
  for (const key of Object.keys(JSON.parse(fs.readFileSync(path.join(root, 'src/i18n/cms-copy.json'), 'utf8')))) { patterns.add('^' + escape('i18n.' + key) + '$'); keys.add('i18n.' + key); }
  for (const binding of bindings.filter(binding => !binding.pattern.startsWith('[') && binding.component !== 'EditableImage')) {
    for (const key of dictionaryKeys) if (new RegExp('^' + binding.pattern + '$').test(key)) keys.add(key);
  }
  // These repeaters deliberately use different CMS and translation namespaces.
  const dutch = JSON.parse(fs.readFileSync(path.join(root, 'src/i18n/messages/nl.json'), 'utf8'));
  for (const [prefix, entries, fields] of [
    ['over-ons.stat', dutch.over.stats, ['value', 'label']],
    ['over-ons.value', dutch.over.values, ['title', 'desc']],
    ['over-ons.timeline', dutch.over.timeline, ['year', 'title', 'desc']],
    ['diensten.faq', dutch.werf.faq, ['a']],
  ]) {
    for (const id of Object.keys(entries)) for (const field of fields) keys.add(`${prefix}.${id}.${field}`);
  }
  for (const key of Object.keys(dutch.verkoopPage)) {
    if (/^stat\d+$/.test(key)) {
      for (const field of ['value', 'label']) keys.add(`verkoop.stat.${key.slice(4)}.${field}`);
    }
    if (/^step\d+$/.test(key)) {
      for (const field of ['number', 'title', 'desc']) keys.add(`verkoop.${key}.${field}`);
    }
  }
  // Pricing copy is a finite vocabulary, shared by each registered service page.
  const pricing = flatten(dutch).filter(key => key.startsWith('yardPricing.')).map(key => key.slice(12));
  for (const page of ['diensten', 'diensten/afspuiten', 'diensten/winterstalling', 'diensten/weekje-op-wal', 'diensten/zelf-werken']) for (const name of pricing) keys.add(`${page}.pricing.${name}`);
  return { schema: 2, content_keys: [...keys].sort(), content_patterns: [...patterns].sort(), bindings };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const output = path.resolve(root, '../krekelbergkassa-backend/resources/cms/field-registry.json');
  const expected = JSON.stringify(buildRegistry(root), null, 2) + '\n';
  const emailOutput = path.resolve(root, '../krekelbergkassa-backend/resources/cms/email-defaults.json');
  const emailDefaults = Object.fromEntries(['nl', 'en', 'de', 'fr'].map(locale => [locale, JSON.parse(fs.readFileSync(path.join(root, `src/i18n/messages/${locale}.json`), 'utf8')).email]));
  const emailExpected = JSON.stringify(emailDefaults, null, 2) + '\n';
  const serviceOutput = path.resolve(root, '../krekelbergkassa-backend/resources/cms/home-service-defaults.json');
  const serviceDefaults = Object.fromEntries(['nl', 'en', 'de', 'fr'].map(locale => [locale, JSON.parse(fs.readFileSync(path.join(root, `src/i18n/messages/${locale}.json`), 'utf8')).home.svc]));
  const serviceExpected = JSON.stringify(serviceDefaults, null, 2) + '\n';
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(output) || fs.readFileSync(output, 'utf8') !== expected) throw new Error('CMS field registry is stale. Run node scripts/build-cms-registry.mjs.');
    if (!fs.existsSync(emailOutput) || fs.readFileSync(emailOutput, 'utf8') !== emailExpected) throw new Error('CMS email defaults are stale. Run node scripts/build-cms-registry.mjs.');
    if (!fs.existsSync(serviceOutput) || fs.readFileSync(serviceOutput, 'utf8') !== serviceExpected) throw new Error('CMS service defaults are stale. Run node scripts/build-cms-registry.mjs.');
  } else {
    fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, expected);
    fs.writeFileSync(emailOutput, emailExpected);
    fs.writeFileSync(serviceOutput, serviceExpected);
  }
}
