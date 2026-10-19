import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,client,coach} from './platform-db.mjs';
import {wellnessStore} from '../lib/wellness-store.ts';
import {defaultPrescription} from '../lib/training.ts';

test('first coached workout starts without any previous workout or readiness record',async t=>{
 const f=platform(t);await f.connect();
 const p={id:randomUUID(),title:'First program',items:[{...defaultPrescription('bench'),dayId:'1',sets:3,reps:8,repsMax:10,weightUnspecified:true,targetRpe:8}]};
 await f.care.assign(coach,client.userId,p);
 assert.equal((await wellnessStore(f.db).bundle(client,client.userId)).records.length,0);
 const id=randomUUID(),s=await f.training.start(client.userId,{requestId:id,before:0,dayId:'1'});
 assert.equal(s.readiness,null);assert.equal(s.before,0);assert.equal(s.plannedSets,3);
 assert.equal(s.items[0].repsMax,10);assert.equal(s.items[0].results.length,3);
 assert.equal((await f.training.start(client.userId,{requestId:id,before:0,dayId:'1'})).id,s.id);
 assert.equal((await f.training.start(client.userId,{requestId:randomUUID(),before:0,dayId:'1'})).id,s.id);
});
test('empty or unresolved first program cannot create a partial workout',async t=>{
 const f=platform(t);await f.connect();
 await assert.rejects(()=>f.training.start(client.userId,{requestId:randomUUID(),before:0}));
 await f.care.assign(coach,client.userId,{id:randomUUID(),title:'Program',items:[defaultPrescription('bench'),defaultPrescription('walk')]});
 const row=f.sql.prepare('SELECT id,items_json FROM care_programs').get();const items=JSON.parse(row.items_json);items[1].exerciseId='missing-exercise';
 f.sql.prepare('UPDATE care_programs SET items_json=? WHERE id=?').run(JSON.stringify(items),row.id);
 await assert.rejects(()=>f.training.start(client.userId,{requestId:randomUUID(),before:0}),e=>e.status===409);
 assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM training_sessions').get().n,0);
});

test('first independent workout with no readiness report is persisted once and survives reload',async t=>{
 const f=platform(t);await f.connect();await f.training.savePlan(client.userId,defaultPrescription('bench'));
 const session=await f.training.start(client.userId,{requestId:randomUUID(),before:0});
 assert.equal(session.readiness,null);assert.equal(session.planMode,'self');
 assert.equal((await f.training.feed(client.userId)).active.id,session.id);
});

test('an open start dialog stops accepting starts when loading, signed out, empty or revoked',async()=>{
 const {workoutStartReady}=await import('../lib/workout-start-state.ts');
 assert.equal(workoutStartReady('ready',true,10),true);
 for(const state of [['loading',true,10],['error',true,10],['required',true,10],['ready',false,10],['ready',undefined,10],['ready',true,0]])assert.equal(workoutStartReady(...state),false);
});
