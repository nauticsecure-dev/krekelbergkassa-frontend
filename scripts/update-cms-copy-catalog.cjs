const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const copy = {};
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(file); continue; }
    if (!file.endsWith('.tsx')) continue;
    const tree = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node) {
      if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(tree) === 'TranslatedText') {
        let key, value;
        for (const attr of node.attributes.properties) {
          if (!ts.isJsxAttribute(attr)) continue;
          const init = attr.initializer;
          const text = init && ts.isStringLiteral(init) ? init.text : init && ts.isJsxExpression(init) && init.expression && ts.isStringLiteral(init.expression) ? init.expression.text : undefined;
          if (attr.name.getText(tree) === 'textKey') key = text;
          if (attr.name.getText(tree) === 'fallbackText') value = text;
        }
        if (key && value !== undefined) copy[key] = value;
      }
      ts.forEachChild(node, visit);
    }
    visit(tree);
  }
}
walk('src');
fs.writeFileSync('src/i18n/cms-copy.json', JSON.stringify(Object.fromEntries(Object.entries(copy).sort()), null, 2) + '\n');
console.log(`${Object.keys(copy).length} fallback labels registered for All texts. These are not completed translations.`);
