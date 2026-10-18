import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,doctor,coach,client,stranger,profile} from './platform-db.mjs';
import {CONSENT_REVISION} from '../lib/intake.ts';

// A second, independently enrolled coach/client pair must never inherit the
// first pair's care, clinical notes, workout history or private media.
test('independent coaches are isolated across rosters, profiles, notes and private videos',async t=>{
  const {care,media,sql,connect}=platform(t);
  const coachB={userId:'coach-b',email:'coach-b@example.test'};
  await connect(); // creates doctor + coach A links for client A
  await care.saveStaff(doctor,{email:coachB.email,name:'Second coach',role:'coach',active:true});
  await care.saveProfile(stranger,profile());
  for(const id of ['terms','privacy','health','team']){
    sql.prepare('INSERT INTO user_consents(id,user_id,consent_id,revision,accepted,created_at) VALUES(?,?,?,?,1,?)')
      .run('b-consent-'+id,stranger.userId,id,CONSENT_REVISION,'2026-01-01');
  }
  const inviteB=await care.createInvite(coachB,{emails:[coachB.email]});
  await care.acceptInvite(stranger,{code:inviteB.code,consent:true});

  assert.deepEqual((await care.clients(coach)).map(x=>x.userId),[client.userId]);
  assert.deepEqual((await care.clients(coachB)).map(x=>x.userId),[stranger.userId]);
  await assert.rejects(()=>care.bundle(coach,stranger.userId),e=>e.status===403);
  await assert.rejects(()=>care.bundle(coachB,client.userId),e=>e.status===403);
  await assert.rejects(()=>care.addNote(coach,stranger.userId,{id:randomUUID(),kind:'training',content:'cross-coach write',shared:true}),e=>e.status===403);
  await assert.rejects(()=>care.addNote(coachB,client.userId,{id:randomUUID(),kind:'training',content:'cross-coach write',shared:true}),e=>e.status===403);
  await assert.rejects(()=>care.assign(coachB,client.userId,{id:randomUUID(),title:'Cross-client program',items:[]}),e=>e.status===403);

  const video={id:randomUUID(),kind:'review',exerciseId:'goblet',caption:'Private set',mime:'video/mp4',bytes:64};
  await media.initialize(client,video);
  await media.ready(client,video.id);
  assert.equal((await media.readable(coach,video.id)).id,video.id);
  await assert.rejects(()=>media.readable(coachB,video.id),e=>e.status===403);
  await assert.rejects(()=>media.list(coachB,'review',client.userId),e=>e.status===403);
  await assert.rejects(()=>media.feedback(coachB,{id:randomUUID(),assetId:video.id,content:'Cross-coach feedback'}),e=>e.status===403);
});

test('a coach cannot view medical information or acquire staff-admin rights',async t=>{
  const {care,connect}=platform(t);
  await connect();
  await care.addNote(doctor,client.userId,{id:randomUUID(),kind:'medical',content:'confidential medical note',shared:false});
  const bundle=await care.bundle(coach,client.userId);
  assert.equal(bundle.canViewMedical,false);
  assert.equal(Object.hasOwn(bundle.profile,'medical'),false);
  assert.equal(bundle.notes.some(x=>x.kind==='medical'),false);
  await assert.rejects(()=>care.addNote(coach,client.userId,{id:randomUUID(),kind:'medical',content:'escalation',shared:true}),e=>e.status===403);
  await assert.rejects(()=>care.saveStaff(coach,{email:'new-clinician@example.test',name:'Unauthorized',role:'clinician',active:true}),e=>e.status===403);
  await assert.rejects(()=>care.saveStaff(client,{email:'new-coach@example.test',name:'Unauthorized',role:'coach',active:true}),e=>e.status===403);
});

test('revoking a link removes roster, medical-file and private-video access immediately',async t=>{
  const {care,media,connect}=platform(t);
  const linked=await connect();
  const video={id:randomUUID(),kind:'review',exerciseId:'goblet',caption:'Set',mime:'video/mp4',bytes:64};
  await media.initialize(client,video);
  await media.ready(client,video.id);
  assert.equal((await care.clients(coach)).length,1);
  const coachConnection=linked.connections.find(c=>c.role==='coach');
  assert.ok(coachConnection);
  await care.revoke(client,{id:coachConnection.id});
  assert.deepEqual(await care.clients(coach),[]);
  await assert.rejects(()=>care.bundle(coach,client.userId),e=>e.status===403);
  await assert.rejects(()=>media.readable(coach,video.id),e=>e.status===403);
  await assert.rejects(()=>media.feedback(coach,{id:randomUUID(),assetId:video.id,content:'Post-revocation'}),e=>e.status===403);
  assert.equal((await media.readable(client,video.id)).id,video.id);
});

test('medical grant and clinician role are both required; admin status alone cannot open a client file',async t=>{
 const f=platform(t);await f.connect();
 f.sql.prepare("UPDATE care_connections SET medical_access=1 WHERE client_id=? AND staff_email=?").run(client.userId,coach.email);
 assert.equal((await f.care.bundle(coach,client.userId)).canViewMedical,false);
 f.sql.prepare("UPDATE care_connections SET medical_access=0 WHERE client_id=? AND staff_email=?").run(client.userId,doctor.email);
 const restricted=await f.care.bundle(doctor,client.userId);
 assert.equal(restricted.canViewMedical,false);assert.equal(Object.hasOwn(restricted.profile,'medical'),false);
 const {careStore}=await import('../lib/care-store.ts');
 const admin={userId:'admin-only',email:'admin-only@example.test'};
 const adminCare=careStore(f.db,{adminEmails:doctor.email+','+admin.email,clinicianEmails:doctor.email});
 await assert.rejects(adminCare.bundle(admin,client.userId),e=>e.status===403);
 await assert.rejects(f.care.bundle(doctor,stranger.userId),e=>e.status===403);
});

test('two consented coaches can share one trainee and revoking one leaves the other and owner intact',async t=>{
 const f=platform(t);await f.connect();
 const other={userId:'coach-shared',email:'shared-coach@example.test'};
 await f.care.saveStaff(doctor,{...other,name:'Shared coach',role:'coach',active:true});
 const invitation=await f.care.createInvite(other,{emails:[other.email]});
 const bundle=await f.care.acceptInvite(client,{code:invitation.code,consent:true});
 assert.equal((await f.care.clients(other))[0].userId,client.userId);
 const video={id:randomUUID(),kind:'review',exerciseId:'goblet',caption:'Synthetic',mime:'video/mp4',bytes:64};
 await f.media.initialize(client,video);await f.media.ready(client,video.id);
 const secondConnection=f.sql.prepare('SELECT id FROM care_connections WHERE client_id=? AND staff_email=?').get(client.userId,other.email);
 assert.ok(bundle.connections.some(c=>c.id===secondConnection.id));
 await f.care.revoke(client,{id:secondConnection.id});
 await assert.rejects(f.media.readable(other,video.id),e=>e.status===403);
 assert.equal((await f.media.readable(coach,video.id)).id,video.id);
 assert.equal((await f.media.readable(client,video.id)).id,video.id);
 assert.equal((await f.care.bundle(client,client.userId)).profile.userId,client.userId);
});
