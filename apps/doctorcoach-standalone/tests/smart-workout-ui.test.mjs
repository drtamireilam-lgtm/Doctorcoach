import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import * as sections from '../lib/workout-sections.ts';
function load(name,language='he'){
 const exports={};const modules={'react/jsx-runtime':jsx,'./language-provider':{useLanguage:()=>({language}),Localize:'Localize'},'../lib/workout-sections':sections,'../lib/effort':{effortName:()=> 'RPE',effortValue:n=>n,effortTarget:()=> 'RPE 8'},'../lib/training':{targetRpeForSet:()=>8}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../components/'+name,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:k=>modules[k]??{}});return exports;
}
function nodes(n,p){return !n||typeof n!=='object'?[]:[...(p(n)?[n]:[]),...[n.props?.children].flat(Infinity).flatMap(c=>nodes(c,p))];}
function text(n){return !n?'':typeof n==='string'||typeof n==='number'?String(n):[n.props?.children].flat(Infinity).map(text).join(' ');}
test('next-set recommendation stays one compact line without paragraphs or formulas',()=>{
 for(const language of ['he','en']){
  const tree=load('next-set-calculation.tsx',language).NextSetCalculation({item:{results:[{weight:80},{amount:8}]},index:0,suggestion:{calculatedWeight:82.5,relativePercent:3.1},preview:true});
  assert.equal(nodes(tree,n=>n.type==='p').length,0);
  assert.match(text(tree),/82[.,]5/);assert.ok(text(tree).length<120);
 }
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
