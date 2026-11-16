import test from 'node:test';
import assert from 'node:assert/strict';
import {nextSetRecommendation} from '../lib/training-recommendation.ts';
import {adaptiveProgression} from '../lib/adaptive-progression.ts';
import {defaultPrescription} from '../lib/training.ts';
const item=()=>({...defaultPrescription('goblet'),dayId:'1',sets:2,reps:5,repsMax:8,weight:100,targetRpe:8});
const session=(id='s',amount=8)=>({id,programId:'p',status:'completed',startedAt:'2026-10-01',finishedAt:'2026-10-02',before:0,after:0,items:[{...item(),name:'test',results:[0,1].map(()=>({done:true,weight:100,amount,actualRpe:7}))}]});
const feed=(history)=>({active:null,history,stats:{total:history.length,week:0,sets:0}});
test('next-set explanation distinguishes bounded delta from model delta',()=>{
 const i=session().items[0];i.results[1]={done:false,weight:100,amount:5,actualRpe:null};
 const result=nextSetRecommendation(i,0,{before:0,after:null},2.5);
 assert.equal(result.weight,105);assert.equal(result.deltaKg,5);assert.equal(result.deltaPercent,5);
 assert.ok(result.rawDeltaPercent>5);assert.equal(result.uncertainty,'heuristic');assert.ok(result.constraints.includes('max-change-5-percent'));
});
test('pain and unsupported equipment produce no actionable recommendation',()=>{
 const i=session().items[0];i.results[1].done=false;
 assert.equal(nextSetRecommendation(i,0,{before:1,after:null}).status,'blocked');
 assert.equal(nextSetRecommendation(i,0,{before:0,after:null},3).status,'blocked');
});
test('double progression requires coach selected repeated evidence and changes drafts only',()=>{
 const i=item(),history=[session('a'),session('b')],before=JSON.stringify({i,history});
 const policy={strategy:'double',requiredSessions:2,loadStep:2.5};
 assert.equal(adaptiveProgression(i,'p',feed(history.slice(0,1)),policy).patch,null);
 const result=adaptiveProgression(i,'p',feed(history),policy);
 assert.deepEqual(result.patch,{weight:102.5,reps:5});assert.equal(result.sourceIds.length,2);
 assert.equal(JSON.stringify({i,history}),before);
});
test('rep progression stays within coach range and pain blocks historical progression',()=>{
 const i=item(),s=session('a',6),policy={strategy:'reps',requiredSessions:1,loadStep:2.5};
 assert.deepEqual(adaptiveProgression(i,'p',feed([s]),policy).patch,{reps:6});
 s.items[0].results[0].painDuring=1;
 assert.equal(adaptiveProgression(i,'p',feed([s]),policy).patch,null);
});
test('changed effort targets and incomplete latest exposure block progression',()=>{
 const s=session(),policy={strategy:'load',requiredSessions:1,loadStep:2.5};
 s.items[0].targetRpes=[7,9];
 assert.equal(adaptiveProgression(item(),'p',feed([s]),policy).patch,null);
 delete s.items[0].targetRpes;s.items[0].results[1].done=false;
 assert.equal(adaptiveProgression(item(),'p',feed([s]),policy).patch,null);
});
test('RPE policy changes only a draft target, and load policy requires available conservative step',()=>{
 const i=item(),f=feed([session()]);
 assert.deepEqual(adaptiveProgression(i,'p',f,{strategy:'rpe',requiredSessions:1,loadStep:2.5}).patch,{targetRpe:8.5});
 assert.deepEqual(adaptiveProgression(i,'p',f,{strategy:'load',requiredSessions:1,loadStep:2.5}).patch,{weight:102.5});
 assert.equal(adaptiveProgression(i,'p',f,{strategy:'load',requiredSessions:1,loadStep:10}).patch,null);
});
test('unknown pain, substituted exposure and per-side loads never create draft actions',()=>{
 const policy={strategy:'double',requiredSessions:1,loadStep:2.5};
 for(const edit of [s=>s.before=null,s=>s.items[0].swappedFrom='goblet',s=>s.items[0].load={basis:'per-side'},s=>s.items[0].results[0].actualRpe=NaN]){
  const s=session();edit(s);assert.equal(adaptiveProgression(item(),'p',feed([s]),policy).patch,null);
 }
});
test('assisted machine load and invalid coach steps never create progression drafts',()=>{
 const s=session(),i={...item(),exerciseId:'assisted-pull-up'};s.items[0].exerciseId=i.exerciseId;
 assert.equal(adaptiveProgression(i,'p',feed([s]),{strategy:'load',requiredSessions:1,loadStep:2.5}).patch,null);
 for(const loadStep of [NaN,Infinity,0,-1,undefined])assert.equal(adaptiveProgression(item(),'p',feed([session()]),{strategy:'load',requiredSessions:1,loadStep}).patch,null);
});
import {recommendationExplanation} from '../lib/training-recommendation.ts';
test('explanation uses edited source weight rather than persisted set weight',()=>{
 const i=session().items[0],suggestion={weight:62.5,calculatedWeight:66.7,relativePercent:11.1,text:'preview',estimate:130};
 const explanation=recommendationExplanation(i,0,suggestion,60);
 assert.equal(explanation.deltaKg,2.5);assert.equal(explanation.deltaPercent,4.2);
});
test('adaptive progression uses performed date rather than retrospective upload date',()=>{
 const old=session('old-performed'),recent=session('recent-performed');
 old.finishedAt='2026-12-01T11:00:00Z';old.retrospective={date:'2026-09-01',performedAt:null,recordedAt:'2026-12-01T11:00:00Z'};
 recent.finishedAt='2026-10-02T11:00:00Z';recent.items[0].results[0].done=false;
 assert.equal(adaptiveProgression(item(),'p',feed([old,recent]),{strategy:'load',requiredSessions:1,loadStep:2.5}).patch,null);
});
test('changing side or load source unit cannot reuse prior progression evidence',()=>{
 const policy={strategy:'load',requiredSessions:1,loadStep:2.5};
 const s=session();s.items[0].side='left';
 assert.equal(adaptiveProgression({...item(),side:'right'},'p',feed([s]),policy).patch,null);
 const pounds=session();pounds.items[0].load={sourceUnit:'lb',sourceValue:220.46226218,basis:'total'};
 assert.equal(adaptiveProgression({...item(),load:{sourceUnit:'kg',sourceValue:100,basis:'total'}},'p',feed([pounds]),policy).patch,null);
});
test('same-day date-only evidence cannot claim latest exposure from upload time',()=>{
 const old=session('z-unknown'),known=session('a-known');
 old.finishedAt='2026-12-01T11:00:00Z';old.retrospective={date:'2026-10-02',performedAt:null};
 known.finishedAt='2026-10-02T11:00:00Z';known.items[0].results[0].done=false;
 assert.equal(adaptiveProgression(item(),'p',feed([old,known]),{strategy:'load',requiredSessions:1,loadStep:2.5}).patch,null);
});
