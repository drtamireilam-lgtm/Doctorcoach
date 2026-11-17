import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
import * as training from '../lib/training.ts';
import * as days from '../lib/workout-days.ts';
import * as effort from '../lib/effort.ts';
import * as loads from '../lib/load-units.ts';
import * as customs from '../lib/custom-exercise-types.ts';
import * as sections from '../lib/workout-sections.ts';
import * as auth from '../lib/auth-language.ts';
import * as stretches from '../lib/stretch-exercises.ts';
import * as cardio from '../lib/cardio.ts';
import {exercises} from '../lib/content.ts';

function fixture(language='en',onPrescriptionRender){
 const modules={react:{...React,useContext:()=>({language})},'react/jsx-runtime':jsx,
  '../lib/training':training,'../lib/workout-days':days,'../lib/effort':effort,'../lib/load-units':loads,
  '../lib/custom-exercise-types':customs,'../lib/workout-sections':sections,
  '../lib/content':{exercises},'../lib/cardio':cardio};
 const localization={};
 vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/localization.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{exports:localization,require:key=>key==='./auth-language.ts'?auth:key==='./stretch-exercises'?stretches:JSON.parse(readFileSync(new URL(`../lib/${key}`,import.meta.url),'utf8')),Map});
 modules['../lib/localization']=localization;
 function load(file){
  const exports={};
  const source=readFileSync(new URL(`../components/${file}.tsx`,import.meta.url),'utf8');
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,
   {exports,require:key=>{assert.ok(key in modules,`Unexpected dependency: ${key}`);return modules[key];},Intl});
  modules[`./${file}`]=exports;return exports;
 }
 for(const file of ['language-provider','workout-prescription','exercise-tempo','rest-prescription','workout-sections','cardio-editor'])load(file);
 if(onPrescriptionRender){const Original=modules['./workout-prescription'].WorkoutPrescription;modules['./workout-prescription']={WorkoutPrescription:props=>{onPrescriptionRender(props);return React.createElement(Original,props);}};}
 return load('program-draft-preview').ProgramDraftPreview;
}
const item=()=>({...training.defaultPrescription('goblet'),dayId:'2',sets:3,reps:5,setReps:[{min:8,max:8},{min:10,max:12},{min:6,max:6}],targetRpe:9,targetRpes:[7,null,8],effortScale:'rir',weight:3.125,load:{sourceValue:3.125,sourceUnit:'kg',basis:'per-side'},warmupSets:[{amount:5,weight:1.25}],side:'left',restSeconds:0,tempo:{eccentric:3,bottom:0,concentric:1,top:0},notes:'Private note\nSecond line'});
function render(language,items=[item()],extra={}){const Component=fixture(language);return renderToStaticMarkup(React.createElement(Component,{title:'Synthetic draft',items,onBack(){throw Error('Initial render must be passive');},onEditDay(){throw Error('Initial render must be passive');},...extra}));}
for(const language of ['en','he']){
 test(`${language}: incomplete draft renders exact trainee doses, per-set effort and explicit zero rest`,()=>{
  const html=render(language);
  assert.match(html,language==='en'?/Draft preview — not assigned/:/תצוגת טיוטה — לא הוקצתה/);
  assert.match(html,/3\.125 kg/);assert.match(html,language==='en'?/per side/:/לכל צד/);
  assert.match(html,language==='en'?/RIR 3/:/RIR יעד 3/);assert.match(html,language==='en'?/RIR 2/:/RIR יעד 2/);assert.match(html,/10–12/);
  assert.match(html,language==='en'?/Rest: 0 seconds/:/מנוחה: 0 שניות/);
  assert.match(html,/3–0–1–0/);assert.match(html,language==='en'?/Lowering \/ lengthening/:/ירידה \/ הארכה/);
  assert.match(html,/1\.25 kg/);assert.match(html,/Private note\nSecond line/);
  assert.match(html,language==='en'?/Missing effort target/:/חסר יעד מאמץ/);
  assert.doesNotMatch(html,/onPublish|אישור ופרסום|Publish|Assign|<input|<form|<select/);
 });
 test(`${language}: private custom snapshots and user text stay unchanged`,()=>{
  const custom={...exercises.find(e=>e.id==='goblet'),id:'import-private-test',name:'יום אימון 1',en:'Private custom English name',desc:'Keep private instruction',equipment:'Private equipment',unit:'reps',family:'custom',aliases:[],videoUrl:''};
  const html=render(language,[{...item(),exerciseId:custom.id,customExercise:custom}]);
  assert.match(html,/<h4[^>]*>יום אימון 1<\/h4>/);assert.match(html,/Keep private instruction/);assert.match(html,/Private custom English name/);
 });
 test(`${language}: missing weight is explicit and never becomes a zero dose`,()=>{
  const html=render(language,[{...item(),weight:0,weightUnspecified:true,warmupSets:[]}]);
  assert.match(html,language==='en'?/Weight not specified/:/לא הוגדר משקל/);assert.doesNotMatch(html,/>0 kg/);
 });
 test(`${language}: separate days and preparation sections remain readable with no publication dependency`,()=>{
  const html=render(language,[{...item(),dayId:'1',workoutSection:'warmup'},{...item(),dayId:'2',targetRpe:null,targetRpes:undefined}]);
  assert.match(html,language==='en'?/Workout day 1/:/יום אימון 1/);assert.match(html,language==='en'?/Workout day 2/:/יום אימון 2/);
  assert.match(html,language==='en'?/Warm-up &amp; Mobility/:/חימום ומוביליטי/);assert.match(html,language==='en'?/Main workout/:/האימון המרכזי/);
 });
 test(`${language}: scalar and per-set RPE stay exact without a false missing warning`,()=>{
  const html=render(language,[{...item(),effortScale:'rpe',targetRpes:[6,8,9]}]);
  assert.match(html,language==='en'?/RPE 6/:/RPE יעד 6/);assert.match(html,language==='en'?/RPE 8/:/RPE יעד 8/);assert.match(html,language==='en'?/RPE 9/:/RPE יעד 9/);assert.doesNotMatch(html,/Missing effort target|חסר יעד מאמץ/);
  const scalar=render(language,[{...item(),setReps:undefined,targetRpes:undefined,targetRpe:7,effortScale:'rpe'}]);assert.match(scalar,language==='en'?/RPE 7/:/RPE יעד 7/);
 });
 test(`${language}: empty draft can be previewed`,()=>{assert.match(render(language,[]),language==='en'?/No exercises yet/:/עדיין אין תרגילים/);});
}
test('lb source load is converted back exactly without publishing or altering the draft',()=>{
 const prescription={...item(),weight:loads.toKg(3.125,'lb'),load:{sourceValue:3.125,sourceUnit:'lb',basis:'per-side'}};
 const before=JSON.stringify(prescription);assert.match(render('en',[prescription]),/3\.125 lb per side/);assert.equal(JSON.stringify(prescription),before);
});
test('preview navigation handlers run only when the corresponding button is selected',()=>{
 const Preview=fixture(),calls=[];const tree=Preview({title:'Synthetic',items:[item()],onBack:()=>calls.push('back'),onEditDay:id=>calls.push(id)});
 assert.deepEqual(calls,[]);
 const buttons=[];function walk(node){if(!node||typeof node!=='object')return;if(Array.isArray(node)){node.forEach(walk);return;}if(node.type==='button')buttons.push(node);walk(node.props?.children);}walk(tree);
 buttons.find(button=>button.props.children==='Edit day').props.onClick();assert.deepEqual(calls,['2']);
 buttons.find(button=>button.props.children==='Back to editor').props.onClick();assert.deepEqual(calls,['2','back']);
});

test('cardio preview reuses the read-only trainee prescription without strength doses',()=>{
 const html=render('en',[{...training.defaultPrescription('cardio:walking'),notes:'Private cardio note'}]);
 assert.match(html,/Walking/);assert.match(html,/10:00/);assert.match(html,/Private cardio note/);assert.doesNotMatch(html,/0 kg|Missing effort target|Start cardio|Save results/);
});
for(const language of ['he','en']){
 test(`${language}: cardio retains explicit rest, including zero, and omits unspecified rest`,()=>{
  const cardioItem=training.defaultPrescription('cardio:walking');
  for(const restSeconds of [0,90])assert.match(render(language,[{...cardioItem,restSeconds}]),new RegExp(language==='en'?`Rest: ${restSeconds} seconds`:`מנוחה: ${restSeconds} שניות`));
  assert.doesNotMatch(render(language,[cardioItem]),language==='en'?/Rest: /:/מנוחה: /);
 });
}

for(const language of ['he','en']){
 test(`${language}: invalid draft set counts keep content but do not render a dose`,()=>{
  const calls=[],Preview=fixture(language,props=>calls.push(props));
  for(const sets of [0,-1,1.5,100,1000000])for(const perSet of [true,false]){
   const html=renderToStaticMarkup(React.createElement(Preview,{title:'Invalid draft',items:[{...item(),sets,...(perSet?{}:{setReps:undefined,targetRpes:undefined})}],onBack(){}}));
   assert.match(html,language==='en'?/Fix set count \(1–20\) in editor to preview dose/:/תקנו את מספר הסטים \(1–20\) בעורך כדי להציג את המינון/);assert.match(html,/role="alert"/);
   assert.match(html,/Private note/);assert.match(html,new RegExp(`>${sets} `));assert.equal(calls.length,0);
  }
 });
}
