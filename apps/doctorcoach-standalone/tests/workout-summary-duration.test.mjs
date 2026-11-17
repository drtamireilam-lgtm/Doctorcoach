import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as training from '../lib/training.ts';
import * as finish from '../lib/workout-finish.ts';
import * as display from '../lib/retrospective-display.ts';
const require=createRequire(import.meta.url);
const source=readFileSync(new URL('../components/workout-finish.tsx',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function render(durationMinutes){
 const exports={},modules={'./language-provider':{useLanguage:()=>({language:'en'}),Localize:({children})=>children},'../lib/training':training,'../lib/workout-finish':finish,'../lib/retrospective-display':display,'./workout-set-readback':{WorkoutSetReadback:()=>null}};
 vm.runInNewContext(code,{exports,require:name=>modules[name]??(name.startsWith('react')?require(name):{})});
 const session={id:'retro',status:'completed',items:[],plannedSets:0,completedSets:0,startedAt:'2026-10-01T08:00:00Z',finishedAt:'2026-11-17T08:00:00Z',retrospective:{durationMinutes}};
 return renderToStaticMarkup(createElement(exports.WorkoutFinishSummary,{session,history:[]}));
}
test('retrospective summary uses reported duration, never the elapsed interval until entry',()=>{assert.match(render(35),/>35 min</);});
test('retrospective summary retains unreported duration as unknown',()=>{assert.match(render(null),/Duration not reported/);});
