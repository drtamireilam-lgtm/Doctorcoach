import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,doctor,client,stranger} from './platform-db.mjs';
import {defaultServices} from '../lib/services.ts';
const coord={userId:'coord',email:'coord@example.test'};
async function fixture(t){const f=platform(t);await f.connect();await f.care.saveStaff(doctor,{...coord,name:'Coordinator',role:'coordinator',active:true});const invite=await f.care.createInvite(doctor,{emails:[doctor.email,coord.email]});await f.care.acceptInvite(client,{code:invite.code,consent:true});const service=defaultServices[0];await f.appointments.create(client,{id:randomUUID(),clientName:'Client',serviceId:service.id,expectedPrice:service.priceAgorot,preference:'Next week'});await f.appointments.create(stranger,{id:randomUUID(),clientName:'Unassigned',serviceId:service.id,expectedPrice:service.priceAgorot,preference:'Next week'});return f;}
function race(f,change){const prepare=f.db.prepare.bind(f.db);let fired=false;f.db.prepare=q=>{const s=prepare(q);if(!q.includes('FROM consultation_services ORDER BY'))return s;return {...s,async all(){const r=await s.all();if(!fired){fired=true;change();}return r;}};};}
for(const [name,change] of [
 ['connection revoked',f=>f.sql.prepare('UPDATE care_connections SET active=0 WHERE staff_email=?').run(coord.email)],
 ['scope changed',f=>f.sql.prepare("UPDATE care_connections SET scope='care' WHERE staff_email=?").run(coord.email)],
 ['staff disabled',f=>f.sql.prepare('UPDATE care_staff SET active=0 WHERE email=?').run(coord.email)],
 ['role changed',f=>f.sql.prepare("UPDATE care_staff SET role='coach' WHERE email=?").run(coord.email)],
])test('appointment management rejects '+name+' after service enrichment',async t=>{const f=await fixture(t);race(f,()=>change(f));await assert.rejects(()=>f.appointments.list(coord,true),e=>e.status===403);});
test('empty management listing still rejects staff disablement',async t=>{const f=await fixture(t);f.sql.prepare('UPDATE care_connections SET active=0 WHERE staff_email=?').run(coord.email);race(f,()=>f.sql.prepare('UPDATE care_staff SET active=0 WHERE email=?').run(coord.email));await assert.rejects(()=>f.appointments.list(coord,true),e=>e.status===403);});
test('one revoked client discards a multi-client management response',async t=>{const f=await fixture(t);f.sql.prepare("INSERT INTO care_connections(id,client_id,staff_email,scope,active,created_at) VALUES(?,?,?,'coordinator',1,'2026-10-09')").run(randomUUID(),stranger.userId,coord.email);race(f,()=>f.sql.prepare('UPDATE care_connections SET active=0 WHERE client_id=? AND staff_email=?').run(client.userId,coord.email));await assert.rejects(()=>f.appointments.list(coord,true),e=>e.status===403);});
test('valid coordinator filters unrelated clients and wrong scope',async t=>{const f=await fixture(t);const rows=await f.appointments.list(coord,true);assert.equal(rows.length,1);assert.equal(rows[0].clientId,client.userId);f.sql.prepare("UPDATE care_connections SET scope='care' WHERE staff_email=?").run(coord.email);assert.deepEqual(await f.appointments.list(coord,true),[]);});
test('owner history remains after team revocation and configured admin retains full management',async t=>{const f=await fixture(t);race(f,()=>f.sql.exec('UPDATE care_connections SET active=0'));const rows=await f.appointments.list(client);assert.equal(rows.length,1);assert.equal(rows[0].clientId,client.userId);assert.equal((await f.appointments.list(doctor,true)).length,2);});
