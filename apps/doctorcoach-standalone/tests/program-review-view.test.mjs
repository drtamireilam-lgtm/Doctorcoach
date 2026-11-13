import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as jsx from 'react/jsx-runtime';
import * as training from '../lib/training.ts';
import * as days from '../lib/workout-days.ts';
import * as review from '../lib/program-review.ts';
import * as effort from '../lib/effort.ts';
import * as loads from '../lib/load-units.ts';
import * as customs from '../lib/custom-exercise-types.ts';
import {exercises} from '../lib/content.ts';

function render(item){
 const exports={},modules={
  'react':React,'react/jsx-runtime':jsx,'./language-provider':{useLanguage:()=>({language:'he'})},'../lib/load-units':loads,'../lib/custom-exercise-types':customs,
  '../lib/training':training,'../lib/program-review':review,'../lib/workout-days':days,
  '../lib/effort':effort,'../lib/content':{exercises},
  '../components/language-provider':{Localize:({children})=>children},
  './custom-exercise-instructions':{CustomExerciseInstructions:()=>null},
  './exercise-tempo':{TempoDetails:()=>null},'./care-ui':{CareFeedback:()=>null},
  './workout-sections':{WorkoutSections:({items,children})=>items.map(children)},
 };
 const restExports={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../components/rest-prescription.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports:restExports,require:key=>modules[key]});modules['./rest-prescription']=restExports;
 const source=readFileSync(new URL('../components/program-review.tsx',import.meta.url),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:key=>{assert.ok(key in modules,key);return modules[key];},Intl});
 return renderToStaticMarkup(React.createElement(exports.ProgramReview,{title:'Synthetic review',items:[item],clientName:'Synthetic trainee',busy:false,error:'',stale:false,onBack(){},onEditDay(){},onPublish(){}}));
}
const perSet=()=>({...training.defaultPrescription('goblet'),sets:2,setReps:[{min:8,max:8},{min:10,max:12}],targetRpe:null,targetRpes:[7,8],weight:33.125});
test('publication shows exact per-set reps/effort without a false missing-effort warning',()=>{
 const html=render(perSet());assert.match(html,/<li>סט 1: 8 חזרות · RPE יעד 7<\/li>/);assert.match(html,/<li>סט 2: 10–12 חזרות · RPE יעד 8<\/li>/);assert.ok(!html.includes('לא הוגדר'));
});
test('publication preserves supported fractional opening load rather than displaying a different dose',()=>{
 assert.match(render(perSet()),/33\.125 kg/);
});
test('publication keeps RIR conversion per set and the existing no-target warning',()=>{
 assert.match(render({...perSet(),effortScale:'rir'}),/RIR יעד 3/);assert.match(render({...perSet(),effortScale:'rir'}),/RIR יעד 2/);
 assert.match(render({...perSet(),targetRpes:[null,null]}),/לא הוגדר יעד מאמץ לתרגיל הזה/);
});

test('publication shows explicit rest, including no-rest, and omits unspecified legacy values',()=>{assert.match(render({...perSet(),restSeconds:90}),/מנוחה: 90/);assert.match(render({...perSet(),restSeconds:0}),/מנוחה: 0/);assert.ok(!render(perSet()).includes('מנוחה'));});
