import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,coach,client,stranger} from './platform-db.mjs';
import {defaultPrescription} from '../lib/training.ts';
import {revisionDraft} from '../lib/program-revisions.ts';
const plan=()=>({id:randomUUID(),title:'תוכנית מקור',items:[{...defaultPrescription('goblet'),dayId:'2',targetRpe:8,effortScale:'rir',approvedSubstitutions:['bench']}]});
async function fixture(t){const f=platform(t);await f.connect();const p=plan();await f.care.assign(coach,client.userId,p);return {...f,p};}
const revision=p=>({...revisionDraft(p),id:randomUUID(),title:'תוכנית מעודכנת'});

test('editor draft is detached and preserves workout days, effort and alternatives',()=>{
 const p=plan();const d=revision(p);assert.equal(d.revisionOf,p.id);assert.equal(d.items[0].dayId,'2');assert.equal(d.items[0].effortScale,'rir');
 d.items[0].sets=5;d.items[0].approvedSubstitutions.push('wall-slide');
 assert.equal(p.items[0].sets,2);assert.deepEqual(p.items[0].approvedSubstitutions,['bench']);
});
test('revision creates a separate active plan, preserves completed snapshots and is idempotent',async t=>{
 const f=await fixture(t);let s=await f.training.start(client.userId,{requestId:randomUUID(),before:0,dayId:'2'});
 s=await f.training.patch(client.userId,{id:s.id,version:s.version,action:'set',exerciseId:'goblet',setIndex:0,amount:10,weight:20,done:true,actualRpe:8});
 s=await f.training.patch(client.userId,{id:s.id,version:s.version,action:'finish',after:0});
 const source=f.sql.prepare('SELECT * FROM care_programs WHERE id=?').get(f.p.id);
 const p=revision(f.p);p.items[0].sets=4;await f.care.assign(coach,client.userId,p);
 await f.care.assign(coach,client.userId,p);
 const own=await f.care.bundle(client,client.userId),team=await f.care.bundle(coach,client.userId);
 assert.equal(own.activeProgramId,p.id);assert.equal(team.activeProgramId,p.id);
 assert.deepEqual(own.programs.map(p=>p.id),[p.id]);assert.equal(team.programs.length,2);
 assert.deepEqual(f.sql.prepare('SELECT * FROM care_programs WHERE id=?').get(f.p.id),source);
 assert.deepEqual(own.training.history[0].items,s.items);
 assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM audit_events WHERE action='coach_program_assigned'").get().n,2);
 const third=revision(p);await f.care.assign(coach,client.userId,third);await f.care.assign(coach,client.userId,p);
 assert.equal((await f.care.bundle(client,client.userId)).activeProgramId,third.id);
});
test('stale, forged, in-place and unauthorized revisions cannot publish',async t=>{
 const f=await fixture(t);const p=revision(f.p);await f.care.assign(coach,client.userId,p);
 const stale=revision(f.p);
 await assert.rejects(()=>f.care.assign(coach,client.userId,stale),e=>e.status===409);
 await assert.rejects(()=>f.care.assign(coach,client.userId,{...revision(p),revisionOf:randomUUID()}),e=>e.status===409);
 await assert.rejects(()=>f.care.assign(coach,client.userId,{...p,revisionOf:p.id}),e=>e.status===400);
 for(const user of [client,stranger])await assert.rejects(()=>f.care.assign(user,client.userId,revision(p)),e=>e.status===403);
 assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM care_programs').get().n,2);
});
test('revision guard is rechecked inside the batch and blocks a concurrent publication',async t=>{
 const f=await fixture(t);const next=plan();await f.care.assign(coach,client.userId,next);
 const batch=f.db.batch.bind(f.db);
 f.db.batch=async statements=>{f.sql.prepare('UPDATE training_access SET program_id=? WHERE user_id=?').run(f.p.id,client.userId);return batch(statements);};
 const p=revision(next);await assert.rejects(()=>f.care.assign(coach,client.userId,p),e=>e.status===409);
 assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM care_programs WHERE id=?').get(p.id).n,0);
 assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM audit_events WHERE id=?').get('program-assigned:'+p.id).n,0);
});
test('active workouts and revoked coaching still block revision publishing',async t=>{
 const f=await fixture(t);const p=revision(f.p);const s=await f.training.start(client.userId,{requestId:randomUUID(),before:0,dayId:'2'});
 await assert.rejects(()=>f.care.assign(coach,client.userId,p),e=>e.status===409);
 await f.training.patch(client.userId,{id:s.id,version:s.version,action:'cancel'});
 const own=await f.care.bundle(client,client.userId);await f.care.revoke(client,{id:own.connections.find(c=>c.role==='coach').id});
 await assert.rejects(()=>f.care.assign(coach,client.userId,p),e=>e.status===403);
});
