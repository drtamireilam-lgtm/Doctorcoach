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
