import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import * as jsx from 'react/jsx-runtime';
import * as training from '../lib/training.ts';
import * as days from '../lib/workout-days.ts';
import * as sections from '../lib/workout-sections.ts';
import * as navigation from '../lib/workout-navigation.ts';
import * as progress from '../lib/workout-progress.ts';
const nodes=n=>!n||typeof n!=='object'?[]:[n,...[n.props?.children].flat(Infinity).flatMap(nodes)];
test('a remote exercise substitution remounts its set editor rather than transferring pending load to another exercise',()=>{
 const exports={},modules={'react/jsx-runtime':jsx,'react':{useState:value=>[typeof value==='function'?value():value,()=>{}],useCallback:fn=>fn,useEffect:()=>{}},'../lib/content':{exercises:[],templates:[]},'../lib/training':training,'../lib/workout-days':days,'../lib/workout-sections':sections,'../lib/workout-navigation':navigation,'../lib/workout-progress':progress,'./workout-sections':{WorkoutSections:'WorkoutSections'}};
 vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../components/training-workspace.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>modules[name]??{}});
 const item={...training.defaultPrescription('bench'),occurrenceId:'same-slot',name:'Synthetic',results:[{done:false,amount:10,weight:20}]};
 function key(exercise){const session={id:'same-session',items:[exercise],startedAt:'2026-11-13T10:00:00Z',plannedSets:2,completedSets:0,before:0};const tree=exports.WorkoutWorkspace({controller:{feed:{active:session,history:[]},access:{canBuild:false},busy:false},go:()=>{}});const wrapper=nodes(tree).find(n=>n.type==='WorkoutSections');const rendered=wrapper.props.children(exercise,0);return nodes(rendered).find(n=>n.type?.name==='SetLine').key;}
 assert.notEqual(key(item),key({...item,exerciseId:'goblet',name:'Replacement'}));
});
