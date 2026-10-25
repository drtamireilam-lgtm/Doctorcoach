import test from 'node:test';
import assert from 'node:assert/strict';
import {cardioProgressSummary} from '../lib/cardio-progress.ts';
const session=(id,activityId,seconds,metrics={})=>({id,status:'completed',finishedAt:'2026-10-20T12:00:00Z',items:[{cardio:{activityId,targets:{},mode:'steady'},cardioResult:{status:'completed',elapsedSeconds:seconds,metrics}}]});
test('cardio progress keeps activity units separate and includes observed zero RPE',()=>{
 const summary=cardioProgressSummary([session('a','outdoor_running',600,{distanceMeters:2000,paceSeconds:300,rpe:0}),session('b','rowing_machine',600,{distanceMeters:2000,paceSeconds:150})]);
 assert.equal(summary.sessions,2);assert.equal(summary.minutes,20);assert.equal(summary.activities.length,2);assert.equal(summary.activities.find(a=>a.activityId==='outdoor_running').averageRpe,0);
});
test('missing metrics remain missing and uncompleted cardio does not inflate progress',()=>{
 const a=session('a','swimming',120);const b=session('b','swimming',0);b.items[0].cardioResult.status='paused';
 const result=cardioProgressSummary([a,b]);assert.equal(result.sessions,1);assert.equal(result.activities[0].distanceMeters,null);assert.equal(result.activities[0].averageHeartRate,null);
});
test('pace records require repeated comparable distance and activity context',()=>{
 const a=session('a','outdoor_running',600,{distanceMeters:2000,paceSeconds:300}),b=session('b','outdoor_running',500,{distanceMeters:2000,paceSeconds:250}),c=session('c','treadmill_running',500,{distanceMeters:2000,paceSeconds:200});
 const result=cardioProgressSummary([a,b,c]);assert.equal(result.records.length,1);assert.equal(result.records[0].activityId,'outdoor_running');assert.equal(result.records[0].paceSeconds,250);
});
