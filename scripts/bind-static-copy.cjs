// One-time migration of literal JSX copy. IDs are persisted in source, never derived at runtime.
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
let bindings = 0, changedFiles = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(file); continue; }
    if (!file.endsWith('.tsx') || file.includes(`${path.sep}cms${path.sep}`)) continue;
    let source = fs.readFileSync(file, 'utf8');
    // Generic UI primitives can be mounted outside the locale/CMS provider.
    if (!source.includes('useIntl') && !source.includes('TranslatedText') && !file.includes('[locale]') && !file.endsWith('CalendarAdminViews.tsx')) continue;
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const edits = [];
    function visit(node) {
      if (ts.isJsxText(node) && /[\p{L}]/u.test(node.text)) {
        let skip = false, catalogOnly = false;
        for (let parent = node.parent; parent; parent = parent.parent) {
          if (ts.isJsxElement(parent) && parent.openingElement.tagName.getText(tree) === 'option') catalogOnly = true;
          if (ts.isJsxElement(parent) && /^(Editable\w+|TranslatedText|textarea|title|script|style|svg)$/.test(parent.openingElement.tagName.getText(tree))) skip = true;
        }
        if (!skip) {
          // Ask TypeScript to normalize JSX whitespace and decode entities exactly as React does.
          const compiled = ts.transpileModule(`const copy = <span>${node.text}</span>`, { compilerOptions: { jsx: ts.JsxEmit.React } }).outputText;
          const parsed = ts.createSourceFile('copy.js', compiled, ts.ScriptTarget.Latest, true);
          let text;
          function find(n) { if (ts.isCallExpression(n)) { const last = n.arguments.at(-1); if (last && ts.isStringLiteral(last)) text = last.text; } ts.forEachChild(n, find); }
          find(parsed);
          if (text && /[\p{L}]/u.test(text)) {
            const id = createHash('sha256').update(file.replaceAll('\\', '/') + '\0' + text).digest('hex').slice(0, 16);
            edits.push({ start: node.getStart(tree), end: node.end,
              value: `<TranslatedText textKey="siteCopy.${id}" fallbackText={${JSON.stringify(text)}}${catalogOnly ? ' inline={false}' : ''} />` });
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(tree);
    if (!edits.length) continue;
    for (const edit of edits.sort((a, b) => b.start - a.start)) source = source.slice(0, edit.start) + edit.value + source.slice(edit.end);
    if (!/import\s*\{[^}]*\bTranslatedText\b/.test(source)) {
      const directive = /^(?:['"]use client['"];?\s*)/.exec(source);
      const at = directive ? directive[0].length : 0;
      source = source.slice(0, at) + "\nimport { TranslatedText } from '@/components/cms/TranslatedText';\n" + source.slice(at);
    }
    fs.writeFileSync(file, source);
    bindings += edits.length; changedFiles++;
  }
}
walk('src');
console.log(JSON.stringify({ bindings, changedFiles }));
