import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import * as flexibility from '../lib/session-flexibility.ts';
import * as days from '../lib/workout-days.ts';
import * as sections from '../lib/workout-sections.ts';
import {exercises} from '../lib/content.ts';
import {defaultPrescription} from '../lib/training.ts';
const source=readFileSync(new URL('../components/session-flexibility.tsx',import.meta.url),'utf8');
function nodes(node){if(!node||typeof node!=='object')return [];return [node,...[node.props?.children].flat(Infinity).flatMap(nodes)];}
for(const language of ['he','en'])test(`session controls dispatch exact occurrences, retain dose and protect dirty fields in ${language}`,()=>{
 const originalDose=()=>null;
 const exports={},modules={'react/jsx-runtime':jsx,'../lib/session-flexibility':flexibility,'../lib/workout-days':days,'../lib/workout-sections':sections,'../lib/content':{exercises},'./workout-prescription':{WorkoutPrescription:originalDose},'./language-provider':{useLanguage:()=>({language})}};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:k=>{assert.ok(k in modules,k);return modules[k];}});
 const item={...defaultPrescription('goblet'),occurrenceId:'a',prescription:{...defaultPrescription('goblet'),targetRpe:8},name:'Synthetic',results:[{done:false,amount:10,weight:0},{done:false,amount:10,weight:0}]};
 const other={...item,occurrenceId:'b'},calls=[],controller={busy:false,feed:{active:{items:[item,other],planMode:'self'}},patch:p=>calls.push(p)};
 const render=(hasDraft=false)=>nodes(exports.SessionFlexibility({item,controller,hasDraft}));
 const buttons=render().filter(n=>n.type==='button');
 assert.equal(buttons.length,4);assert.equal(buttons[0].props.disabled,true);assert.equal(buttons[1].props.disabled,false);
 buttons[1].props.onClick();assert.equal(calls[0].action,'moveExercise');assert.equal(calls[0].occurrenceId,'a');assert.equal(calls[0].direction,1);
 buttons[2].props.onClick();assert.equal(calls[1].action,'addSet');
 assert.ok(render(true).filter(n=>n.type==='button').every(n=>n.props.disabled));
 controller.feed.active.planMode='coached';assert.equal(render().filter(n=>n.type==='button').length,2);
 const prescribed=exports.SessionPrescription({item});assert.equal(nodes(prescribed).find(n=>n.type==='summary').props.children,language==='en'?'Original prescription':'המרשם המקורי');
 assert.equal(nodes(prescribed).find(n=>n.type===originalDose)?.props.item,item.prescription,'Original dose must use the complete shared range/unit/load/effort formatter');
});
