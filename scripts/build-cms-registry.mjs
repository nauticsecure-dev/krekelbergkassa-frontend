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
  const bindings = [];
  for (const file of walk(path.join(root, 'src')).filter(file => file.endsWith('.tsx'))) {
    const tree = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node) {
      if (ts.isJsxAttribute(node) && /(?:blockKey|BlockKey)$/.test(node.name.getText(tree)) && node.initializer) {
        const expr = ts.isJsxExpression(node.initializer) ? node.initializer.expression : node.initializer;
        let pattern;
        if (expr && (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr))) pattern = escape(expr.text);
        else if (expr && ts.isTemplateExpression(expr)) pattern = escape(expr.head.text) + expr.templateSpans.map(span => '[a-zA-Z0-9_-]+' + escape(span.literal.text)).join('');
        if (pattern) {
          patterns.add('^' + pattern + '$');
          if (node.name.getText(tree) === 'blockKey' && node.parent.parent.tagName?.getText(tree) === 'EditableHeroCta') {
            patterns.add('^' + pattern + '\\.link$'); patterns.add('^' + pattern + '\\.label$');
          }
          bindings.push({ pattern, file: path.relative(root, file).replaceAll('\\', '/') });
        }
      }
      if (ts.isStringLiteral(node) && /^(home|over-ons|diensten|verkoop|contact|faq|privacy|voorwaarden|cookies|kraanafspraak)\.[\w.-]+$/.test(node.text)) patterns.add('^' + escape(node.text) + '$');
      ts.forEachChild(node, visit);
    }
    visit(tree);
  }
  for (const name of fs.readdirSync(path.join(root, 'src/i18n/messages'))) {
    if (!name.endsWith('.json')) continue;
    for (const key of flatten(JSON.parse(fs.readFileSync(path.join(root, 'src/i18n/messages', name), 'utf8')))) patterns.add('^' + escape('i18n.' + key) + '$');
  }
  for (const key of Object.keys(JSON.parse(fs.readFileSync(path.join(root, 'src/i18n/cms-copy.json'), 'utf8')))) patterns.add('^' + escape('i18n.' + key) + '$');
  return { schema: 1, content_patterns: [...patterns].sort(), bindings };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const output = path.resolve(root, '../krekelbergkassa-backend/resources/cms/field-registry.json');
  const expected = JSON.stringify(buildRegistry(root), null, 2) + '\n';
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(output) || fs.readFileSync(output, 'utf8') !== expected) throw new Error('CMS field registry is stale. Run node scripts/build-cms-registry.mjs.');
  } else {
    fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, expected);
  }
}
