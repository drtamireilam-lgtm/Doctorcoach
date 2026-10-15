import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,coach,client} from './platform-db.mjs';
import {defaultPrescription} from '../lib/training.ts';
import {coachDraftStore} from '../lib/coach-drafts.ts';
import {prepareProgramReview} from '../lib/program-review.ts';

const plan=(exercise='goblet')=>({id:randomUUID(),title:'תוכנית בדיקה',items:[{...defaultPrescription(exercise),dayId:'1',targetRpe:8}]});
const start=f=>f.training.start(client.userId,{requestId:randomUUID(),before:0,dayId:'1'});
async function fixture(t){const f=platform(t);await f.connect();const p=plan();await f.care.assign(coach,client.userId,p);return {...f,p};}
function beforeInsert(f,change){
 const prepare=f.db.prepare.bind(f.db);let fired=false;
 f.db.prepare=query=>{
  const statement=prepare(query);
  if(!query.startsWith('INSERT INTO training_sessions'))return statement;
  return {bind(...values){const bound=statement.bind(...values);return {...bound,async run(){if(!fired){fired=true;await change();}return bound.run();}};}};
 };
}
async function rejectsWithoutSession(f){await assert.rejects(()=>start(f),e=>e.status===409);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM training_sessions').get().n,0);}

test('coach publication during workout start cannot mix assignment ID and exercise snapshot',async t=>{
 const f=await fixture(t),replacement=plan('walk');beforeInsert(f,()=>f.care.assign(coach,client.userId,replacement));
 await rejectsWithoutSession(f);
 const s=await start(f);assert.equal(s.programId,replacement.id);assert.equal(s.items[0].exerciseId,'walk');
});
test('revoked consent or disabled coach during start prevents the insert',async t=>{
 for(const change of [f=>f.sql.prepare('UPDATE care_connections SET active=0 WHERE client_id=? AND staff_email=?').run(client.userId,coach.email),f=>f.sql.prepare('UPDATE care_staff SET active=0 WHERE email=?').run(coach.email)]){
  const f=await fixture(t);beforeInsert(f,()=>change(f));await rejectsWithoutSession(f);
 }
});
test('medical review or incomplete intake introduced during start prevents the insert',async t=>{
 for(const change of [f=>f.sql.prepare("INSERT INTO medical_reviews(id,client_id,flags_json,urgency,state,created_at,updated_at) VALUES(?,?,'[]','routine','pending','2026-01-01','2026-01-01')").run(randomUUID(),client.userId),f=>f.sql.prepare('UPDATE user_intakes SET completed=0 WHERE user_id=?').run(client.userId)]){
  const f=await fixture(t);beforeInsert(f,()=>change(f));await rejectsWithoutSession(f);
 }
});
test('independent membership expiration or switching to coaching during start cannot bypass entitlement',async t=>{
 for(const change of [f=>f.sql.prepare("UPDATE training_access SET self_until='2000-01-01T00:00:00.000Z' WHERE user_id=?").run(client.userId),f=>f.care.assign(coach,client.userId,plan('walk'))]){
  const f=platform(t);await f.connect();await f.training.savePlan(client.userId,defaultPrescription('goblet'));
  beforeInsert(f,()=>change(f));await rejectsWithoutSession(f);
 }
});
test('simultaneous starts still return the one persisted active workout',async t=>{
 const f=await fixture(t);const [a,b]=await Promise.all([start(f),start(f)]);
 assert.equal(a.id,b.id);assert.equal(a.programId,f.p.id);assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM training_sessions WHERE status='active'").get().n,1);
});
test('integrated saved draft, review, assigned day, substitution, set and completion preserve the approved plan',async t=>{
 const f=platform(t);await f.connect();const drafts=coachDraftStore(f.db,f.care);
 const draft={requestId:randomUUID(),title:'מסלול בדיקה מלא',revisionOf:null,items:[{...defaultPrescription('walk'),dayId:'1'},{...defaultPrescription('goblet'),dayId:'2',sets:1,targetRpe:8,effortScale:'rir',approvedSubstitutions:['bench']}]};
 await drafts.save(coach,client.userId,{action:'save',version:0,...draft});
 const restored=await coachDraftStore(f.db,f.care).get(coach,client.userId),review=prepareProgramReview(restored.draft.title,restored.draft.items);
 await f.care.assign(coach,client.userId,{id:draft.requestId,...review,draftVersion:restored.version});
 assert.equal((await drafts.get(coach,client.userId)).draft,null);
 let s=await f.training.start(client.userId,{requestId:randomUUID(),before:0,dayId:'2'});
 assert.equal(s.items.length,1);assert.equal(s.items[0].dayId,'2');
 s=await f.training.patch(client.userId,{id:s.id,version:s.version,action:'swap',exerciseId:'goblet',replacementId:'bench',confirmed:true});
 s=await f.training.patch(client.userId,{id:s.id,version:s.version,action:'set',exerciseId:'bench',setIndex:0,done:true,amount:10,weight:20,actualRpe:8});
 s=await f.training.patch(client.userId,{id:s.id,version:s.version,action:'finish',after:0});
 assert.deepEqual((await f.training.feed(client.userId)).history[0],s);
 assert.deepEqual((await f.training.getPlan(client.userId)),review.items);
 assert.equal(s.items[0].effortScale,'rir');
});
