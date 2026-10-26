import test from 'node:test';import assert from 'node:assert/strict';
import * as cardio from '../lib/cardio.ts';
import {applyCardioAction,cardioIntervalPosition} from '../lib/cardio-player.ts';
const prescription={activityId:'outdoor_running',mode:'steady',targets:{durationSeconds:60}};
const action=(command,extra={})=>({command,actionId:crypto.randomUUID(),...extra});
test('requested hiking and sprint activities are additive with canonical bilingual aliases',()=>{
 for(const id of ['walking','outdoor_running','cycling','stationary_bike','elliptical','rowing_machine','swimming','stair_climber','treadmill_running','hiit','sprints','jump_rope','hiking','skierg','other_cardio'])assert.ok(cardio.cardioActivity(id),id);
 assert.equal(typeof cardio.resolveCardioActivityName,'function');
 for(const [name,id] of [['טיול רגלי','hiking'],['Hiking','hiking'],['ספרינטים','sprints'],['Sprints','sprints'],['Ski Erg','skierg'],['אופני כושר','stationary_bike']])assert.equal(cardio.resolveCardioActivityName(name),id);
 assert.equal(cardio.resolveCardioActivityName('unknown activity'),'');
});
test('metrics remain activity-specific and heart-rate zones are explicit user definitions',()=>{
 assert.throws(()=>cardio.parseCardioMetrics('jump_rope',{distanceMeters:200}));assert.throws(()=>cardio.parseCardioMetrics('hiit',{speedKph:10}));
 assert.equal(cardio.parseCardioMetrics('hiking',{distanceMeters:1000,speedKph:5,heartRateZone:2}).heartRateZone,2);
 for(const zone of [0,6,2.5])assert.throws(()=>cardio.parseCardioMetrics('walking',{heartRateZone:zone}));
 assert.equal(cardio.cardioActivity('swimming').paceUnit,'seconds/100m');
});
test('rounds repeat the complete work-rest sequence instead of grouping all work then all rest',()=>{
 const p=cardio.parseCardioPrescription({activityId:'sprints',mode:'intervals',targets:{},rounds:3,intervals:[{id:'work',phase:'work',durationSeconds:30},{id:'rest',phase:'recovery',durationSeconds:10}]});
 assert.equal(p.rounds,3);assert.equal(cardioIntervalPosition(p,35).interval.id,'rest');assert.equal(cardioIntervalPosition(p,40).interval.id,'work');assert.equal(cardioIntervalPosition(p,120).interval,null);
 assert.throws(()=>cardio.parseCardioPrescription({...p,rounds:101}));assert.throws(()=>cardio.parseCardioPrescription({...prescription,rounds:2}));
});
test('actual metrics disclose manual device-reported timer calculated and estimated provenance',()=>{
 let result=applyCardioAction(prescription,undefined,action('start'),'2026-10-26T10:00:00Z');
 result=applyCardioAction(prescription,result,action('finish',{metrics:{distanceMeters:200,heartRate:130,calories:20},metricSources:{heartRate:'device_reported',calories:'estimated'}}),'2026-10-26T10:01:00Z');
 assert.equal(result.metrics.durationSeconds,60);assert.equal(result.metrics.paceSeconds,300);assert.equal(result.metrics.speedKph,12);
 assert.equal(result.metricSources.distanceMeters,'manual');assert.equal(result.metricSources.durationSeconds,'timer');assert.equal(result.metricSources.paceSeconds,'calculated');assert.equal(result.metricSources.heartRate,'device_reported');assert.equal(result.metricSources.calories,'estimated');
 assert.throws(()=>applyCardioAction(prescription,undefined,action('start',{metrics:{heartRate:120},metricSources:{heartRate:'calculated'}}),'2026-10-26T10:00:00Z'));
});
test('completed results can be manually corrected without resuming the timer or accumulating gap time',()=>{
 let result=applyCardioAction(prescription,undefined,action('start'),'2026-10-26T10:00:00Z');result=applyCardioAction(prescription,result,action('finish',{metrics:{distanceMeters:200}}),'2026-10-26T10:01:00Z');
 const edit=action('edit-results',{metrics:{durationSeconds:120,distanceMeters:400},metricSources:{durationSeconds:'manual'}});
 const fixed=applyCardioAction(prescription,result,edit,'2026-10-26T11:01:00Z');assert.equal(fixed.status,'completed');assert.equal(fixed.elapsedSeconds,60);assert.equal(fixed.finishedAt,result.finishedAt);assert.equal(fixed.metrics.durationSeconds,120);assert.equal(cardio.performedCardioSeconds(fixed),120);assert.equal(fixed.metrics.paceSeconds,300);
 assert.deepEqual(applyCardioAction(prescription,fixed,edit,'2026-10-26T12:01:00Z'),fixed);
 assert.throws(()=>applyCardioAction(prescription,fixed,action('resume'),'2026-10-26T12:01:00Z'));
});

test('SQLite round prescription and corrected actual results survive reload without changing timer history',async t=>{
 const {platform,client}=await import('./platform-db.mjs');const {randomUUID}=await import('node:crypto');const f=platform(t);await f.connect();
 const p={activityId:'hiking',mode:'intervals',targets:{rpe:5},rounds:3,intervals:[{id:'work',phase:'work',durationSeconds:30},{id:'rest',phase:'recovery',durationSeconds:10}]};
 const item=await f.training.savePlan(client.userId,{exerciseId:'cardio:hiking',cardio:p});assert.deepEqual((await f.training.getPlan(client.userId))[0].cardio,cardio.parseCardioPrescription(p));
 let s=await f.training.start(client.userId,{requestId:randomUUID(),before:0});const patch=(command,extra={})=>f.training.patch(client.userId,{id:s.id,version:s.version,action:'cardio',exerciseId:item.exerciseId,occurrenceId:item.occurrenceId,actionId:randomUUID(),command,...extra});
 s=await patch('start');s=await patch('finish',{metrics:{durationSeconds:60,distanceMeters:100,heartRate:120},metricSources:{heartRate:'device_reported'}});const elapsed=s.items[0].cardioResult.elapsedSeconds,finishedAt=s.items[0].cardioResult.finishedAt;
 s=await patch('edit-results',{metrics:{durationSeconds:120,distanceMeters:200,heartRate:122},metricSources:{durationSeconds:'manual',heartRate:'device_reported'}});
 let loaded=(await f.training.feed(client.userId)).active;assert.equal(loaded.items[0].cardioResult.metrics.durationSeconds,120);assert.equal(loaded.items[0].cardioResult.elapsedSeconds,elapsed);assert.equal(loaded.items[0].cardioResult.finishedAt,finishedAt);assert.equal(loaded.items[0].cardioResult.metricSources.heartRate,'device_reported');assert.equal(loaded.items[0].cardio.rounds,3);
 s=await f.training.patch(client.userId,{id:s.id,version:s.version,action:'finish',after:0});loaded=(await f.training.feed(client.userId)).history[0];assert.equal(loaded.items[0].cardioResult.metrics.durationSeconds,120);assert.equal(loaded.items[0].cardioResult.metricSources.paceSeconds,'calculated');
});
