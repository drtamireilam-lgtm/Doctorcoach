import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { platform, coach, client, stranger } from './platform-db.mjs';
import { defaultPrescription } from '../lib/training.ts';
import { trainingAccess } from '../lib/training-access.ts';

const plan = exercise => ({id:randomUUID(),title:'תוכנית בדיקה',items:[{...defaultPrescription(exercise),targetRpe:8}]});

test('coach publication is immediately active; old retries cannot switch the plan back',async t=>{
  const f=platform(t); await f.connect();
  const first=plan('goblet'),second=plan('walk');
  await f.care.assign(coach,client.userId,first);
  assert.equal((await trainingAccess(f.db,client.userId)).programId,first.id);
  await f.care.assign(coach,client.userId,second);
  await f.care.assign(coach,client.userId,first);
  assert.equal((await trainingAccess(f.db,client.userId)).programId,second.id);
  assert.deepEqual((await f.care.bundle(client,client.userId)).programs.map(p=>p.id),[second.id]);
  await assert.rejects(()=>f.care.applyProgram(client,{id:first.id}),e=>e.status===403);
  await assert.rejects(()=>f.care.assign(client,client.userId,plan('goblet')),e=>e.status===403);
  await assert.rejects(()=>f.care.assign(stranger,client.userId,plan('goblet')),e=>e.status===403);
  assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM audit_events WHERE action='coach_program_assigned'").get().n,2);
  await assert.rejects(()=>f.care.assign(coach,client.userId,{...second,title:'ניסיון דריסה'}),e=>e.status===409);
});

test('revoked coaching and absent pointers never fall back to a previous plan',async t=>{
  const f=platform(t); await f.connect();
  const p=plan('goblet'); await f.care.assign(coach,client.userId,p);
  f.sql.prepare('UPDATE training_access SET program_id=NULL WHERE user_id=?').run(client.userId);
  assert.equal((await trainingAccess(f.db,client.userId)).canStart,false);
  assert.deepEqual(await f.training.getPlan(client.userId),[]);
  f.sql.prepare('UPDATE training_access SET program_id=? WHERE user_id=?').run(p.id,client.userId);
  const own=await f.care.bundle(client,client.userId);
  await f.care.revoke(client,{id:own.connections.find(c=>c.role==='coach').id});
  assert.equal((await trainingAccess(f.db,client.userId)).canStart,false);
  assert.deepEqual((await f.care.bundle(client,client.userId)).programs,[]);
  await assert.rejects(()=>f.care.assign(coach,client.userId,plan('walk')),e=>e.status===403);
});

test('assignment and audit roll back together on a database failure',async t=>{
  const f=platform(t); await f.connect();
  const p=plan('goblet');
  f.sql.exec("CREATE TRIGGER fail_test_audit BEFORE INSERT ON audit_events BEGIN SELECT RAISE(ABORT,'synthetic failure'); END");
  await assert.rejects(()=>f.care.assign(coach,client.userId,p),/synthetic failure/);
  assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM care_programs WHERE id=?').get(p.id).n,0);
  assert.equal((await trainingAccess(f.db,client.userId)).mode,'self');
});

test('revocation between authorization and publication cannot produce an active assignment',async t=>{
  const f=platform(t); await f.connect();
  const batch=f.db.batch.bind(f.db);
  f.db.batch=async statements=>{
    f.sql.prepare('UPDATE care_connections SET active=0 WHERE client_id=? AND staff_email=?').run(client.userId,coach.email);
    return batch(statements);
  };
  await assert.rejects(()=>f.care.assign(coach,client.userId,plan('goblet')),e=>e.status===409);
  assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM care_programs').get().n,0);
  assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM audit_events WHERE action='coach_program_assigned'").get().n,0);
});
