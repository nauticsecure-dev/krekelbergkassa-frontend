import ts from 'typescript';
import fs from 'node:fs';

const enumRegistry = JSON.parse(fs.readFileSync(new URL('../../src/i18n/admin-enums.json', import.meta.url), 'utf8'));

const UNKNOWN = '\u0000';
const unique = (items) => [...new Set(items)];
const combine = (left, right) => unique(left.flatMap((a) => right.map((b) => a + b)));

export function translationCalls(source, filename = 'page.tsx', enums = enumRegistry) {
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const constants = new Map();
  function collect(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer &&
        ts.isVariableDeclarationList(node.parent) && (node.parent.flags & ts.NodeFlags.Const)) {
      const entries = constants.get(node.name.text) ?? [];
      entries.push(node);
      constants.set(node.name.text, entries);
    }
    ts.forEachChild(node, collect);
  }
  collect(file);
  function resolve(node, seen = new Set()) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node.text];
    if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) return resolve(node.expression, seen);
    if (ts.isIdentifier(node) && !seen.has(node.text)) {
      const entries = constants.get(node.text) ?? [];
      const declaration = entries.length === 1 ? entries[0] : null;
      if (declaration) {
        const scope = declaration.parent.parent.parent;
        let ancestor = node;
        while (ancestor && ancestor !== scope) ancestor = ancestor.parent;
        if (ancestor) return resolve(declaration.initializer, new Set([...seen, node.text]));
      }
    }
    if (ts.isConditionalExpression(node)) return unique([...resolve(node.whenTrue, seen), ...resolve(node.whenFalse, seen)]);
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) return combine(resolve(node.left, seen), resolve(node.right, seen));
    if (ts.isTemplateExpression(node)) {
      let parts = [node.head.text];
      for (const span of node.templateSpans) {
        parts = combine(parts, resolve(span.expression, seen)).map((part) => part + span.literal.text);
        if (parts.length > 256) return [UNKNOWN];
      }
      return parts;
    }
    return [UNKNOWN];
  }
  const calls = [];
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'tEnum') {
      const family = node.arguments[1];
      const keys = family && ts.isStringLiteral(family) ? enums[family.text] : undefined;
      const { line } = file.getLineAndCharacterOfPosition(node.getStart(file));
      calls.push({ line: line + 1, expression: node.getText(file), patterns: keys && Object.keys(keys).length ? unique(Object.values(keys)) : [UNKNOWN] });
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 't' && node.arguments[0]) {
      const { line } = file.getLineAndCharacterOfPosition(node.getStart(file));
      calls.push({ line: line + 1, expression: node.arguments[0].getText(file), patterns: resolve(node.arguments[0]) });
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return calls;
}

export function flattenStrings(value, prefix = '', out = {}) {
  for (const [key, entry] of Object.entries(value)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (typeof entry === 'string') out[full] = entry;
    else if (entry && typeof entry === 'object') flattenStrings(entry, full, out);
  }
  return out;
}

// Candidates require human review: names, units and sample data are legitimate.
// Inspect rendered JSX copy/attributes, not imports, comments or CSS classes.
export function hardcodedCopy(source, filename = 'page.tsx') {
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const hits = [];
  function add(node, text, kind) {
    const copy = text.replace(/\s+/g, ' ').trim();
    if (!/\p{L}{2}/u.test(copy.replace(/&(?:[a-z]+|#\d+|#x[\da-f]+);/gi, ' '))) return;
    hits.push({ line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1, text: copy, kind });
  }
  function literal(node, kind) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) add(node, node.text, kind);
    else if (ts.isConditionalExpression(node)) { literal(node.whenTrue, kind); literal(node.whenFalse, kind); }
    else if (ts.isParenthesizedExpression(node)) literal(node.expression, kind);
    else if (ts.isBinaryExpression(node) && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind)) literal(node.right, kind);
  }
  function visit(node) {
    if (ts.isJsxElement(node) && ['style', 'script'].includes(node.openingElement.tagName.getText(file))) return;
    if (ts.isJsxText(node)) add(node, node.text, 'jsx');
    if (ts.isJsxAttribute(node) && /^(?:placeholder|title|aria-label|alt|label|description|subtitle)$/.test(node.name.getText(file)) && node.initializer && ts.isStringLiteral(node.initializer)) add(node, node.initializer.text, 'attribute');
    if (ts.isJsxExpression(node) && node.expression && (!ts.isJsxAttribute(node.parent) || /^(?:placeholder|title|aria-label|alt|label|description|subtitle|message|error|helperText)$/.test(node.parent.name.getText(file)))) literal(node.expression, 'expression');
    ts.forEachChild(node, visit);
  }
  visit(file);
  return hits;
}

export function checkCalls(calls, dictionaries) {
  const locales = Object.keys(dictionaries);
  const flat = Object.fromEntries(locales.map((locale) => [locale, flattenStrings(dictionaries[locale])]));
  const allKeys = unique(Object.values(flat).flatMap(Object.keys));
  const missing = [];
  const unresolved = [];
  for (const call of calls) {
    for (const pattern of call.patterns) {
      let keys = [pattern];
      if (pattern.includes(UNKNOWN)) {
        unresolved.push({ line: call.line, expression: call.expression, pattern: pattern.replaceAll(UNKNOWN, '${?}') });
        // Family parity is useful, but does not prove the runtime value belongs to
        // that family. Strict mode fails rather than treating this as full coverage.
        if (pattern === UNKNOWN) continue;
        const escape = (part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`^${pattern.split(UNKNOWN).map(escape).join('[^.]+')}$`);
        keys = allKeys.filter((key) => regex.test(key));
        if (!keys.length) missing.push({ line: call.line, key: pattern.replaceAll(UNKNOWN, '${?}'), locales });
      }
      for (const key of keys) {
        const absent = locales.filter((locale) => !flat[locale][key]?.trim());
        if (absent.length) missing.push({ line: call.line, key, locales: absent });
      }
    }
  }
  return { missing, unresolved };
}
