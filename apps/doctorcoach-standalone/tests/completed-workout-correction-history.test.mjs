import * as painContext from '../lib/anatomy-pain-context.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import * as training from '../lib/training.ts';
import * as display from '../lib/retrospective-display.ts';
const nodes=n=>!n||typeof n!=='object'?[]:[n,...[n.props?.children].flat(Infinity).flatMap(nodes)];
test('history exposes the dedicated live correction component and retains retrospective editor separation',()=>{
 const exports={},modules={'../lib/anatomy-pain-context':painContext,'./workout-pain-report':{WorkoutPainReport:'WorkoutPainReport'},'react/jsx-runtime':jsx,'../lib/content':{exercises:[],templates:[]},'../lib/training':training,'../lib/retrospective-display':display,'../components/language-provider':{Localize:'Localize'},'./completed-workout-correction':{CompletedWorkoutCorrection:'CompletedCorrection'},'./retrospective-workout':{RetrospectiveWorkout:'Retrospective'}};
 const source=readFileSync(new URL('../components/training-workspace.tsx',import.meta.url),'utf8')+'\nexports.HistoryItem=HistoryItem;';
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:key=>modules[key]??{}});
 const session={id:'past',status:'completed',items:[],plannedSets:0,completedSets:0,startedAt:'2026-11-01T10:00:00Z',finishedAt:'2026-11-01T11:00:00Z',version:1,before:0,after:0};
 const live=nodes(exports.HistoryItem({session,controller:{}}));assert.equal(live.filter(n=>n.type==='CompletedCorrection').length,1);assert.equal(live.some(n=>n.type==='Retrospective'),false);
 const retro=nodes(exports.HistoryItem({session:{...session,retrospective:{source:'free',recordedAt:session.startedAt,durationMinutes:null}},controller:{}}));assert.equal(retro.some(n=>n.type==='CompletedCorrection'),false);assert.equal(retro.filter(n=>n.type==='Retrospective').length,1);
});
