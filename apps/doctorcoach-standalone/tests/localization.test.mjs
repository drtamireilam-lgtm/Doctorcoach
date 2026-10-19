import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const stretchCode=ts.transpileModule(fs.readFileSync(new URL('../lib/stretch-exercises.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {stretchTranslations}=await import('data:text/javascript;base64,'+Buffer.from(stretchCode).toString('base64'));
const source=fs.readFileSync(new URL('../lib/localization.ts',import.meta.url),'utf8').replace("import hebrew from './locales/he.json';",`const hebrew=${fs.readFileSync(new URL('../lib/locales/he.json',import.meta.url),'utf8')};`).replace("import english from './locales/en.json';",`const english=${fs.readFileSync(new URL('../lib/locales/en.json',import.meta.url),'utf8')};`);
const code=ts.transpileModule(source.replace("import {stretchTranslations} from './stretch-exercises';",`const stretchTranslations=${JSON.stringify(stretchTranslations)};`),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {translateText}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('all catalog entries have English translations',()=>{
 const he=JSON.parse(fs.readFileSync(new URL('../lib/locales/he.json',import.meta.url))),en=JSON.parse(fs.readFileSync(new URL('../lib/locales/en.json',import.meta.url)));
 assert.equal(he.length,en.length);
 assert.ok(en.every(x=>typeof x==='string'&&x.trim()&&!/[\u0590-\u05ff]/u.test(x)));
 for(let i=0;i<he.length;i++) assert.equal(translateText(he[i],'en').trim(),en[i].trim());
});
test('Hebrew mode preserves strings and English mode preserves free text',()=>{
 assert.equal(translateText('הגדרות וחשבון','he'),'הגדרות וחשבון');
 assert.equal(translateText('היום כתבתי הערה פרטית ומיוחדת על המטופל','en'),'היום כתבתי הערה פרטית ומיוחדת על המטופל');
 assert.equal(translateText('₪500 / 60','en'),'₪500 / 60');
 assert.equal(translateText('DoctorCoach','en'),'DoctorCoach');
});
test('UI localization does not translate stored form values or handlers',()=>{
 const provider=fs.readFileSync(new URL('../components/language-provider.tsx',import.meta.url),'utf8');
 assert.ok(!provider.includes("['value'"));
 assert.ok(provider.includes("node.props['data-no-translate']"));
});
