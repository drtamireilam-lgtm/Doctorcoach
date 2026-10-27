import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import {traineeNextStep} from '../lib/trainee-next-step.ts';
import {homeWorkoutPreview} from '../lib/home-workout.ts';
import {workoutDayLabel} from '../lib/workout-days.ts';
import {consents,CONSENT_REVISION} from '../lib/intake.ts';
const exports={};
const modules={'react/jsx-runtime':jsx,'lucide-react':{},'./training-workspace':{StartButton:'StartButton'},'./home-activity-summary':{HomeActivitySummary:'HomeActivitySummary'},'../lib/home-workout':{homeWorkoutPreview},'../lib/workout-days':{workoutDayLabel},'../lib/trainee-next-step':{traineeNextStep},'./language-provider':{useLanguage:()=>({language:'he'})}};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../components/trainee-start.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:k=>modules[k]});
function find(node,type){if(!node||typeof node!=='object')return null;if(node.type===type)return node;for(const child of [node.props?.children].flat(Infinity)){const found=find(child,type);if(found)return found;}return null;}
function props(){return {controller:{auth:'ready',busy:false,plan:[{exerciseId:'a',sets:3}],access:{mode:'self',canStart:true,canBuild:true},workoutPreference:{mode:'fixed'},feed:{history:[],active:null,stats:{total:2,week:1}}},data:{intake:{completed:true},consents:Object.fromEntries(consents.map(c=>[c.id,c.required])),consentRevision:CONSENT_REVISION},status:200,loading:false,go:()=>{},retry:()=>{}};}
test('ready home keeps its existing start dialog mounted while refreshing and shows the summary',()=>{
 const p=props();for(const busy of [false,true]){p.controller.busy=busy;const tree=exports.TraineeStart(p);assert.ok(find(tree,'StartButton'));assert.ok(find(tree,'HomeActivitySummary'));}
});
test('medical hold and incomplete onboarding do not expose the home start action',()=>{
 for(const change of [p=>{p.data.trainingBlocked=true;},p=>{p.data.intake.completed=false;}]){const p=props();change(p);assert.equal(find(exports.TraineeStart(p),'StartButton'),null);}
});

test('personal greeting uses only the saved intake name and empty plans never offer workout start',()=>{
 const p=props();p.data.intake.answers={name:'Synthetic trainee'};
 assert.ok(JSON.stringify(exports.TraineeStart(p)).includes('Synthetic trainee'));
 p.controller.plan=[];p.controller.access={mode:'coached',canStart:false,canBuild:false};
 assert.equal(find(exports.TraineeStart(p),'StartButton'),null);
 p.controller.auth='error';assert.equal(find(exports.TraineeStart(p),'HomeActivitySummary'),null);
});
