import test from 'node:test';import assert from 'node:assert/strict';
import {performancePoints} from '../lib/performance.ts';import {weeklyProgress} from '../lib/weekly-progress.ts';import {workoutFinishSummary} from '../lib/workout-finish.ts';import {previousSetPerformance} from '../lib/workout-experience.ts';import {nextLoad} from '../lib/training.ts';
const item={exerciseId:'assisted-pull-up',name:'Assisted',unit:'reps',sets:1,reps:5,weight:50,targetRpe:8,results:[{done:true,weight:50,amount:5,actualRpe:7}]};
const s={id:'past',status:'completed',planMode:'coached',programId:'p',startedAt:'2026-10-05T10:00:00Z',finishedAt:'2026-10-05T11:00:00Z',before:0,after:0,items:[item]};
test('assisted history keeps reported weight but never derives either strength estimate method',()=>{
 for(const method of ['effort','reps']){const points=performancePoints([s],item.exerciseId,method);assert.equal(points[0].weight,50);assert.equal(points[0].e1rm,null);}
});
test('weekly assisted history keeps reported weight and set count without external volume or strength',()=>{
 const summary=weeklyProgress([s],[],'2026-10-04').current;
 assert.equal(summary.sets,1);assert.equal(summary.volume,null);assert.equal(summary.exercises[0].weight,50);assert.equal(summary.exercises[0].e1rm,null);
});
test('finish assisted history preserves recorded comparisons while excluding external volume',()=>{
 const summary=workoutFinishSummary(s,[]);assert.equal(summary.comparisons[0].current.weight,50);assert.equal(summary.comparisons[0].current.estimate,null);assert.equal(summary.volumeKg,null);assert.equal(summary.volumeExcludedSets,1);
});
test('direct next-workout rule cannot increase or decrease ambiguous assistance load',()=>assert.equal(nextLoad(item,s).weight,null));
test('previous-set display preserves assisted reported numbers unchanged',()=>{
 const before=JSON.stringify(s),active={...s,id:'active',status:'active',startedAt:'2026-10-06T10:00:00Z'};
 assert.equal(previousSetPerformance(item,0,active,[s]),item.results[0]);assert.equal(JSON.stringify(s),before);
});
