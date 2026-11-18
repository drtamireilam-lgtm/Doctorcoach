import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import * as days from '../lib/workout-days.ts';
import * as sections from '../lib/workout-sections.ts';
function render(items,item,disabled=false){const exports={},modules={'react/jsx-runtime':jsx,'../lib/workout-days':days,'../lib/workout-sections':sections,'./language-provider':{useLanguage:()=>({language:'en'})}};vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../components/program-quick-actions.tsx',import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:name=>modules[name]});return exports.ProgramQuickActions({item,items,disabled,onDuplicate:()=>{},onMove:()=>{},onAdvanced:()=>{}}).props.children;}
const item=(id,day='1',section='main')=>({exerciseId:'goblet',occurrenceId:id,dayId:day,workoutSection:section});
test('quick move bounds follow exact day and section peers including repeated exercises',()=>{const a=item('a'),b=item('b','1','warmup'),c=item('c','2'),d=item('d'),items=[a,b,c,d];let buttons=render(items,a);assert.equal(buttons.find(n=>n.props['data-program-action']==='up').props.disabled,true);assert.equal(buttons.find(n=>n.props['data-program-action']==='down').props.disabled,false);buttons=render(items,d);assert.equal(buttons.find(n=>n.props['data-program-action']==='down').props.disabled,true);});
test('capacity disables duplication and a pending field disables every structural action',()=>{const a=item('a'),items=Array.from({length:30},(_,i)=>item(String(i)));assert.equal(render(items,a).find(n=>n.props['data-program-action']==='duplicate').props.disabled,true);assert.ok(render([a],a,true).every(n=>n.props.disabled));});
