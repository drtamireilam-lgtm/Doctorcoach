import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,doctor,coach,client,stranger,profile} from './platform-db.mjs';
import {CONSENT_REVISION} from '../lib/intake.ts';
import {membershipStore} from '../lib/membership-store.ts';
import {trainingStore} from '../lib/training-store.ts';
import {defaultPrescription} from '../lib/training.ts';

test('personal training for two assigned coaches never grants access to each other’s trainees or medical data',async t=>{
 const f=platform(t);await f.connect();
 const second={userId:'synthetic-second-coach',email:'second-coach@example.test'};
 const config={adminEmails:doctor.email,clinicianEmails:doctor.email,ownerProgramEmails:doctor.email};
 await f.care.saveStaff(doctor,{...second,name:'Synthetic second coach',role:'coach',active:true});
 await f.care.saveProfile(stranger,profile());
 for(const u of [coach,second,stranger]){
  f.sql.prepare("INSERT INTO user_intakes(user_id,answers_json,completed,created_at,updated_at) VALUES(?,'{}',1,'2026-01-01','2026-01-01')").run(u.userId);
  for(const id of ['terms','privacy','health','team'])f.sql.prepare('INSERT INTO user_consents(id,user_id,consent_id,revision,accepted,created_at) VALUES(?,?,?,?,1,?)').run(randomUUID(),u.userId,id,CONSENT_REVISION,'2026-01-01');
 }
 const invitation=await f.care.createInvite(second,{emails:[second.email]});
 await f.care.acceptInvite(stranger,{code:invitation.code,consent:true});
 const training=trainingStore(f.db,config),membership=membershipStore(f.db,doctor.email,config);
 for(const u of [coach,second]){
  await membership.activateSelf(u);
  await training.savePlan(u.userId,defaultPrescription('bench'));
  assert.equal((await training.getPlan(u.userId)).length,1);
  await assert.rejects(()=>f.care.saveStaff(u,{email:'forged@example.test',name:'Forged admin',role:'clinician',active:true}),e=>e.status===403);
 }
 assert.deepEqual((await f.care.clients(coach)).map(x=>x.userId),[client.userId]);
 assert.deepEqual((await f.care.clients(second)).map(x=>x.userId),[stranger.userId]);
 for(const [u,own,other] of [[coach,client,stranger],[second,stranger,client]]){
  assert.equal((await f.care.bundle(u,own.userId)).canViewMedical,false);
  await assert.rejects(()=>f.care.bundle(u,other.userId),e=>e.status===403);
 }
 // A personal-only trainee can author a plan without becoming a coach.
 await training.savePlan(client.userId,defaultPrescription('bench'));
 assert.equal((await training.getPlan(client.userId)).length,1);
 await assert.rejects(()=>f.care.bundle(client,stranger.userId),e=>e.status===403);
 assert.equal((await membership.get(client)).staffPermanentAvailable,false);
});
