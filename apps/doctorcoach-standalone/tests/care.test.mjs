import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,doctor,coach,client,stranger,profile} from './platform-db.mjs';
import {defaultPrescription} from '../lib/training.ts';
import {currentWeek} from '../lib/care.ts';

test('intake uses optimistic concurrency and a different account cannot access the profile',async t=>{
  const {care}=platform(t);
  const saved=await care.saveProfile(client,profile());
  assert.equal(saved.profile.version,1);
  await assert.rejects(()=>care.saveProfile(client,profile()),e=>e.status===409);
  await care.saveProfile(client,{...profile(),version:1,goal:'מטרה מעודכנת'});
  assert.equal((await care.bundle(client,client.userId)).profile.goal,'מטרה מעודכנת');
  await assert.rejects(()=>care.bundle(stranger,client.userId),e=>e.status===403);
  await assert.rejects(()=>care.bundle(doctor,client.userId),e=>e.status===403);
  assert.equal((await care.bundle(stranger,stranger.userId)).profile,null);
});

test('medical records are separated from coaching and revoking a connection removes access',async t=>{
  const {care,connect}=platform(t);const own=await connect();
  await care.addNote(doctor,client.userId,{id:randomUUID(),kind:'medical',content:'רפואי משותף',shared:true});
  await care.addNote(doctor,client.userId,{id:randomUUID(),kind:'medical',content:'רפואי פנימי',shared:false});
  await care.addNote(coach,client.userId,{id:randomUUID(),kind:'training',content:'הערת אימון',shared:true});
  const training=await care.bundle(coach,client.userId);
  assert.equal(training.canViewMedical,false);assert.equal('medical' in training.profile,false);
  assert.deepEqual(training.notes.map(n=>n.kind),['training']);
  assert.equal((await care.bundle(doctor,client.userId)).notes.length,3);
  assert.equal((await care.bundle(client,client.userId)).notes.length,2);
  await assert.rejects(()=>care.addNote(coach,client.userId,{id:randomUUID(),kind:'medical',content:'לא מאושר',shared:true}),e=>e.status===403);
  await care.revoke(client,{id:own.connections.find(c=>c.role==='coach').id});
  await assert.rejects(()=>care.bundle(coach,client.userId),e=>e.status===403);
  assert.equal((await care.clients(coach)).length,0);
  assert.equal((await care.clients(doctor)).length,1);
});

test('invitation requires explicit consent, is single recipient, expires, and never escalates prior medical consent',async t=>{
  const {care,sql}=platform(t);
  await care.saveStaff(doctor,{...coach,name:'מאמן לבדיקה',role:'coach',active:true});
  await care.saveProfile(client,profile());await care.saveProfile(stranger,profile());
  for(const id of ['terms','privacy','health','team'])sql.prepare("INSERT INTO user_consents(id,user_id,consent_id,revision,accepted,created_at) VALUES(?,'client',?,'2026-09-28.1',1,'2026-01-01')").run('invite-'+id,id);
  const invite=await care.createInvite(coach,{emails:[coach.email]});
  await assert.rejects(()=>care.acceptInvite(client,{code:invite.code,consent:false}));
  await care.saveStaff(doctor,{...coach,name:'איש צוות לבדיקה',role:'clinician',active:true});
  assert.equal((await care.previewInvite(client,{code:invite.code})).staff[0].role,'coach');
  await care.acceptInvite(client,{code:invite.code,consent:true});
  assert.equal((await care.bundle(coach,client.userId)).canViewMedical,false);
  await assert.rejects(()=>care.acceptInvite(stranger,{code:invite.code,consent:true}),e=>e.status===404);
  const fresh=await care.createInvite(coach,{emails:[coach.email]});
  await care.acceptInvite(client,{code:fresh.code,consent:true});
  assert.equal((await care.bundle(coach,client.userId)).canViewMedical,true);
  sql.exec("UPDATE care_invites SET expires_at='2000-01-01T00:00:00.000Z'");
  await assert.rejects(()=>care.previewInvite(client,{code:fresh.code}),e=>e.status===404);
});

test('only the configured manager can grant staff roles, and disabling staff cuts existing access',async t=>{
  const {care,connect}=platform(t);await connect();
  await assert.rejects(()=>care.saveStaff(coach,{...stranger,name:'משתמש בדיקה',role:'clinician',active:true}),e=>e.status===403);
  await assert.rejects(()=>care.createInvite(stranger,{emails:[doctor.email]}),e=>e.status===403);
  await care.saveStaff(doctor,{...coach,name:'מאמן לבדיקה',role:'coach',active:false});
  await assert.rejects(()=>care.bundle(coach,client.userId),e=>e.status===403);
});

test('applying an assigned program is account scoped, atomic, idempotent, and preserves a running workout',async t=>{
  const {care,training,connect}=platform(t);await connect();
  await training.savePlan(client.userId,defaultPrescription('goblet'));
  const active=await training.start(client.userId,{requestId:randomUUID(),before:1});
  const id=randomUUID();const assigned={id,title:'תוכנית בדיקה',items:[{...defaultPrescription('walk'),reps:20}]};
  await assert.rejects(()=>care.assign(coach,client.userId,assigned),e=>e.status===409);
  await assert.rejects(()=>care.applyProgram(stranger,{id}),e=>e.status===403);
  await assert.rejects(()=>care.applyProgram(client,{id}),e=>e.status===403);
  await training.patch(client.userId,{id:active.id,version:active.version,action:'cancel'});
  await care.assign(coach,client.userId,assigned);
  assert.deepEqual((await training.getPlan(client.userId)).map(i=>i.exerciseId),['walk']);
  await assert.rejects(()=>training.savePlan(client.userId,{...defaultPrescription('walk'),reps:25}),e=>e.status===403);
  await care.assign(coach,client.userId,assigned);
  assert.equal((await training.getPlan(client.userId))[0].reps,20);
  const feed=await training.feed(client.userId);assert.equal(feed.active,null);
  assert.equal((await care.bundle(client,client.userId)).programs.length,1);
});

test('weekly reports are deduplicated and an answered report cannot be silently overwritten',async t=>{
  const {care,connect}=platform(t);await connect();
  const report={id:randomUUID(),sessions:2,pain:3,functionScore:7,effort:5,content:'דיווח בדיקה'};
  await care.checkin(client,report);await care.checkin(client,report);
  await assert.rejects(()=>care.checkin(client,{...report,id:randomUUID()}),e=>e.status===409);
  assert.equal((await care.clients(coach))[0].pendingCheckins,1);
  await assert.rejects(()=>care.reviewCheckin(stranger,client.userId,{id:report.id,response:'משוב בדיקה'}),e=>e.status===403);
  await care.reviewCheckin(coach,client.userId,{id:report.id,response:'משוב בדיקה'});
  await assert.rejects(()=>care.reviewCheckin(doctor,client.userId,{id:report.id,response:'משוב נוסף'}),e=>e.status===409);
  assert.equal((await care.clients(coach))[0].pendingCheckins,0);
  assert.equal((await care.bundle(client,client.userId)).checkins[0].response,'משוב בדיקה');
  assert.equal(currentWeek(new Date('2026-09-26T22:00:00Z')),'2026-09-27');
});
