import test from 'node:test';
import assert from 'node:assert/strict';
import {platform,doctor,coach,client} from './platform-db.mjs';
const diet={userId:'diet',email:'diet@example.test'},coord={userId:'coord',email:'coord@example.test'};
async function fixture(t){const f=platform(t);await f.connect();for(const [u,role] of [[diet,'dietitian'],[coord,'coordinator']])await f.care.saveStaff(doctor,{...u,name:u.userId,role,active:true});const invite=await f.care.createInvite(doctor,{emails:[doctor.email,diet.email,coord.email]});await f.care.acceptInvite(client,{code:invite.code,consent:true});return f;}
function race(f,prefix,change){const prepare=f.db.prepare.bind(f.db);let fired=false;f.db.prepare=q=>{const s=prepare(q);if(!q.startsWith(prefix))return s;const wrap=b=>({...b,bind(...args){return wrap(b.bind(...args));},async all(){const r=await b.all();if(!fired){fired=true;change();}return r;}});return wrap(s);};}
const changes=[
 ['connection',(f,u)=>f.sql.prepare('UPDATE care_connections SET active=0 WHERE staff_email=?').run(u.email)],
 ['scope',(f,u)=>f.sql.prepare("UPDATE care_connections SET scope='coordinator' WHERE staff_email=?").run(u.email)],
 ['role',(f,u)=>f.sql.prepare("INSERT INTO care_staff(email,name,role,active,updated_at) VALUES(?,'Changed','coordinator',1,'2026-01-01') ON CONFLICT(email) DO UPDATE SET role='coordinator'").run(u.email)],
 ['disablement',(f,u)=>f.sql.prepare("INSERT INTO care_staff(email,name,role,active,updated_at) VALUES(?,'Disabled','clinician',0,'2026-01-01') ON CONFLICT(email) DO UPDATE SET active=0").run(u.email)],
];
for(const viewer of [doctor,coach,diet])for(const [name,change] of changes)test('standalone clients reject '+viewer.userId+' '+name+' after fetch',async t=>{const f=await fixture(t);race(f,'SELECT p.user_id AS userId',()=>change(f,viewer));await assert.rejects(()=>f.care.clients(viewer),e=>e.status===403);});
for(const [name,change] of changes)test('team overview rejects '+name+' during roster assembly',async t=>{const f=await fixture(t);race(f,'SELECT email,name,role,active FROM care_staff ORDER BY',()=>change(f,coach));await assert.rejects(()=>f.care.teamOverview(coach),e=>e.status===403);});
test('standalone roster rejects staff disablement after fetch',async t=>{const f=await fixture(t);race(f,'SELECT email,name,role,active FROM care_staff ORDER BY',()=>f.sql.prepare('UPDATE care_staff SET active=0 WHERE email=?').run(coach.email));await assert.rejects(()=>f.care.roster(coach),e=>e.status===403);});
test('coordinator overview retains no clinical clients and checks role after roster fetch',async t=>{const f=await fixture(t);assert.deepEqual((await f.care.teamOverview(coord)).clients,[]);race(f,'SELECT email,name,role,active FROM care_staff ORDER BY',()=>f.sql.prepare('UPDATE care_staff SET active=0 WHERE email=?').run(coord.email));await assert.rejects(()=>f.care.teamOverview(coord),e=>e.status===403);});
test('valid team overview retains client counts and management flag',async t=>{const f=await fixture(t);const b=await f.care.teamOverview(coach);assert.equal(b.clients[0].userId,client.userId);assert.equal(b.clients[0].pendingCheckins,0);assert.equal(b.clients[0].pendingVideos,0);assert.equal(b.canManage,false);assert.equal((await f.care.teamOverview(doctor)).canManage,true);});
