import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import ts from 'typescript';
import {fileURLToPath} from 'node:url';

const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const walk = dir => fs.readdirSync(dir,{withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]);
const literal = node => node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : null;

export function mediaInventory(root) {
  const images = [], inputs = [];
  const sourceFiles = walk(path.join(root,'src')).filter(f => /\.(tsx?|css)$/.test(f)).sort();
  for (const absolute of sourceFiles) {
    const file = path.relative(root,absolute).replaceAll('\\','/'), source = fs.readFileSync(absolute,'utf8');
    inputs.push(file+'\0'+source);
    if (!file.includes('/(site)/') && !file.startsWith('src/components/site/') && file !== 'src/components/ui/CrestLogo.tsx') continue;
    const tree = ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    const constants = new Map(), objects = [];
    const collect = node => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) constants.set(node.name.text,node.initializer);
      if (ts.isObjectLiteralExpression(node)) {
        const record = Object.fromEntries(node.properties.filter(ts.isPropertyAssignment).map(p => [p.name.getText(tree),literal(p.initializer)]));
        if (record.img || record.image) objects.push(record);
      }
      ts.forEachChild(node,collect);
    }; collect(tree);
    const resolve = n => n && ts.isIdentifier(n) ? constants.get(n.text) ?? n : n;
    const attr = (n,key) => {
      const a = n.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.getText(tree) === key);
      return resolve(a?.initializer && ts.isJsxExpression(a.initializer) ? a.initializer.expression : a?.initializer);
    };
    const add = (node,data) => images.push({id:data.key ? 'cms:'+data.key : file+':'+node.pos, file,line:tree.getLineAndCharacterOfPosition(node.getStart(tree)).line+1,...data});
    const visit = node => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const component = node.tagName.getText(tree);
        if (component === 'EditableImage') {
          const key = attr(node,'blockKey'), page = literal(attr(node,'page'));
          if (literal(key)) add(node,{classification:'cms',key:literal(key),page,src:literal(attr(node,'fallbackSrc'))});
          else if (key && ts.isTemplateExpression(key) && key.templateSpans.length === 1 && key.head.text) {
            const span = key.templateSpans[0], property = ts.isPropertyAccessExpression(span.expression) ? span.expression.name.text : null;
            const values = property ? objects.filter(o => o[property]).map(o => o[property]) : objects.map((_,i) => String(i));
            if (!values.length) add(node,{classification:'unresolved',expression:key.getText(tree),page});
            for (const [i,value] of [...new Set(values)].entries()) add(node,{classification:'cms',key:key.head.text+value+span.literal.text,page,src:objects[i]?.img ?? objects[i]?.image});
          } else if (!file.endsWith('/ServicePage.tsx')) add(node,{classification:'unresolved',expression:key?.getText(tree),page});
        } else if (component === 'ServicePage' && literal(attr(node,'cmsPage'))) {
          const page = literal(attr(node,'cmsPage'));
          // Shared ServicePage supplies an inline editor, even when its hero is supplied by the caller.
          if (attr(node,'inlineImage')) add(node,{classification:'cms',key:page+'.inline.image',page,src:literal(attr(node,'inlineImage'))});
          if (!attr(node,'editableHeroImage')) add(node,{classification:'cms',key:page+'.hero.image',page,src:literal(attr(node,'heroImage'))});
        } else if (['img','Image','svg'].includes(component)) {
          add(node,{classification:component === 'svg' ? 'vector' : literal(attr(node,'src')) ? 'static' : 'runtime',src:literal(attr(node,'src')),alt:literal(attr(node,'alt')),component});
        }
      }
      if (ts.isPropertyAssignment(node) && node.name.getText(tree) === 'backgroundImage') add(node,{classification:'background',expression:node.initializer.getText(tree)});
      ts.forEachChild(node,visit);
    }; visit(tree);
  }
  const unique = [...new Map(images.map(row => [row.id,row])).values()].sort((a,b) => a.id.localeCompare(b.id));
  return {schema:1,source_hash:hash(inputs.join('\0')),scope:'Public site source images, shared site components and brand vector; catalog/customer images are classified separately from CMS editors.',images:unique,counts:unique.reduce((c,r) => ({...c,[r.classification]:(c[r.classification]??0)+1}),{})};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../',import.meta.url));
  const report = mediaInventory(root), out = process.argv.indexOf('--output');
  if (out >= 0) fs.writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n');
  else console.log(JSON.stringify(report,null,2));
}
