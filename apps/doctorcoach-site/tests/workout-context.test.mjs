import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,client,coach,stranger} from './platform-db.mjs';
import {wellnessStore} from '../lib/wellness-store.ts';
import {todayIsrael} from '../lib/wellness.ts';
import {defaultPrescription,nextLoad} from '../lib/training.ts';
import {nextSetLoad} from '../lib/set-load.ts';
import {duringPain,followupDay} from '../lib/workout-context.ts';
import {CONSENT_REVISION} from '../lib/intake.ts';
async function setup(t){const f=platform(t);await f.connect();await f.training.savePlan(client.userId,{...defaultPrescription('goblet'),sets:2,reps:5,weight:100,targetRpe:8});return f;}
const start=f=>f.training.start(client.userId,{requestId:randomUUID(),before:0});
const set=(f,s,patch={})=>f.training.patch(client.userId,{action:'set',id:s.id,version:s.version,exerciseId:'goblet',setIndex:0,done:true,amount:5,weight:100,actualRpe:8,...patch});
function consent(f){for(const id of ['terms','privacy','health','team'])f.sql.prepare('INSERT INTO user_consents(id,user_id,consent_id,revision,accepted,created_at) VALUES(?,?,?,?,1,?)').run(randomUUID(),client.userId,id,CONSENT_REVISION,new Date().toISOString());}

test('readiness is a server-owned start snapshot that survives later edits and retry',async t=>{
 const f=await setup(t),w=wellnessStore(f.db),p={id:randomUUID(),kind:'readiness',day:todayIsrael(),version:0,data:{sleep:7,energy:6,stress:3,note:'first'}};
 await w.save(client,client.userId,p);
 const s=await start(f);assert.equal(s.readiness.data.sleep,7);assert.equal(s.readiness.version,1);
 await w.save(client,client.userId,{...p,version:1,data:{...p.data,sleep:4,note:'later'}});
 const again=await f.training.start(client.userId,{requestId:s.id,before:0,readiness:{data:{sleep:99}}});
 assert.deepEqual(again.readiness,s.readiness);
 assert.deepEqual((await f.care.bundle(coach,client.userId)).training.active.readiness,s.readiness);
 await assert.rejects(()=>f.care.bundle(stranger,client.userId),e=>e.status===403);
 f.sql.prepare('UPDATE care_connections SET active=0 WHERE client_id=? AND staff_email=?').run(client.userId,coach.email);
 await assert.rejects(()=>f.care.bundle(coach,client.userId),e=>e.status===403);
});
test('missing or other-day readiness is not invented or copied into the workout',async t=>{
 const f=await setup(t);await wellnessStore(f.db).save(client,client.userId,{id:randomUUID(),kind:'readiness',day:'2026-01-01',version:0,data:{sleep:8,energy:8,stress:0,note:''}});
 const s=await start(f);assert.equal(s.readiness,null);assert.equal(s.followup,null);assert.equal(duringPain(s.items),null);
});
test('during-set pain persists, validates, and blocks load suggestions without losing effort data',async t=>{
 const f=await setup(t);let s=await start(f);s=await set(f,s,{painDuring:4});
 assert.equal((await f.training.feed(client.userId)).active.items[0].results[0].painDuring,4);
 assert.equal(nextSetLoad(s.items[0],0,s).weight,null);
 await assert.rejects(()=>f.training.patch(client.userId,{action:'nextLoad',id:s.id,version:s.version,exerciseId:'goblet',setIndex:0,step:2.5}));
 await assert.rejects(()=>set(f,s,{painDuring:11}));await assert.rejects(()=>set(f,s,{painDuring:1.5}));
 s=await set(f,s,{actualRpe:9});assert.equal(s.items[0].results[0].painDuring,4);
 s=await set(f,s,{painDuring:0});assert.equal(duringPain(s.items),0);assert.notEqual(nextSetLoad(s.items[0],0,s).weight,null);
});
test('a pain report in another exercise suppresses the session load suggestion',()=>{
 const item={exerciseId:'a',unit:'reps',sets:2,reps:5,targetRpe:8,results:[{done:true,weight:100,amount:5,actualRpe:7},{done:false,weight:100,amount:5}]};
 const s={before:0,after:null,items:[item,{...item,exerciseId:'b',results:[{done:false,weight:0,amount:5,painDuring:3}]}]};
 assert.equal(nextSetLoad(item,0,s).weight,null);
});
test('next-day report enforces timing, consent, owner and version without changing saved sets',async t=>{
 const f=await setup(t);consent(f);let s=await set(f,await start(f));s=await f.training.patch(client.userId,{action:'finish',id:s.id,version:s.version,after:0});
 const request={action:'followup',id:s.id,version:s.version,pain:3};
 await assert.rejects(()=>f.training.patch(client.userId,request),e=>e.status===409);
 f.sql.prepare('UPDATE training_sessions SET finished_at=? WHERE id=?').run('2026-01-01T21:00:00Z',s.id);
 await assert.rejects(()=>f.training.patch(stranger.userId,request),e=>e.status===404);
 const saved=await f.training.patch(client.userId,request);
 assert.equal(saved.followup.day,'2026-01-02');assert.equal(saved.followup.pain,3);assert.deepEqual(saved.items,s.items);assert.equal(saved.status,'completed');
 assert.equal(nextLoad(saved.items[0],saved).weight,null);
 await assert.rejects(()=>f.training.patch(client.userId,{...request,pain:4}),e=>e.status===409);
 await assert.rejects(()=>f.training.patch(client.userId,{...request,version:saved.version,pain:-1}));
 assert.equal((await f.care.bundle(coach,client.userId)).training.history[0].followup.pain,3);
 f.sql.prepare("DELETE FROM user_consents WHERE user_id=? AND consent_id='health'").run(client.userId);
 await assert.rejects(()=>f.training.patch(client.userId,{...request,version:saved.version,pain:4}),e=>e.status===403);
});
test('next-day timing uses Israel calendar days including year rollover',()=>{
 assert.equal(followupDay('2026-12-31T23:30:00Z'),'2027-01-02');
 assert.equal(followupDay('2026-10-08T22:30:00Z'),'2026-10-10');
});
