import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,coach,client,stranger} from './platform-db.mjs';
import {wellnessStore} from '../lib/wellness-store.ts';
import {todayIsrael} from '../lib/wellness.ts';
import {defaultPrescription} from '../lib/training.ts';

test('pre-workout readiness reuses the daily record and remains visible to the linked coach',async t=>{
 const f=platform(t);await f.connect();const w=wellnessStore(f.db),id=randomUUID();
 const p={id,kind:'readiness',day:todayIsrael(),version:0,data:{sleep:7.5,energy:6,stress:3,note:'דיווח בדיקה'}};
 const saved=await w.save(client,client.userId,p);let record=saved.records.find(r=>r.id===id);
 assert.equal(record.version,1);
 const loaded=await wellnessStore(f.db).bundle(client,client.userId);
 assert.equal(loaded.records.find(r=>r.kind==='readiness'&&r.day===loaded.today).id,id);
 const updated=await w.save(client,client.userId,{...p,version:record.version,data:{...p.data,energy:7}});
 record=updated.records.find(r=>r.id===id);assert.equal(record.version,2);
 assert.equal(updated.records.filter(r=>r.kind==='readiness'&&r.day===updated.today).length,1);
 assert.equal((await w.bundle(coach,client.userId)).records.find(r=>r.id===id).data.energy,7);
 await f.care.assign(coach,client.userId,{id:randomUUID(),title:'תוכנית בדיקה',items:[defaultPrescription('goblet')]});
 const s=await f.training.start(client.userId,{requestId:randomUUID(),before:2});
 assert.equal(s.before,2);assert.equal((await w.bundle(client,client.userId)).records.find(r=>r.id===id).version,2);
});
test('stale or invalid readiness cannot overwrite a newer report and reporting does not bypass training blocks',async t=>{
 const f=platform(t);await f.connect();const w=wellnessStore(f.db),p={id:randomUUID(),kind:'readiness',day:todayIsrael(),version:0,data:{sleep:0,energy:0,stress:10,note:''}};
 await w.save(client,client.userId,p);
 await assert.rejects(()=>w.save(client,client.userId,{...p,data:{...p.data,sleep:8}}),e=>e.status===409);
 await assert.rejects(()=>w.save(client,client.userId,{...p,version:1,data:{...p.data,sleep:25}}));
 await assert.rejects(()=>w.save(coach,client.userId,p),e=>e.status===403);
 await assert.rejects(()=>w.bundle(stranger,client.userId),e=>e.status===403);
 f.sql.prepare("INSERT INTO medical_reviews(id,client_id,flags_json,urgency,state,created_at,updated_at) VALUES(?,?,'[]','routine','pending','2026-01-01','2026-01-01')").run(randomUUID(),client.userId);
 await w.save(client,client.userId,{...p,version:1,data:{sleep:8,energy:9,stress:1,note:''}});
 await assert.rejects(()=>f.training.start(client.userId,{requestId:randomUUID(),before:0}),e=>e.status===403);
 const own=await f.care.bundle(client,client.userId);await f.care.revoke(client,{id:own.connections.find(c=>c.role==='coach').id});
 await assert.rejects(()=>w.bundle(coach,client.userId),e=>e.status===403);
});
