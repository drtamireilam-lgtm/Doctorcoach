import {verifySyntheticDietitian} from './platform-db.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {platform,doctor,coach,client} from './platform-db.mjs';
import {wellnessStore} from '../lib/wellness-store.ts';
const diet={userId:'diet',email:'diet@example.test'};
async function fixture(t){
 const f=platform(t);await f.connect();
 await f.care.saveStaff(doctor,{...diet,name:'Dietitian',role:'dietitian',active:true});
 verifySyntheticDietitian(f,diet.email);const invite=await f.care.createInvite(doctor,{emails:[doctor.email,diet.email]});await f.care.acceptInvite(client,{code:invite.code,consent:true});
 for(const [kind,data] of [['assessment',{shareTeam:true}],['daily',{weight:80,adherence:4}],['rehab',{pain:2}]])f.sql.prepare('INSERT INTO wellness_records(id,client_id,kind,slot,day,content_json,author_name,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(kind,client.userId,kind,'current','2026-10-09',JSON.stringify(data),'Test','2026-10-09');
 return {...f,wellness:wellnessStore(f.db,{clinicianEmails:doctor.email})};
}
function race(f,change){const prepare=f.db.prepare.bind(f.db);let fired=false;f.db.prepare=q=>{const s=prepare(q);if(!q.startsWith('SELECT COUNT(*) AS total FROM return_plan_revisions'))return s;return {bind(...args){const b=s.bind(...args);return {...b,async first(){const r=await b.first();if(!fired){fired=true;change();}return r;}};}};};}
for(const viewer of [doctor,coach,diet])for(const [name,change] of [
 ['connection revoked',(f,u)=>f.sql.prepare('UPDATE care_connections SET active=0 WHERE staff_email=?').run(u.email)],
 ['scope changed',(f,u)=>f.sql.prepare("UPDATE care_connections SET scope='coordinator' WHERE staff_email=?").run(u.email)],
 ['role changed',(f,u)=>f.sql.prepare("INSERT INTO care_staff(email,name,role,active,updated_at) VALUES(?,'Changed','coordinator',1,'2026-01-01') ON CONFLICT(email) DO UPDATE SET role='coordinator'").run(u.email)],
 ['staff disabled',(f,u)=>f.sql.prepare("INSERT INTO care_staff(email,name,role,active,updated_at) VALUES(?,'Disabled','clinician',0,'2026-01-01') ON CONFLICT(email) DO UPDATE SET active=0").run(u.email)],
])test('wellness bundle rejects '+viewer.userId+' '+name+' after history reads',async t=>{const f=await fixture(t);race(f,()=>change(f,viewer));await assert.rejects(()=>f.wellness.bundle(viewer,client.userId),e=>e.status===403);});
for(const [viewer,grant] of [[doctor,'medical_access'],[diet,'nutrition_access']])test('wellness bundle rejects '+grant+' loss',async t=>{const f=await fixture(t);race(f,()=>f.sql.prepare('UPDATE care_connections SET '+grant+'=0 WHERE staff_email=?').run(viewer.email));await assert.rejects(()=>f.wellness.bundle(viewer,client.userId),e=>e.status===403);});
for(const viewer of [doctor,coach])test('shared nutrition summary rejects sharing withdrawal for '+viewer.userId,async t=>{const f=await fixture(t);race(f,()=>f.sql.prepare("UPDATE wellness_records SET content_json='{"+'"shareTeam":false'+"}' WHERE kind='assessment'").run());await assert.rejects(()=>f.wellness.bundle(viewer,client.userId),e=>e.status===403);});
test('owner retains full history after connection and sharing withdrawal',async t=>{const f=await fixture(t);race(f,()=>f.sql.exec("UPDATE care_connections SET active=0; UPDATE wellness_records SET content_json='{}' WHERE kind='assessment'"));const b=await f.wellness.bundle(client,client.userId);assert.equal(b.self,true);assert.equal(b.summary.weight,80);assert.equal(b.records.length,3);});
test('valid projections preserve nutrition isolation and shared summary',async t=>{const f=await fixture(t);for(const viewer of [doctor,coach,diet]){const b=await f.wellness.bundle(viewer,client.userId);assert.equal(b.summary.weight,80);assert.equal(b.records.some(r=>r.kind==='assessment'),viewer===diet);assert.equal(b.canPlan,viewer===diet);assert.equal(b.canReturn,viewer===doctor);}f.sql.prepare("UPDATE wellness_records SET content_json='{}' WHERE kind='assessment'").run();assert.equal((await f.wellness.bundle(coach,client.userId)).summary,null);});
