import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,doctor,coach,client} from './platform-db.mjs';
import {appointmentGroups} from '../lib/appointment-navigation.ts';
import {appointmentsStore} from '../lib/appointments-store.ts';
const base={clientName:'Synthetic',title:'Consult',provider:'tamir',paymentState:'unpaid',version:1};
test('terminal consultations stay in history despite unpaid refunds, feedback or sync errors',()=>{
 const rows=['completed','cancelled','no_show'].map((state,i)=>({...base,id:String(i),state,paymentState:'refund_pending',calendarStatus:'error'}));
 const g=appointmentGroups(rows);assert.deepEqual(g.past.map(a=>a.id),['0','1','2']);assert.equal(g.attention.length,0);
});
test('pending, future and overdue consultations are distinct and time never completes a consultation',()=>{
 const rows=[{...base,id:'p',state:'requested'},{...base,id:'u',state:'scheduled',startsAt:'2099-01-01T10:00:00Z',endsAt:'2099-01-01T11:00:00Z'},{...base,id:'a',state:'scheduled',endsAt:'2000-01-01T11:00:00Z'}];
 const g=appointmentGroups(rows);assert.deepEqual(g.pending.map(a=>a.id),['p']);assert.deepEqual(g.attention.map(a=>a.id),['a']);assert.deepEqual(g.upcoming.map(a=>a.id),['u']);assert.equal(rows[2].state,'scheduled');
});
async function fixture(t){const f=platform(t);const a=await f.appointments.create(client,{id:randomUUID(),clientName:'Synthetic',serviceId:'medical-video',expectedPrice:30000,preference:'PRIVATE MEDICAL TEXT'});return {...f,a};}
test('explicit no-show is clinical-only, versioned, historical and records the transition',async t=>{
 const f=await fixture(t);f.sql.prepare("UPDATE care_appointments SET state='scheduled',starts_at='2000-01-01T10:00:00Z',ends_at='2000-01-01T10:30:00Z' WHERE id=?").run(f.a.id);
 const a=await f.appointments.update(doctor,{id:f.a.id,version:1,action:'noShow'});assert.equal(a.state,'no_show');
 assert.equal(f.sql.prepare('SELECT to_state FROM appointment_status_history WHERE appointment_id=? ORDER BY version DESC LIMIT 1').get(a.id).to_state,'no_show');
 await assert.rejects(()=>f.appointments.update(coach,{id:a.id,version:a.version,action:'complete'}),e=>e.status===403);
});
test('administrative staff receive administrative history only and cannot complete consultations',async t=>{
 const f=await fixture(t),ops={userId:'ops',email:'ops@example.test'};
 f.sql.prepare("UPDATE care_appointments SET state='scheduled',ends_at='2000-01-01T10:30:00Z',staff_note='PRIVATE NOTE',feedback_response='PRIVATE FEEDBACK' WHERE id=?").run(f.a.id);
 const store=appointmentsStore(f.db,doctor.email+','+ops.email,{clinicalEmails:doctor.email,operationsEmails:ops.email});
 const rows=await store.list(ops,true);assert.equal(rows[0].preference,'');assert.equal(rows[0].staffNote,'');assert.equal(rows[0].feedbackResponse,'');
 await assert.rejects(()=>store.update(ops,{id:f.a.id,version:1,action:'complete'}),e=>e.status===403);
});
test('server history filters existing records by patient, Israel date and status without removing data',async t=>{
 const f=await fixture(t);f.sql.prepare("UPDATE care_appointments SET state='completed',starts_at='2026-10-26T22:30:00Z',ends_at='2026-10-26T23:00:00Z' WHERE id=?").run(f.a.id);
 assert.equal((await f.appointments.list(doctor,true,{view:'active'})).length,0);
 assert.equal((await f.appointments.list(doctor,true,{view:'history',query:'synthetic',dateFrom:'2026-10-27',dateTo:'2026-10-27',status:'completed'})).length,1);
 assert.equal((await f.appointments.list(doctor,true,{view:'history',dateTo:'2026-10-26'})).length,0);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM care_appointments').get().n,1);
});

test('history paginates beyond the old 100-row cap and filters before pagination',async t=>{
 const f=await fixture(t);const insert=f.sql.prepare("INSERT INTO care_appointments(id,client_id,client_name,service_id,title,provider,duration,price_agorot,preference,state,created_at,updated_at) VALUES(?,'client',?,'medical-video','Consult','tamir',30,30000,'','completed',?,?)");
 for(let i=0;i<105;i++)insert.run(randomUUID(),'History '+i,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z');
 const first=await f.appointments.list(doctor,true,{view:'history'}),second=await f.appointments.list(doctor,true,{view:'history',offset:100});assert.equal(first.length,100);assert.equal(second.length,5);assert.equal(new Set([...first,...second].map(a=>a.id)).size,105);
 assert.equal((await f.appointments.list(doctor,true,{view:'history',query:'History 104'})).length,1);
});
test('no-show and completion reject future consultations and terminal history is read only to coaches',async t=>{
 const f=await fixture(t);const a=await f.appointments.update(doctor,{id:f.a.id,version:1,action:'schedule',startsAt:'2090-01-01T10:00:00Z'});
 for(const action of ['complete','noShow'])await assert.rejects(()=>f.appointments.update(doctor,{id:a.id,version:a.version,action}));
 await assert.rejects(()=>f.appointments.list(coach,true,{view:'history'}),e=>e.status===403);
 assert.equal((await f.appointments.list(client))[0].state,'scheduled');
});

test('completed history cannot be reopened via followup and disabled operations lose appointment access',async t=>{
 const f=await fixture(t);f.sql.prepare("UPDATE care_appointments SET state='completed' WHERE id=?").run(f.a.id);
 await assert.rejects(()=>f.appointments.update(doctor,{id:f.a.id,version:1,action:'followup'}));
 const ops={userId:'ops',email:'ops@example.test'},store=appointmentsStore(f.db,doctor.email+','+ops.email,{clinicalEmails:doctor.email,operationsEmails:ops.email});
 f.sql.prepare("INSERT INTO care_staff(email,name,role,active,updated_at) VALUES(?,'Ops','coordinator',0,'2026-01-01')").run(ops.email);
 await assert.rejects(()=>store.list(ops,true),e=>e.status===403);
});

test('reported no-show payments can be explicitly verified while consultation stays in history',async t=>{
 const f=await fixture(t);f.sql.prepare("UPDATE care_appointments SET state='scheduled',ends_at='2000-01-01T10:30:00Z',payment_state='reported' WHERE id=?").run(f.a.id);
 let a=await f.appointments.update(doctor,{id:f.a.id,version:1,action:'noShow'});
 a=await f.appointments.update(doctor,{id:a.id,version:a.version,action:'verifyPayment',verified:true,reference:'SYNTHETIC-PAID'});
 assert.equal(a.state,'no_show');assert.equal(a.paymentState,'confirmed');assert.equal((await f.appointments.list(doctor,true,{view:'history'})).length,1);
});

test('explicit clinician disablement blocks appointment management unless the account is a configured administrator',async t=>{
 const f=await fixture(t);f.sql.prepare("INSERT INTO care_staff(email,name,role,active,updated_at) VALUES(?,'Doctor','clinician',0,'2026-01-01')").run(doctor.email);
 const store=appointmentsStore(f.db,doctor.email,{clinicalEmails:doctor.email,rootAdminEmails:'admin@example.test'});
 await assert.rejects(()=>store.list(doctor,true),e=>e.status===403);
 assert.equal((await f.appointments.list(doctor,true)).length,1);
});
