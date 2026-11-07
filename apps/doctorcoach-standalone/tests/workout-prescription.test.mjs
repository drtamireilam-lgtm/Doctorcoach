import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
import * as training from '../lib/training.ts';
import * as units from '../lib/load-units.ts';
import * as effort from '../lib/effort.ts';

function render(item,language){
 const exports={};
 const modules={'react/jsx-runtime':jsx,'../lib/training':training,'../lib/load-units':units,'../lib/effort':effort,'./language-provider':{useLanguage:()=>({language})}};
 const source=readFileSync(new URL('../components/workout-prescription.tsx',import.meta.url),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:name=>{assert.ok(name in modules,name);return modules[name];}});
 return renderToStaticMarkup(React.createElement(exports.WorkoutPrescription,{item}));
}

for(const language of ['he','en']){
 test(`${language}: summary uses effective per-set RPE instead of a contradictory fallback`,()=>{
  const item=training.parsePlanItem({...training.defaultPrescription('goblet'),sets:2,targetRpe:8,targetRpes:[6,9]});
  assert.match(render(item,language),/<dd dir="auto">RPE 6 \/ 9<\/dd>/);
 });
 test(`${language}: defined per-set RIR targets remain visible with no scalar target`,()=>{
  const item=training.parsePlanItem({...training.defaultPrescription('goblet'),sets:2,effortScale:'rir',targetRpe:null,targetRpes:[6,9]});
  assert.match(render(item,language),/<dd dir="auto">RIR 4 \/ 1<\/dd>/);
 });
 test(`${language}: unassigned per-set targets do not inherit the scalar target`,()=>{
  const item=training.parsePlanItem({...training.defaultPrescription('goblet'),sets:2,targetRpe:8,targetRpes:[null,9]});
  assert.match(render(item,language),/<dd dir="auto">RPE — \/ 9<\/dd>/);
 });
}
