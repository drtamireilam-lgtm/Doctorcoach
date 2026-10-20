import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {anatomyLabels,regionNames} from '../lib/anatomy-learning.ts';
const require=createRequire(import.meta.url);
const fileUrl=path=>pathToFileURL(require.resolve(path)).href;
const url=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
async function loadComponent(file,language){
 let source=readFileSync(new URL('../components/'+file,import.meta.url),'utf8');
 source=source.replace(/import \{useLanguage\} from '.\/language-provider';/,`const useLanguage=()=>({language:'${language}'});`);
 source=source.replace(/import \{[^}]+\} from '..\/lib\/anatomy-learning';/,`const anatomyLabels=${JSON.stringify(anatomyLabels)},regionNames=${JSON.stringify(regionNames)};`);
 source=source.replace("import {regions} from '../lib/anatomy';",`const regions=${JSON.stringify(Object.keys(regionNames).map(id=>({id,label:id})))};`);
 source=source.replace("from '../lib/anatomy-reference'",`from '${new URL('../lib/anatomy-reference.ts',import.meta.url).href}'`);
 let code=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 code=code.replaceAll('from "react/jsx-runtime"',`from '${fileUrl('react/jsx-runtime')}'`).replaceAll("from 'react'",`from '${fileUrl('react')}'`);
 return import(url(code));
}
for(const language of ['he','en'])test('front/back map renders keyboard and side equivalents in '+language,async()=>{
 const {AnatomyBodyMap}=await loadComponent('anatomy-body-map.tsx',language);
 for(const view of ['front','back'])for(const side of ['both','left','right']){
  const html=renderToStaticMarkup(React.createElement(AnatomyBodyMap,{language,view,side,region:'shoulder',onRegion(){},onView(){},onSide(){}}));
  assert.ok(html.includes('<svg'));assert.ok(html.includes('role="button"'));assert.ok(html.includes('aria-pressed="true"'));assert.ok(html.includes(anatomyLabels[language][view]));assert.ok(!html.includes('undefined'));
  assert.ok(html.includes('tabindex="0"'));assert.ok(html.includes('aria-label="'+anatomyLabels[language].zoom+'"'));
 }
});
for(const language of ['he','en'])test('movement begins as static diagram and unsupported muscles render no empty controls in '+language,async()=>{
 const {LearningMotion}=await loadComponent('anatomy-learning-motion.tsx',language);
 for(const slug of ['biceps-brachii','rectus-femoris']){const html=renderToStaticMarkup(React.createElement(LearningMotion,{slug}));assert.ok(html.includes('<svg'));assert.ok(html.includes('disabled=""'));assert.ok(html.includes('type="range"'));assert.ok(html.includes(language==='en'?'Schematic joint-action diagram':'תרשים סכמטי'));}
 assert.equal(renderToStaticMarkup(React.createElement(LearningMotion,{slug:'soleus'})),'');
});
