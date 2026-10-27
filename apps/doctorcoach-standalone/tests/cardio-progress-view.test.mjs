import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as jsx from 'react/jsx-runtime';
import * as progress from '../lib/cardio-progress.ts';
import * as cardio from '../lib/cardio.ts';
function render(language,history){const exports={},modules={'react':React,'react/jsx-runtime':jsx,'../lib/cardio':cardio,'../lib/cardio-progress':progress,'./language-provider':{useLanguage:()=>({language})}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../components/cardio-progress.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:key=>modules[key]});return renderToStaticMarkup(React.createElement(exports.CardioProgress,{history}));}
const history=[{id:'walk',status:'completed',finishedAt:'2026-10-26T12:00:00Z',items:[{exerciseId:'cardio:walking',cardio:{activityId:'walking',mode:'steady',targets:{}},cardioResult:{status:'completed',elapsedSeconds:600,metrics:{}}}]}];
test('weekly activity graphs expose known values and missing-distance labels in Hebrew and English',()=>{for(const [language,unknown,title] of [['en','Unknown','Weekly graphs by activity'],['he','לא נמדד','גרפים שבועיים לפי פעילות']]){const html=render(language,history);assert.ok(html.includes(title));assert.ok(html.includes(unknown));assert.ok(html.includes('2026-10-25'));assert.equal((html.match(/<figure/g)??[]).length,3);assert.ok(html.includes('<figcaption>'));assert.ok(html.includes('>10</span>'));assert.ok(html.includes('aria-hidden="true"'));assert.ok(html.includes(language==='en'?'Observational only':'השוואה תצפיתית בלבד'));assert.ok(html.includes('dir="'+(language==='en'?'ltr':'rtl')+'"'));}});
test('no measured cardio keeps honest empty state and never invents a missed-session total',()=>{const html=render('en',[]);assert.ok(html.includes('Completed cardio sessions with valid timestamps'));assert.ok(html.includes('not enough matching measurements'));assert.equal(html.includes('<figure'),false);});
