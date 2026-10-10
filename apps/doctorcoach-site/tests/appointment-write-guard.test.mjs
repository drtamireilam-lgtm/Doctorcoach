import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,doctor,client} from './platform-db.mjs';
import {defaultServices} from '../lib/services.ts';
const coordinator={userId:'coord',email:'coord@example.test'};
async function fixture(t,action='schedule'){
 const f=platform(t);await f.connect();
 await f.care.saveStaff(doctor,{...coordinator,name:'Coordinator',role:'coordinator',active:true});
 const invite=await f.care.createInvite(doctor,{emails:[doctor.email,coordinator.email]});await f.care.acceptInvite(client,{code:invite.code,consent:true});
 const service=await f.services.save(doctor,{...defaultServices[0],priceConfirmed:true});
 let a=await f.appointments.create(client,{id:randomUUID(),serviceId:service.id,expectedPrice:service.priceAgorot,clientName:'משתמש בדיקה',preference:'בדיקת תור'});
 if(action!=='schedule'){f.sql.prepare("UPDATE care_appointments SET state='scheduled',starts_at='2026-01-01T10:00:00.000Z',ends_at='2026-01-01T11:00:00.000Z' WHERE id=?").run(a.id);}
 if(action==='markRefunded')f.sql.prepare("UPDATE care_appointments SET state='cancelled',payment_state='refund_pending' WHERE id=?").run(a.id);
 const payload={id:a.id,version:1,action,startsAt:new Date(Date.now()+7*86400000).toISOString(),reference:'TEST-123',verified:true};
 return {...f,service,id:a.id,payload};
}
function race(f,change){const prepare=f.db.prepare.bind(f.db);let fired=false;f.db.prepare=q=>{const s=prepare(q);if(!q.startsWith('UPDATE care_appointments SET'))return s;return {bind(...args){const b=s.bind(...args);return {...b,async first(){if(!fired){fired=true;change();}return b.first();}};}};};}
const snapshot=f=>({...f.sql.prepare('SELECT * FROM care_appointments WHERE id=?').get(f.id)});
for(const action of ['schedule','cancel','followup','complete','verifyPayment','markRefunded'])for(const [name,change] of [
 ['connection revoked',f=>f.sql.prepare('UPDATE care_connections SET active=0 WHERE staff_email=?').run(coordinator.email)],
 ['scope changed',f=>f.sql.prepare("UPDATE care_connections SET scope='care' WHERE staff_email=?").run(coordinator.email)],
 ['staff disabled',f=>f.sql.prepare('UPDATE care_staff SET active=0 WHERE email=?').run(coordinator.email)],
 ['role changed',f=>f.sql.prepare("UPDATE care_staff SET role='coach' WHERE email=?").run(coordinator.email)],
])test(action+' rejects concurrent '+name,async t=>{const f=await fixture(t,action),before=snapshot(f);race(f,()=>change(f));await assert.rejects(()=>f.appointments.update(coordinator,f.payload),e=>e.status===403);assert.deepEqual(snapshot(f),before);});
for(const [name,set] of [['price','price_agorot=price_agorot+100'],['duration','duration_minutes=duration_minutes+5'],['provider',"provider='nadav'"],['confirmation','price_confirmed=0'],['visibility',"status='draft'"]])test('schedule rejects concurrent service '+name+' change',async t=>{const f=await fixture(t),before=snapshot(f);race(f,()=>f.sql.prepare('UPDATE consultation_services SET '+set+' WHERE id=?').run(f.service.id));await assert.rejects(()=>f.appointments.update(doctor,f.payload),e=>e.status===409);assert.deepEqual(snapshot(f),before);});
test('concurrent appointment update returns conflict without overwriting winner',async t=>{const f=await fixture(t);race(f,()=>f.sql.prepare("UPDATE care_appointments SET version=version+1,staff_note='winner' WHERE id=?").run(f.id));await assert.rejects(()=>f.appointments.update(coordinator,f.payload),e=>e.status===409);assert.equal(snapshot(f).staff_note,'winner');assert.equal(snapshot(f).state,'requested');});
test('owner cancellation remains available after team revocation',async t=>{const f=await fixture(t,'cancel');f.sql.prepare('UPDATE care_connections SET active=0').run();const a=await f.appointments.update(client,{id:f.id,version:1,action:'requestCancel'});assert.equal(a.state,'cancel_requested');});
test('authorized coordinator schedules and verifies payment explicitly',async t=>{const f=await fixture(t);let a=await f.appointments.update(coordinator,f.payload);assert.equal(a.state,'scheduled');a=await f.appointments.update(coordinator,{id:f.id,version:a.version,action:'verifyPayment',reference:'TEST-456',verified:true});assert.equal(a.paymentState,'confirmed');assert.equal(f.sql.prepare('SELECT payment_verified_by FROM care_appointments WHERE id=?').get(f.id).payment_verified_by,coordinator.userId);});
