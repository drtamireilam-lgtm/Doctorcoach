import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,doctor,coach,client,stranger} from './platform-db.mjs';
import {wellnessStore} from '../lib/wellness-store.ts';
import {progressTimeline} from '../lib/progress-timeline.ts';
import {todayIsrael} from '../lib/wellness.ts';
const dietitian={userId:'dietitian',email:'dietitian@example.test'};
const payload=(kind,data)=>({id:randomUUID(),kind,data,day:todayIsrael(),version:0});
async function fixture(t){
 const f=platform(t);await f.connect();
 await f.care.saveStaff(doctor,{...dietitian,name:'דיאטן בדיקה',role:'dietitian',active:true});
 const invite=await f.care.createInvite(doctor,{emails:[doctor.email,dietitian.email]});await f.care.acceptInvite(client,{code:invite.code,consent:true});
 const wellness=wellnessStore(f.db,{adminEmails:doctor.email,clinicianEmails:doctor.email});
 await wellness.save(client,client.userId,payload('readiness',{sleep:7,energy:5,stress:3,note:'private readiness note'}));
 await wellness.save(client,client.userId,payload('daily',{weight:80,adherence:8,waist:null,hip:null,dayType:'training',note:'private nutrition note'}));
 return {...f,wellness};
}
test('staff timeline uses authorized records, not shared nutrition summary as full permission',async t=>{
 const f=await fixture(t);
 for(const viewer of [coach,doctor]){
  const care=await f.care.bundle(viewer,client.userId),bundle=await f.wellness.bundle(viewer,client.userId);
  const events=progressTimeline(care.training,bundle.records);
  assert.deepEqual(events.map(e=>e.category),['readiness']);assert.ok(!JSON.stringify(events).includes('private'));
 }
 const assessment=payload('assessment',{goal:'בדיקת שיתוף',routine:'',preferences:'',allergies:'',history:'',shareTeam:true});await f.wellness.save(client,client.userId,assessment);
 const shared=await f.wellness.bundle(coach,client.userId);assert.equal(shared.summary.weight,80);
 assert.ok(!progressTimeline((await f.care.bundle(coach,client.userId)).training,shared.records).some(e=>e.category==='nutrition'));
 const allowed=await f.wellness.bundle(dietitian,client.userId);
 assert.ok(progressTimeline((await f.care.bundle(dietitian,client.userId)).training,allowed.records).some(e=>e.category==='nutrition'));
});
test('unrelated or revoked staff cannot fetch either source of the timeline',async t=>{
 const f=await fixture(t);
 for(const store of [f.care,f.wellness])await assert.rejects(()=>store.bundle(stranger,client.userId),e=>e.status===403);
 const connection=(await f.care.bundle(client,client.userId)).connections.find(c=>c.role==='coach');await f.care.revoke(client,{id:connection.id});
 for(const store of [f.care,f.wellness])await assert.rejects(()=>store.bundle(coach,client.userId),e=>e.status===403);
});
