import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import * as substitutions from '../lib/program-substitution.ts';
import {defaultPrescription} from '../lib/training.ts';
import {exercises} from '../lib/content.ts';
import * as search from '../lib/exercise-search.ts';
const source=readFileSync(new URL('../components/program-exercise-substitution.tsx',import.meta.url),'utf8');
function fixture(language){
 const states=[],exports={};let cursor=0,result;
 const modules={'react':{useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],v=>{states[i]=v;}];}},'react/jsx-runtime':jsx,'../lib/program-substitution':substitutions,'../lib/exercise-search':search,'./language-provider':{useLanguage:()=>({language}),Localize:'Localize'}};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:k=>{assert.ok(k in modules,k);return modules[k];}});
 const item={...defaultPrescription('goblet'),weight:60,occurrenceId:'slot'};
 function render(){cursor=0;return exports.ProgramExerciseSubstitution({item,catalog:exercises,onChange:next=>{result=next;}});}
 function find(node,type){if(!node||typeof node!=='object')return null;if(node.type===type)return node;for(const child of [node.props?.children].flat(Infinity)){const match=find(child,type);if(match)return match;}return null;}
 return {render,find,get result(){return result;}};
}
for(const language of ['he','en'])test(`replacement requires explicit apply and keeps the selected slot in ${language}`,()=>{
 const f=fixture(language),before=f.render(),selector=f.find(before,'select');
 assert.ok(f.find(before,'button').props.disabled);assert.ok(![selector.props.children].flat(Infinity).some(e=>e?.props?.value==='walk'||e?.props?.value==='goblet'));
 selector.props.onChange({target:{value:'bench'}});assert.equal(f.result,undefined);
 const button=f.find(f.render(),'button');assert.equal(button.props.disabled,false);assert.equal(button.props.children,language==='en'?'Apply exercise replacement':'החלת החלפת התרגיל');button.props.onClick();
 assert.equal(f.result.exerciseId,'bench');assert.equal(f.result.weightUnspecified,true);assert.equal(f.result.occurrenceId,'slot');assert.equal(f.find(f.render(),'button').props.disabled,true);
});
