import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,coach,client} from './platform-db.mjs';
import {defaultPrescription} from '../lib/training.ts';

async function fixture(t,self=false){
 const f=platform(t);await f.connect();
 const item={...defaultPrescription('goblet'),sets:3,reps:5,targetRpe:8,weight:100,approvedSubstitutions:['bench']};
 if(self)await f.training.savePlan(client.userId,item);
 else await f.care.assign(coach,client.userId,{id:randomUUID(),title:'בדיקת עדכון סטים',items:[item]});
 const s=await f.training.start(client.userId,{requestId:randomUUID(),before:0});return {...f,s};
}
const patch=(s,action='set')=>({id:s.id,version:s.version,action,exerciseId:'goblet',setIndex:0,done:true,amount:5,weight:100,actualRpe:9,replacementId:'bench',confirmed:true,step:2.5,effortScale:'rir'});
function beforeUpdate(f,change){
 const prepare=f.db.prepare.bind(f.db);let fired=false;
 f.db.prepare=query=>{const statement=prepare(query);if(!query.startsWith('UPDATE training_sessions SET items_json'))return statement;
  return {bind(...values){const bound=statement.bind(...values);return {...bound,async first(){if(!fired){fired=true;await change();}return bound.first();}};}};
 };
}
const revoke=f=>f.sql.prepare('UPDATE care_connections SET active=0 WHERE client_id=? AND staff_email=?').run(client.userId,coach.email);
const block=f=>f.sql.prepare("INSERT INTO medical_reviews(id,client_id,flags_json,urgency,state,created_at,updated_at) VALUES(?,?,'[]','routine','pending','2026-01-01','2026-01-01')").run(randomUUID(),client.userId);
async function assertBlocked(f,p){
 const before=(await f.training.feed(client.userId)).active;
 await assert.rejects(()=>f.training.patch(client.userId,p),e=>e.status===403);
 assert.deepEqual((await f.training.feed(client.userId)).active,before);
}

test('revocation at write time blocks set, substitution, next-load and effort-scale changes',async t=>{
 for(const action of ['set','swap','nextLoad','effortScale']){
  const f=await fixture(t);if(action==='nextLoad')f.s=await f.training.patch(client.userId,patch(f.s));
  beforeUpdate(f,()=>revoke(f));await assertBlocked(f,patch(f.s,action));
 }
});
test('medical, intake, staff, program and mode changes during a set save leave its snapshot unchanged',async t=>{
 for(const change of [block,
  f=>f.sql.prepare('UPDATE user_intakes SET completed=0 WHERE user_id=?').run(client.userId),
  f=>f.sql.prepare("UPDATE care_staff SET role='coordinator' WHERE email=?").run(coach.email),
  f=>f.sql.prepare('UPDATE training_access SET program_id=? WHERE user_id=?').run(randomUUID(),client.userId),
  f=>f.sql.prepare("UPDATE training_access SET mode='self' WHERE user_id=?").run(client.userId)]){
  const f=await fixture(t);beforeUpdate(f,()=>change(f));await assertBlocked(f,patch(f.s));
 }
});
test('independent entitlement expiration and switching mode are enforced at update time',async t=>{
 for(const change of [f=>f.sql.prepare("UPDATE training_access SET self_until='2000-01-01T00:00:00.000Z' WHERE user_id=?").run(client.userId),f=>f.sql.prepare("UPDATE training_access SET mode='coached' WHERE user_id=?").run(client.userId)]){
  const f=await fixture(t,true);beforeUpdate(f,()=>change(f));await assertBlocked(f,patch(f.s));
 }
});
test('a competing set update is a version conflict, not an authorization failure',async t=>{
 const f=await fixture(t);let saved;
 beforeUpdate(f,async()=>{saved=await f.training.patch(client.userId,{...patch(f.s),setIndex:1,weight:80});});
 await assert.rejects(()=>f.training.patch(client.userId,patch(f.s)),e=>e.status===409&&e.session.version===saved.version);
 assert.deepEqual((await f.training.feed(client.userId)).active,saved);
 assert.equal(saved.items[0].results[0].done,false);assert.equal(saved.items[0].results[1].weight,80);
});
test('finish and cancel stay available after revocation and medical blocking without accepting extra sets',async t=>{
 for(const action of ['finish','cancel']){
  const f=await fixture(t);f.s=await f.training.patch(client.userId,patch(f.s));revoke(f);block(f);
  const closed=await f.training.patch(client.userId,{...patch(f.s,action),after:2,items:[{exerciseId:'forged'}]});
  assert.equal(closed.status,action==='finish'?'completed':'cancelled');assert.equal(closed.completedSets,1);
  assert.deepEqual(closed.items,f.s.items);
  assert.equal((await f.training.feed(client.userId)).active,null);
 }
});
