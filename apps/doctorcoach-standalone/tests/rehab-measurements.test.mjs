import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,doctor,coach,client,stranger} from './platform-db.mjs';
import {wellnessStore} from '../lib/wellness-store.ts';
import {todayIsrael} from '../lib/wellness.ts';
import {CONSENT_REVISION} from '../lib/intake.ts';
import {rehabMeasurementKey,filterRehabMeasurements} from '../lib/rehab-measurements.ts';
const episode=()=>({id:randomUUID(),kind:'episode',version:0,day:todayIsrael(),data:{label:'פציעה מתועדת',region:'ברך',side:'ימין',status:'active'}});
const measurement=(episodeId)=>({id:randomUUID(),kind:'rehab',version:0,day:todayIsrael(),data:{region:'ברך',side:'ימין',motion:'כפיפת ברך',pain:2,rom:90,functionScore:6,response:'לפני אימון',note:'',...(episodeId?{episodeId}:{})}});
async function fixture(t){const f=platform(t);await f.connect();return {...f,w:wellnessStore(f.db,{adminEmails:doctor.email,clinicianEmails:doctor.email})};}
test('measurement links require own active episode, matching region and side, and personal reporter',async t=>{
 const f=await fixture(t),e=episode();await f.w.save(doctor,client.userId,e);
 for(const u of [doctor,coach,stranger])await assert.rejects(()=>f.w.save(u,client.userId,measurement(e.id)),err=>err.status===403);
 for(const id of ['terms','privacy','health','team'])f.sql.prepare('INSERT INTO user_consents(id,user_id,consent_id,revision,accepted,created_at) VALUES(?,?,?,?,1,?)').run(randomUUID(),stranger.userId,id,CONSENT_REVISION,new Date().toISOString());
 await assert.rejects(()=>f.w.save(stranger,stranger.userId,measurement(e.id)),err=>err.status===409);
 for(const patch of [{episodeId:randomUUID()},{region:'כתף'},{side:'שמאל'}]){
 const p=measurement(e.id);await assert.rejects(()=>f.w.save(client,client.userId,{...p,data:{...p.data,...patch}}),err=>err.status===409);
 }
 const p=measurement(e.id),b=await f.w.save(client,client.userId,p);assert.equal(b.records.find(r=>r.id===p.id).data.episodeId,e.id);
});
test('legacy measurements remain unassigned until explicit linking; older clients preserve linked data',async t=>{
 const f=await fixture(t),e=episode(),p=measurement();await f.w.save(doctor,client.userId,e);
 let b=await f.w.save(client,client.userId,p);assert.equal(b.records.find(r=>r.id===p.id).data.episodeId,undefined);
 b=await f.w.save(client,client.userId,{...p,version:1,data:{...p.data,episodeId:e.id}});
 b=await f.w.save(client,client.userId,{...p,version:2,data:{...p.data,pain:3}});
 assert.equal(b.records.find(r=>r.id===p.id).data.episodeId,e.id);
 for(const episodeId of ['',randomUUID()])await assert.rejects(()=>f.w.save(client,client.userId,{...p,version:3,data:{...p.data,episodeId}}),err=>err.status===409);
 await assert.rejects(()=>f.w.save(doctor,client.userId,{...e,version:1,data:{...e.data,side:'שמאל'}}),err=>err.status===409);
});
test('closed episodes retain measurements but prevent writes until reopened',async t=>{
 const f=await fixture(t),e=episode(),p=measurement(e.id);await f.w.save(doctor,client.userId,e);await f.w.save(client,client.userId,p);
 await f.w.save(doctor,client.userId,{...e,version:1,data:{...e.data,status:'closed'}});
 for(const entry of [measurement(e.id),{...p,version:1,data:{...p.data,pain:4}}])await assert.rejects(()=>f.w.save(client,client.userId,entry),err=>err.status===409);
 assert.equal((await f.w.bundle(client,client.userId)).records.find(r=>r.id===p.id).data.pain,2);
 await f.w.save(doctor,client.userId,{...e,version:2});await f.w.save(client,client.userId,{...p,version:1,data:{...p.data,pain:4}});
});
test('episode closure or anatomy changes during save cannot insert mismatched measurement',async t=>{
 for(const change of [{status:'closed'},{side:'שמאל'}]){
 const f=await fixture(t),e=episode(),p=measurement(e.id);await f.w.save(doctor,client.userId,e);
 const prepare=f.db.prepare.bind(f.db);let fired=false;
 f.db.prepare=query=>{const stmt=prepare(query);if(!query.startsWith('INSERT INTO wellness_records'))return stmt;return {bind(...values){const bound=stmt.bind(...values);return {...bound,async first(){if(!fired){fired=true;f.sql.prepare('UPDATE wellness_records SET content_json=? WHERE id=?').run(JSON.stringify({...e.data,...change}),e.id);}return bound.first();}};}};};
 await assert.rejects(()=>f.w.save(client,client.userId,p),err=>err.status===409);
 assert.equal(f.sql.prepare('SELECT id FROM wellness_records WHERE id=?').get(p.id),undefined);
 }
});
test('a measurement inserted during clinician anatomy update prevents changing the linked region',async t=>{
 const f=await fixture(t),e=episode(),p=measurement(e.id);await f.w.save(doctor,client.userId,e);
 const prepare=f.db.prepare.bind(f.db);let fired=false;
 f.db.prepare=query=>{const stmt=prepare(query);if(!query.startsWith('UPDATE wellness_records'))return stmt;return {bind(...values){const bound=stmt.bind(...values);return {...bound,async first(){if(!fired){fired=true;f.sql.prepare("INSERT INTO wellness_records(id,client_id,kind,slot,day,content_json,author_name,updated_at) VALUES(?,?,'rehab',?,?,?,?,?)").run(p.id,client.userId,p.id,p.day,JSON.stringify(p.data),'דיווח אישי',new Date().toISOString());}return bound.first();}};}};};
 await assert.rejects(()=>f.w.save(doctor,client.userId,{...e,version:1,data:{...e.data,side:'שמאל'}}),err=>err.status===409);
 assert.equal(JSON.parse(f.sql.prepare('SELECT content_json FROM wellness_records WHERE id=?').get(e.id).content_json).side,'ימין');
});
test('same-region injury episodes and legacy measurements never mix in comparison groups',()=>{
 const a=measurement(randomUUID()),b=measurement(randomUUID()),old=measurement();
 const rows=[a,b,old].map(r=>({...r,slot:r.id,authorName:'',updatedAt:'',version:1}));
 assert.equal(new Set(rows.map(rehabMeasurementKey)).size,3);
 assert.deepEqual(filterRehabMeasurements(rows,'ברך',a.data.episodeId).map(r=>r.id),[a.id]);
 assert.deepEqual(filterRehabMeasurements(rows,'ברך','unassigned').map(r=>r.id),[old.id]);
 assert.equal(filterRehabMeasurements(rows,'כתף').length,0);
 assert.equal(filterRehabMeasurements(rows,'ברך').length,3);
});
