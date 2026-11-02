// Explicit bindings preserve translation IDs; t() stays string-valued for attributes.
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
let bindings = 0, changedFiles = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(file); continue; }
    if (!file.endsWith('.tsx') || file.includes(`${path.sep}cms${path.sep}`)) continue;
    let source = fs.readFileSync(file, 'utf8');
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const edits = [];
    function visit(node) {
      if (ts.isJsxExpression(node) && node.expression && !ts.isJsxAttribute(node.parent)) {
        let skip = false;
        for (let parent = node.parent; parent; parent = parent.parent) {
          if (ts.isJsxElement(parent) && /^(Editable\w+|TranslatedText|option|textarea|title|script|style)$/.test(parent.openingElement.tagName.getText(tree))) skip = true;
        }
        if (!skip) {
          const calls = [];
          function find(expression) {
            if (ts.isCallExpression(expression) && expression.expression.getText(tree) === 't' && expression.arguments.length >= 1 && expression.arguments.length <= 2) {
              calls.push(expression); return;
            }
            // Only text branches, never conditions, callbacks, attributes or string operations.
            if (ts.isConditionalExpression(expression)) { find(expression.whenTrue); find(expression.whenFalse); }
            if (ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) find(expression.right);
          }
          find(node.expression);
          for (const call of calls) {
            const [key, vars] = call.arguments;
            edits.push({ start: call.getStart(tree), end: call.end,
              value: `<TranslatedText textKey={${key.getText(tree)}}${vars ? ` vars={${vars.getText(tree)}}` : ''} />` });
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
