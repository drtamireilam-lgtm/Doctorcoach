import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import ts from 'typescript';
const temp=await mkdtemp(join(tmpdir(),'dc-anatomy-language-'));
try{
 const records=JSON.parse(await readFile('src/anatomy/muscles.json','utf8'));
 const translations=JSON.parse(await readFile('src/anatomy/translations.json','utf8'));
 const source=await readFile('src/anatomy/i18n.ts','utf8');
 const compiled=ts.transpile(source.replace("import translations from './translations.json';",`const translations=${JSON.stringify(translations)};`),{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020});
 await writeFile(join(temp,'i18n.mjs'),compiled);
 const {labels,muscleText,readLanguage,languageDirection,exerciseLabel}=await import(join(temp,'i18n.mjs'));
 assert.deepEqual(Object.keys(translations).sort(),records.map(m=>m.id).sort());
 for(const language of ['he','en']){
  for(const m of records){const content=muscleText(m,language);assert.ok(content.name);assert.ok(content.otherName);for(const k of ['simple','location','origin','insertion','innervation','actions','professional']){assert.ok(content[k]?.length>2,`${language}:${m.id}:${k}`);if(language==='he')assert.match(content[k],/[א-ת]/);else assert.doesNotMatch(content[k],/[א-ת]/);}}
  for(const key of Object.keys(labels.he))assert.ok(labels[language][key]?.length,`${language}:${key}`);
 }
 assert.deepEqual(Object.keys(labels.he).sort(),Object.keys(labels.en).sort());
 assert.equal(languageDirection('he'),'rtl');assert.equal(languageDirection('en'),'ltr');
 assert.equal(readLanguage(),'he');assert.equal(readLanguage({getItem:()=>{throw Error('blocked');}}),'he');assert.equal(readLanguage({getItem:()=>'{invalid}'}),'he');assert.equal(readLanguage({getItem:()=>'en'}),'en');
 for(const id of ['bench','db-lateral-raise','lat-pulldown'])assert.match(exerciseLabel({id,name:'English'},'he'),/[א-ת]/);
 assert.equal(exerciseLabel({id:'unknown',name:'Safe original'},'en'),'Safe original');
 const shell=await readFile('src/anatomy/main.tsx','utf8');
 const viewer=shell+await readFile('src/anatomy/viewer.tsx','utf8');
 assert.match(shell,/lazy\(\(\)=>import\('\.\/viewer'\)\)/);
 assert.doesNotMatch(shell,/from '@react-three\/fiber'|from 'three'/);
 assert.match(viewer,/webglcontextlost/);assert.match(viewer,/removeEventListener\('webglcontextlost'/);assert.match(viewer,/document.documentElement.dir=languageDirection/);assert.match(viewer,/document.documentElement.lang=language/);assert.match(viewer,/aria-pressed=\{language===value\}/);
 assert.match(viewer,/frameloop="demand"/);assert.match(viewer,/dpr=\{\[1,1.5\]\}/);assert.match(viewer,/powerPreference:'low-power'/);
 console.log('PASS: 15 muscles × 2 languages × 7 content fields; complete UI label parity; language storage/RTL/LTR policies; bilingual exercise links; static context-loss and demand-rendering wiring. Browser/touch behavior remains unverified.');
}finally{await rm(temp,{recursive:true,force:true});}
