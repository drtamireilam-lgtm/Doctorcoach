import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import * as training from '../lib/training.ts';
import * as effort from '../lib/effort.ts';
import * as loads from '../lib/load-units.ts';
const require=createRequire(import.meta.url);
function component(language='en'){
 const source=readFileSync(new URL('../components/workout-set-readback.tsx',import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};const modules={'./language-provider':{useLanguage:()=>({language})},'../lib/training':training,'../lib/effort':effort,'../lib/load-units':loads};
 vm.runInNewContext(code,{exports,require:name=>modules[name]??require(name)});return exports.WorkoutSetReadback;
}
const base=()=>({exerciseId:'bench',name:'Recorded exercise',sets:2,reps:8,unit:'reps',weight:20,notes:'',targetRpes:[7,null],results:[{done:true,weight:63.125,amount:8,actualRpe:6,painDuring:0},{done:false,weight:999,amount:99,actualRpe:10}]});
const render=(item,props={},language='en')=>renderToStaticMarkup(createElement(component(language),{item,...props}));
const field=(html,name)=>html.match(new RegExp('data-field="'+name+'"[^>]*><bdi>(.*?)</bdi>'))?.[1];
test('readback distinguishes performed values from untouched planned set fields without mutating either',()=>{
 const item=base(),before=JSON.stringify(item),html=render(item);
 assert.equal(field(html,'weight'),'63.125 kg');assert.equal(field(html,'target'),'7');assert.equal(field(html,'actual'),'6');assert.equal(field(html,'pain'),'0/10');
 assert.match(html,/Not recorded as completed/);assert.doesNotMatch(html,/999|>99</);assert.equal(JSON.stringify(item),before);
});
test('readback retains null versus zero and RIR zero',()=>{
 const item=base();item.effortScale='rir';item.targetRpes=[10];item.results=[{done:true,weight:0,amount:null,actualRpe:10}];
 const html=render(item);assert.equal(field(html,'weight'),'0 kg');assert.equal(field(html,'amount'),'—');assert.equal(field(html,'target'),'0');assert.equal(field(html,'actual'),'0');assert.equal(field(html,'pain'),undefined);
 item.results[0].weight=null;assert.equal(field(render(item),'weight'),'—');
});
test('source pounds and per-side basis survive display conversion',()=>{
 const item=base();item.load={sourceValue:12.5,sourceUnit:'lb',basis:'per-side'};item.results=[{done:true,weight:loads.toKg(12.5,'lb'),amount:8}];
 const html=render(item);assert.match(html,/Per side/);assert.equal(field(html,'weight'),'12.5 lb');
});
test('warmups do not inherit working-set effort targets and timed units stay timed',()=>{
 const item=base();item.unit='seconds';item.warmupResults=[{done:true,weight:0,amount:30}];
 const html=render(item,{warmup:true});assert.match(html,/Recorded warm-up sets|Warm-up/);assert.match(html,/Seconds/);assert.equal(field(html,'amount'),'30');assert.equal(field(html,'target'),undefined);
 assert.match(render(base(),{},'he'),/ביצועים לפי סט/);
});
test('warmup weights keep their independent kg contract without inheriting main-load basis',()=>{
 const item=base();item.load={sourceValue:12.5,sourceUnit:'lb',basis:'per-side'};item.warmupResults=[{done:true,weight:10,amount:8}];
 const html=render(item,{warmup:true});assert.equal(field(html,'weight'),'10 kg');assert.doesNotMatch(html,/Per side/);
});
