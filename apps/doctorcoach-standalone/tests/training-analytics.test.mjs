import test from 'node:test';
import assert from 'node:assert/strict';
import {trainingAnalytics} from '../lib/training-analytics.ts';
const item=(patch={})=>({exerciseId:'bench',name:'Bench',sets:2,reps:8,unit:'reps',weight:80,notes:'',targetRpe:8,results:[{done:true,amount:8,weight:80,actualRpe:8},{done:true,amount:8,weight:80,actualRpe:9}],...patch});
const session=(id,patch={})=>({id,status:'completed',items:[item()],startedAt:'2026-11-09T10:00:00Z',finishedAt:'2026-11-09T11:00:00Z',before:0,after:0,plannedSets:2,completedSets:2,version:1,...patch});
const period={start:'2026-11-01',end:'2026-12-01'};
test('counts only completed working sets and keeps muscle roles distinct',()=>{
 const result=trainingAnalytics([session('a',{items:[item(),item({workoutSection:'warmup'}),item({cardio:{activityId:'walk'},results:[{done:true,amount:600,weight:0}]}),item({exerciseId:'unknown',results:[{done:false,amount:8,weight:80}]})]})],period);
 assert.equal(result.sessions,1);assert.equal(result.sets,2);assert.equal(result.volumeKg,1280);
 assert.ok(result.muscles.some(m=>m.slug==='pectoralis-major'&&m.primary===2));
 assert.ok(result.muscles.some(m=>m.slug==='triceps-brachii'&&m.secondary===2));
 assert.equal(result.effort.reported,2);assert.equal(result.effort.above,1);
});
test('performed date wins over recording date and date-only retrospective time is not invented',()=>{
 const late=session('a',{startedAt:'2026-12-10T10:00:00Z',finishedAt:'2026-12-10T11:00:00Z',retrospective:{date:'2026-11-04',recordedAt:'2026-12-10T10:00:00Z',performedAt:null}});
 const result=trainingAnalytics([late],period);assert.equal(result.sessions,1);assert.equal(result.daily[0].day,'2026-11-04');
});
test('missing effort and unknown total loads remain unknown, not zero',()=>{
 const result=trainingAnalytics([session('a',{items:[item({load:{sourceValue:40,sourceUnit:'kg',basis:'per-side'},results:[{done:true,amount:8,weight:40,actualRpe:null}]})]})],period);
 assert.equal(result.volumeKg,null);assert.equal(result.unquantifiedSets,1);assert.equal(result.effort.averageDelta,null);assert.equal(result.effort.missing,1);assert.equal(result.exercises[0].points[0].e1rm,null);
});
test('deduplicates snapshots by session version without mutating source history',()=>{
 const old=session('a'),fresh=session('a',{version:2,items:[item({results:[{done:true,amount:5,weight:50,actualRpe:8}]})]});const history=[old,fresh];const before=structuredClone(history);
 assert.equal(trainingAnalytics(history,period).volumeKg,250);assert.deepEqual(history,before);
});
test('ignores active/cancelled sessions, invalid loads and out-of-period records',()=>{
 const result=trainingAnalytics([session('active',{status:'active'}),session('cancel',{status:'cancelled'}),session('old',{finishedAt:'2026-10-01T12:00:00Z'}),session('a',{items:[item({results:[{done:true,amount:8,weight:NaN,actualRpe:50}]})]})],period);
 assert.equal(result.sessions,1);assert.equal(result.volumeKg,null);assert.equal(result.effort.reported,0);assert.equal(result.unquantifiedSets,1);
});
test('keeps unilateral and tempo variants separate and reports explainable plateau evidence',()=>{
 const history=[1,2,3].map(n=>session('s'+n,{finishedAt:`2026-11-0${n}T12:00:00Z`,items:[item({side:'left'}),item({side:'right',tempo:{eccentric:3,bottom:0,concentric:1,top:0}})]}));
 const result=trainingAnalytics(history,period);assert.equal(result.exercises.length,2);assert.ok(result.observations.some(o=>o.kind==='plateau'&&o.sourceIds.length===3));
});
test('period validation rejects impossible dates and reversed or oversized windows',()=>{
 assert.throws(()=>trainingAnalytics([],{start:'2026-02-31',end:'2026-03-02'}));assert.throws(()=>trainingAnalytics([],{start:'2026-12-01',end:'2026-11-01'}));
});
test('timed working sets count as exposure without inventing kg-repetition volume',()=>{
 const result=trainingAnalytics([session('a',{items:[item({exerciseId:'plank',unit:'seconds',results:[{done:true,amount:30,weight:0,actualRpe:8}]})]})],period);
 assert.equal(result.sets,1);assert.equal(result.volumeKg,null);assert.equal(result.unquantifiedSets,1);
});
test('large recorded volume changes cite both equal-duration windows',()=>{
 const history=[session('a'),session('b',{finishedAt:'2026-11-10T12:00:00Z'}),session('old1',{finishedAt:'2026-10-10T12:00:00Z',items:[item({results:[{done:true,amount:8,weight:40,actualRpe:8}]})]}),session('old2',{finishedAt:'2026-10-11T12:00:00Z',items:[item({results:[{done:true,amount:8,weight:40,actualRpe:8}]})]})];
 const result=trainingAnalytics(history,period);assert.ok(result.observations.some(o=>o.kind==='load-change'&&o.sourceIds.length===4));assert.equal(result.volumeComparison.previousKg,640);
});
test('assistance resistance is never counted as external volume or estimated strength',()=>{
 const result=trainingAnalytics([session('a',{items:[item({exerciseId:'assisted-pull-up'})]})],period);
 assert.equal(result.volumeKg,null);assert.equal(result.exercises[0].points[0].e1rm,null);
});
test('known performed times order same-day trend points before UUIDs',()=>{
 const rows=[session('a-later',{startedAt:'2026-11-09T18:00:00Z',finishedAt:'2026-11-09T19:00:00Z'}),session('z-earlier',{startedAt:'2026-11-09T06:00:00Z',finishedAt:'2026-11-09T07:00:00Z'})];
 assert.deepEqual(trainingAnalytics(rows,period).exercises[0].points.map(p=>p.sessionId),['z-earlier','a-later']);
});
test('date-only retrospective points never sort by their upload timestamps',()=>{
 const rows=[session('a',{finishedAt:'2026-12-10T19:00:00Z',retrospective:{date:'2026-11-09',performedAt:null}}),session('z',{finishedAt:'2026-12-01T07:00:00Z',retrospective:{date:'2026-11-09',performedAt:null}})];
 assert.deepEqual(trainingAnalytics(rows,period).exercises[0].points.map(p=>p.sessionId),['a','z']);
});
test('reported repetitions survive missing, per-side and assisted external loads',()=>{
 for(const patch of [{load:{basis:'per-side'}},{exerciseId:'assisted-pull-up'},{results:[{done:true,amount:9,weight:null,actualRpe:8}]}]){
  const point=trainingAnalytics([session('a',{items:[item(patch)]})],period).exercises[0].points[0];
  assert.equal(point.reps,patch.results?9:8);assert.equal(point.volumeKg,null);assert.equal(point.e1rm,null);
 }
});
