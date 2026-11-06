import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import * as sections from '../lib/workout-sections.ts';
import * as effort from '../lib/effort.ts';
import {targetRpeForSet,repetitionLabel} from '../lib/training.ts';
function load(name,language='he'){
 const exports={};const modules={'react/jsx-runtime':jsx,'./load-unit-picker':{useLoadUnit:()=> 'kg'},'../lib/load-units':{fromKg:(weight)=>weight},'./language-provider':{useLanguage:()=>({language}),Localize:'Localize'},'../lib/workout-sections':sections,'../lib/effort':effort,'../lib/training':{targetRpeForSet,repetitionLabel}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../components/'+name,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:k=>modules[k]??{}});return exports;
}
function nodes(n,p){return !n||typeof n!=='object'?[]:[...(p(n)?[n]:[]),...[n.props?.children].flat(Infinity).flatMap(c=>nodes(c,p))];}
function text(n){return n==null||typeof n==='boolean'?'':typeof n==='string'||typeof n==='number'?String(n):[n.props?.children].flat(Infinity).map(text).join(' ');}
test('next-set recommendation stays one compact line without paragraphs or formulas',()=>{
 for(const language of ['he','en']){
  const tree=load('next-set-calculation.tsx',language).NextSetCalculation({item:{results:[{weight:80},{amount:8}]},index:0,suggestion:{calculatedWeight:82.5,relativePercent:3.1},preview:true});
  assert.equal(nodes(tree,n=>n.type==='p').length,0);
  assert.match(text(tree),/82[.,]5/);assert.ok(text(tree).length<120);
 }
});

test('active workout explains declining performance and preserves four decimal loads in both languages',()=>{
 for(const language of ['he','en']){
  const tree=load('next-set-calculation.tsx',language).NextSetCalculation({item:{targetRpe:8,results:[{weight:96,actualRpe:6},{amount:5}]},index:0,suggestion:{weight:96,calculatedWeight:101.1892,relativePercent:5.4,fatigueLimited:true},expanded:true});
  assert.match(text(tree),language==='en'?/declining performance/i:/ירידה בביצוע/);
  assert.ok(!text(tree).includes('↑'));
  assert.match(text(tree),language==='en'?/choose/i:/בחיר/);
  const decimal=load('next-set-calculation.tsx',language).NextSetCalculation({item:{results:[{weight:60},{amount:5}]},index:0,suggestion:{weight:62.8571,calculatedWeight:62.9,relativePercent:4.8},expanded:true});
  assert.match(text(decimal),/62[.,]8571/);
 }
});
test('active workout gives a nonnumeric explanation when a recommendation is unavailable',()=>{
 for(const language of ['he','en']){
  const tree=load('next-set-calculation.tsx',language).NextSetCalculation({item:{results:[{weight:0},{amount:5}]},index:0,suggestion:{weight:null,calculatedWeight:null,text:'לחישוב נדרשים משקל חיצוני, 1–10 חזרות ו־RPE בין 6 ל־10.'},expanded:true});
  assert.match(text(tree),language==='en'?/1–10.*RPE/i:/1–10.*RPE/);
  assert.ok(!text(tree).includes('null'));
 }
});
test('last set still compares actual effort with its target without inventing another set',()=>{
 for(const language of ['he','en']){
  const tree=load('next-set-calculation.tsx',language).NextSetCalculation({item:{targetRpe:8,results:[{weight:60,actualRpe:9}]},index:0,suggestion:{weight:null,calculatedWeight:null,text:'זה הסט האחרון בתרגיל.'},expanded:true});
  assert.match(text(tree),language==='en'?/Harder than target/:/קשה מהיעד/);
  assert.ok(!text(tree).includes(language==='en'?'Next set':'הסט הבא'));
 }
});
test('preview direction and effort feedback use edited load and target rather than stale saved values',()=>{
 const tree=load('next-set-calculation.tsx','en').NextSetCalculation({item:{targetRpe:8,results:[{weight:100,actualRpe:8},{amount:5}]},index:0,sourceWeight:60,targetRpe:7,actualRpe:8,suggestion:{weight:62.8571,calculatedWeight:62.9,relativePercent:4.8},expanded:true,preview:true});
  assert.match(text(tree),/↑/);assert.match(text(tree),/Harder than target/);assert.match(text(tree),/target\s+7/);
});
test('effort feedback preserves RIR zero, per-set targets and explicit missing draft targets',()=>{
 const props={item:{effortScale:'rir',targetRpe:8,targetRpes:[9,7],results:[{weight:60,actualRpe:10},{weight:60,actualRpe:8}]},index:0,suggestion:{weight:60,calculatedWeight:60,relativePercent:0},expanded:true};
 const render=load('next-set-calculation.tsx','en').NextSetCalculation;
 assert.match(text(render(props)),/RIR\s+0.*target\s+1/);
 assert.match(text(render({...props,index:1})),/Harder than target.*RIR\s+2.*target\s+3/);
 assert.ok(!text(render({...props,targetRpe:null})).includes('Harder than target'));
});
test('preparation combines warmup and stretching without dropping original indexes',()=>{
 const items=[{exerciseId:'walk',workoutSection:'warmup'},{exerciseId:'squat',workoutSection:'main'},{exerciseId:'stretch',workoutSection:'stretch'}];
 const visited=[],tree=load('workout-sections.tsx','en').WorkoutSections({items,children:(item,index)=>{visited.push([item.exerciseId,index]);return null;}});
 assert.equal(nodes(tree,n=>n.type==='section').length,2);
 assert.ok(text(tree).includes('Warm-up & Mobility'));
 assert.deepEqual(visited,[['walk',0],['stretch',2],['squat',1]]);
});
test('learning deep link opens the dedicated DoctorCoach guide',async()=>{
 const {learningTopic}=await import('../lib/learning-navigation.ts');
 assert.equal(learningTopic('#learn?article=doctorcoach'),'doctorcoach');
});

test('learning navigation keeps general guides separate from DoctorCoach overview',async()=>{
 const navigation=await import('../lib/learning-navigation.ts');
 let stateIndex=0;
 const exports={},modules={'react/jsx-runtime':jsx,react:{useState:()=>[['doctorcoach','anatomy'][stateIndex++],()=>{}],useEffect:()=>{}},'../components/language-provider':{Localize:'Localize',useLanguage:()=>({language:'he'})},'./anatomy-workspace':{AnatomyWorkspace:'AnatomyWorkspace'},'./learning-workspace':{LearningWorkspace:'LearningWorkspace'},'../lib/learning-navigation':navigation};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../components/learning-area.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:k=>modules[k]});
 const links=nodes(exports.LearningArea({onExercise(){}}),n=>n.type==='a');
 const general=links.find(a=>a.props.href==='#learn?article=rpe'),overview=links.find(a=>a.props.href==='#learn?article=doctorcoach');
 assert.ok(general);assert.equal(general.props['aria-current'],undefined);assert.equal(overview.props['aria-current'],'page');
 assert.ok(links.some(a=>a.props.href==='#learn?section=physiology'));
 assert.ok(links.some(a=>a.props.href==='#learn?section=supplements'));
});

test('collapsed workout prescription labels per-side loads explicitly in both languages',()=>{
 for(const language of ['he','en']){
  const tree=load('workout-prescription.tsx',language).WorkoutPrescription({item:{sets:3,reps:8,unit:'reps',weight:20,targetRpe:8,load:{sourceValue:20,sourceUnit:'kg',basis:'per-side'}}});
  assert.ok(text(tree).includes(language==='en'?'per side':'לכל צד'));
 }
});
