import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,client,stranger} from './platform-db.mjs';
import {defaultPrescription} from '../lib/training.ts';
import {finishFeedback,workoutFinishSummary} from '../lib/workout-finish.ts';
async function fixture(t){const f=platform(t);await f.connect();await f.training.savePlan(client.userId,{...defaultPrescription('goblet'),sets:2,reps:8,weight:20});let s=await f.training.start(client.userId,{requestId:randomUUID(),before:0});s=await f.training.patch(client.userId,{action:'set',id:s.id,version:s.version,exerciseId:'goblet',setIndex:0,done:true,amount:8,weight:20,actualRpe:8});return {f,s};}
test('finish stores optional feedback with the partial workout atomically; retry cannot overwrite it',async t=>{
 const {f,s}=await fixture(t);const request={action:'finish',id:s.id,version:s.version,after:2,feedback:{effort:7.5,note:'  good session  '}};
 const saved=await f.training.patch(client.userId,request);
 assert.deepEqual(saved.finishFeedback,{effort:7.5,note:'good session'});assert.equal(saved.completedSets,1);assert.equal(saved.status,'completed');assert.deepEqual(saved.items,s.items);
 assert.deepEqual((await f.training.feed(client.userId)).history[0].finishFeedback,saved.finishFeedback);
 assert.deepEqual((await f.training.patch(client.userId,{...request,feedback:{effort:1,note:'overwrite'}})).finishFeedback,saved.finishFeedback);
 await assert.rejects(()=>f.training.patch(stranger.userId,request),e=>e.status===404);
});
test('invalid feedback leaves the active workout and completed sets unchanged',async t=>{
 const {f,s}=await fixture(t);
 for(const feedback of [{effort:11},{effort:1.2},{effort:'8'},{note:'a'.repeat(501)},[]])await assert.rejects(()=>f.training.patch(client.userId,{action:'finish',id:s.id,version:s.version,after:0,feedback}));
 const active=(await f.training.feed(client.userId)).active;assert.equal(active.version,s.version);assert.deepEqual(active.items,s.items);assert.equal(active.finishFeedback,null);
 assert.deepEqual(finishFeedback({}),{effort:null,note:''});assert.equal(finishFeedback(undefined),null);
});
test('older clients can finish without optional feedback',async t=>{
 const {f,s}=await fixture(t);assert.equal((await f.training.patch(client.userId,{action:'finish',id:s.id,version:s.version,after:0})).finishFeedback,null);
});
const item=(patch={})=>({exerciseId:'a',name:'Exercise',unit:'reps',sets:2,dayId:'1',results:[{done:true,weight:20,amount:8,actualRpe:8},{done:false,weight:999,amount:10,actualRpe:10}],...patch});
const session=(patch={})=>({id:'current',planMode:'coached',programId:'p',status:'active',startedAt:'2026-10-16T10:00:00Z',finishedAt:null,items:[item()],plannedSets:2,...patch});
test('summary excludes unperformed sets, future, cancelled and different-assignment history',()=>{
 const old=session({id:'old',status:'completed',finishedAt:'2026-10-15T10:00:00Z',items:[item({results:[{done:true,weight:18,amount:8,actualRpe:8}]})]});
 const noise=[session({id:'future',status:'completed',finishedAt:'2026-10-17T10:00:00Z'}),session({id:'cancelled',status:'cancelled',finishedAt:'2026-10-16T09:00:00Z'}),session({id:'other',programId:'other',status:'completed',finishedAt:'2026-10-16T09:00:00Z'})];
 const summary=workoutFinishSummary(session(),[...noise,old]);assert.equal(summary.exercises,1);assert.equal(summary.sets,1);assert.equal(summary.comparisons[0].current.weight,20);assert.equal(summary.comparisons[0].prior.weight,18);assert.equal(summary.comparisons[0].previousAt,old.finishedAt);
});
test('summary never invents a baseline or e1RM for unsupported sets',()=>{
 const s=session({items:[item({results:[{done:true,weight:0,amount:15}]})]});const summary=workoutFinishSummary(s,[]);assert.equal(summary.comparisons[0].prior,null);assert.equal(summary.comparisons[0].current.estimate,null);
 const otherDay=session({id:'old',status:'completed',finishedAt:'2026-10-15',items:[item({dayId:'2'})]});assert.equal(workoutFinishSummary(s,[otherDay]).comparisons[0].prior,null);
});

test('summary volume counts only completed main sets with known total external load',()=>{
 const s=session({items:[item(),item({exerciseId:'warm',workoutSection:'warmup'}),item({exerciseId:'side',load:{basis:'per-side',sourceValue:20,sourceUnit:'kg'}}),item({exerciseId:'timed',unit:'seconds'})]});
 const summary=workoutFinishSummary(s,[]);assert.equal(summary.volumeKg,160);assert.equal(summary.volumeExcludedSets,2);
 assert.equal(workoutFinishSummary(session({items:[item({load:{basis:'per-side',sourceValue:20,sourceUnit:'kg'}})]}),[]).volumeKg,null);
});

test('completed exercise count distinguishes a partial exercise from a fully completed one',()=>{
 assert.equal(workoutFinishSummary(session(),[]).completedExercises,0);
 const full=item({results:[{done:true,weight:20,amount:8},{done:true,weight:21,amount:8}]});
 assert.equal(workoutFinishSummary(session({items:[full]}),[]).completedExercises,1);
});
