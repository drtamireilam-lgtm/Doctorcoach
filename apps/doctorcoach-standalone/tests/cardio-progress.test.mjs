import test from 'node:test';
import assert from 'node:assert/strict';
import {cardioProgressSummary} from '../lib/cardio-progress.ts';
import {completeCardioMetrics} from '../lib/cardio.ts';
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
const dated=(id,at,metrics={},activity='outdoor_running',seconds=600)=>({...session(id,activity,seconds,metrics),finishedAt:at});
test('completed timer-derived pace and speed retain comparable pace improvement and one record context',()=>{
 const rows=['2026-10-19','2026-10-20','2026-10-26','2026-10-27'].map((day,i)=>{
  const elapsed=i<2?600:560,result=completeCardioMetrics('outdoor_running',{distanceMeters:2000,rpe:5,heartRate:140},undefined,elapsed,true);
  const row=dated(String(i),day+'T12:00:00Z',result.metrics,'outdoor_running',elapsed);
  row.items[0].cardioResult.metricSources=result.metricSources;return row;
 });
 const summary=cardioProgressSummary(rows);
 assert.deepEqual(summary.comparisons.map(c=>[c.metric,c.change]),[['paceSeconds',-20]]);
 assert.equal(summary.records.length,1);assert.equal(summary.records[0].paceSeconds,280);assert.equal(summary.records[0].observations,4);
});
test('weekly summaries use Sunday in selected timezone and preserve unknown duration/distance',()=>{
 const rows=[dated('sun','2026-10-25T01:00:00Z',{distanceMeters:2000}),dated('mon','2026-10-26T12:00:00Z',{}),dated('bad','not-a-date',{distanceMeters:4000}),dated('unknown','2026-10-20T12:00:00Z',{},'swimming',undefined)];rows[3].items[0].cardioResult.elapsedSeconds=undefined;
 const utc=cardioProgressSummary(rows,{timezone:'UTC'});assert.deepEqual(utc.weeks.map(w=>w.week),['2026-10-18','2026-10-25']);assert.equal(utc.weeks[0].activities[0].minutes,null);assert.equal(utc.weeks[1].activities[0].sessions,2);assert.equal(utc.weeks[1].activities[0].distanceMeters,2000);assert.equal(utc.weeks[1].activities[0].distanceObservations,1);assert.equal(utc.sessions,3);
 const la=cardioProgressSummary(rows,{timezone:'America/Los_Angeles'});assert.equal(la.weeks[0].activities.find(a=>a.activityId==='outdoor_running').sessions,1);assert.throws(()=>cardioProgressSummary(rows,{timezone:'Invalid/Zone'}));
});
test('week over week pace and HR require two observations per week in exact comparable context',()=>{
 const metrics={distanceMeters:2000,paceSeconds:300,rpe:5,heartRate:140};const rows=[dated('a','2026-10-19T12:00:00Z',metrics),dated('b','2026-10-20T12:00:00Z',{...metrics,heartRate:144}),dated('c','2026-10-26T12:00:00Z',{...metrics,heartRate:136}),dated('d','2026-10-27T12:00:00Z',{...metrics,heartRate:138})];
 const summary=cardioProgressSummary(rows);assert.equal(summary.comparisons.length,2);assert.equal(summary.comparisons.find(c=>c.metric==='heartRate').change,-5);assert.ok(summary.comparisons.every(c=>c.previousObservations===2&&c.currentObservations===2));assert.equal(cardioProgressSummary(rows.slice(1)).comparisons.length,0);
 rows[3].items[0].cardio.mode='intervals';assert.equal(cardioProgressSummary(rows).comparisons.length,0);
});
test('pace changes compare at same effort; HR does not compare across changed pace, missing RPE or incline',()=>{
 const rows=['2026-10-19','2026-10-20','2026-10-26','2026-10-27'].map((d,i)=>dated(String(i),d+'T12:00:00Z',{distanceMeters:2000,paceSeconds:i<2?300:280,rpe:5,heartRate:i<2?140:135}));
 assert.deepEqual(cardioProgressSummary(rows).comparisons.map(c=>c.metric),['paceSeconds']);
 rows[0].items[0].cardioResult.metrics.rpe=undefined;assert.equal(cardioProgressSummary(rows).comparisons.length,0);
 const treadmill=rows.map(r=>({...r,items:r.items.map(i=>({...i,cardio:{...i.cardio,activityId:'treadmill_running'}}))}));assert.equal(cardioProgressSummary(treadmill).comparisons.length,0);
});
test('manual performed duration overrides timer for weekly minutes and invalid dates are excluded',()=>{
 const a=dated('manual','2026-10-26T12:00:00Z',{durationSeconds:120},'walking',600),b=dated('invalid','2026-02-31T12:00:00Z',{},'walking',600);const summary=cardioProgressSummary([a,b]);assert.equal(summary.minutes,2);assert.equal(summary.weeks[0].minutes,2);assert.equal(summary.sessions,1);
});
test('HR zone, resistance, pool and interval context differences prevent unsupported comparisons',()=>{
 const dates=['2026-10-19','2026-10-20','2026-10-26','2026-10-27'];
 for(const [activity,qualifiers] of [['rowing_machine',{resistance:4,resistanceLabel:'Machine A'}],['swimming',{poolLengthMeters:25}],['treadmill_running',{inclinePercent:0}]]){
  const rows=dates.map((day,i)=>dated(String(i),day+'T12:00:00Z',{distanceMeters:2000,paceSeconds:300,rpe:5,heartRate:140,heartRateZone:3,...qualifiers},activity));assert.equal(cardioProgressSummary(rows).comparisons.length,2);
  rows[3].items[0].cardioResult.metrics.heartRateZone=4;assert.equal(cardioProgressSummary(rows).comparisons.length,0);
 }
});
test('duplicate activity occurrences in one workout cannot meet the two-session comparison threshold',()=>{
 const a=dated('a','2026-10-19T12:00:00Z',{distanceMeters:2000,paceSeconds:300,rpe:5,heartRate:140}),b=dated('b','2026-10-26T12:00:00Z',{distanceMeters:2000,paceSeconds:300,rpe:5,heartRate:140});a.items.push(structuredClone(a.items[0]));b.items.push(structuredClone(b.items[0]));assert.equal(cardioProgressSummary([a,b]).comparisons.length,0);assert.equal(cardioProgressSummary([a,b]).weeks[0].activities[0].sessions,1);
});
test('custom activity names and complete interval rounds remain separate comparison contexts',()=>{
 const rows=['2026-10-19','2026-10-20','2026-10-26','2026-10-27'].map((day,i)=>dated(String(i),day+'T12:00:00Z',{distanceMeters:2000,paceSeconds:300,rpe:5,heartRate:140},'other_cardio'));for(const row of rows)row.items[0].cardio.customLabel='Circuit A';assert.equal(cardioProgressSummary(rows).comparisons.length,2);rows[3].items[0].cardio.customLabel='Circuit B';assert.equal(cardioProgressSummary(rows).comparisons.length,0);
 for(const row of rows){row.items[0].cardio.customLabel='Circuit A';row.items[0].cardio.mode='intervals';row.items[0].cardio.intervals=[{id:'work',phase:'work',durationSeconds:60}];row.items[0].cardio.rounds=2;}assert.equal(cardioProgressSummary(rows).comparisons.length,2);rows[3].items[0].cardio.rounds=3;assert.equal(cardioProgressSummary(rows).comparisons.length,0);
});
