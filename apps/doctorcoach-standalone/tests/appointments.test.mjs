import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,doctor,coach,client,stranger} from './platform-db.mjs';
import {defaultServices,externalLink} from '../lib/services.ts';
import {calendarEvent,israelAppointmentTime} from '../lib/appointments.ts';
const request=(service=defaultServices[0])=>({id:randomUUID(),clientName:'משתמש בדיקה',serviceId:service.id,expectedPrice:service.priceAgorot,preference:'יום ראשון בבוקר'});
const future=()=>new Date(Date.now()+7*86400000).toISOString();
async function scheduled(p){const service=await p.services.save(doctor,{...defaultServices[0],priceConfirmed:true,paymentUrl:'https://payments.example.test/checkout'});const a=await p.appointments.create(client,request(service));return p.appointments.update(doctor,{id:a.id,version:a.version,action:'schedule',startsAt:future(),meetingUrl:'https://meet.example.test/test'});}

test('appointment requests snapshot service data, deduplicate, and reject other accounts and stale prices',async t=>{
  const p=platform(t);const input=request();
  const a=await p.appointments.create(client,input);const retry=await p.appointments.create(client,input);
  assert.equal(a.id,retry.id);assert.equal((await p.appointments.list(client)).length,1);assert.equal((await p.appointments.list(stranger)).length,0);
  await assert.rejects(()=>p.appointments.list(coach,true),e=>e.status===403);
  await assert.rejects(()=>p.appointments.create(stranger,input),e=>e.status===403);
  await assert.rejects(()=>p.appointments.update(stranger,{id:a.id,version:1,action:'requestCancel'}),e=>e.status===403);
  await assert.rejects(()=>p.appointments.create(client,{...request(),expectedPrice:1}),e=>e.status===409);
  await assert.rejects(()=>p.appointments.update(doctor,{id:a.id,version:1,action:'schedule',startsAt:'2020-01-01T00:00:00Z'}));
});

test('scheduling prevents overlap and stale writes, and hides payment links when the catalog price changes',async t=>{
  const p=platform(t);const a=await scheduled(p);const b=await p.appointments.create(stranger,request());
  await assert.rejects(()=>p.appointments.update(doctor,{id:b.id,version:1,action:'schedule',startsAt:a.startsAt}),e=>e.status===409);
  await assert.rejects(()=>p.appointments.update(doctor,{id:a.id,version:1,action:'cancel'}),e=>e.status===409);
  assert.equal((await p.appointments.list(client))[0].paymentUrl,'https://payments.example.test/checkout');
  const s=(await p.services.listAdmin(doctor))[0];await p.services.save(doctor,{...s,priceAgorot:s.priceAgorot+100});
  assert.equal((await p.appointments.list(client))[0].paymentUrl,'');
  await assert.rejects(()=>p.appointments.update(doctor,{id:a.id,version:a.version,action:'schedule',startsAt:future()}));
});

test('reported payment is never confirmed automatically and refunds require an explicit verified reference',async t=>{
  const p=platform(t);let a=await scheduled(p);
  a=await p.appointments.update(client,{id:a.id,version:a.version,action:'reportPayment',reference:'TEST-123'});
  assert.equal(a.paymentState,'reported');
  await assert.rejects(()=>p.appointments.update(client,{id:a.id,version:a.version,action:'verifyPayment',reference:'TEST-123',verified:true}),e=>e.status===403);
  await assert.rejects(()=>p.appointments.update(doctor,{id:a.id,version:a.version,action:'verifyPayment',reference:'TEST-123',verified:false}));
  a=await p.appointments.update(doctor,{id:a.id,version:a.version,action:'verifyPayment',reference:'TEST-123',verified:true});
  assert.equal(a.paymentState,'confirmed');
  a=await p.appointments.update(client,{id:a.id,version:a.version,action:'requestCancel'});assert.equal(a.state,'cancel_requested');
  a=await p.appointments.update(doctor,{id:a.id,version:a.version,action:'cancel',staffNote:'בוטל לבקשת המתאמן'});assert.equal(a.paymentState,'refund_pending');
  await assert.rejects(()=>p.appointments.update(doctor,{id:a.id,version:a.version,action:'markRefunded',reference:'REF-123'}));
  a=await p.appointments.update(doctor,{id:a.id,version:a.version,action:'markRefunded',reference:'REF-123',verified:true});assert.equal(a.paymentState,'refunded');
});

test('calendar export has UTC times, two reminders and no health or client details',async t=>{
  const p=platform(t);const a=await scheduled(p);const ics=calendarEvent(a);
  assert.match(ics,/BEGIN:VCALENDAR\r\n/);assert.match(ics,/DTSTART:\d{8}T\d{6}Z/);
  assert.equal((ics.match(/BEGIN:VALARM/g)||[]).length,2);assert.ok(!ics.includes(a.clientName));assert.ok(!ics.includes(a.title));assert.ok(!ics.includes(a.meetingUrl));
  assert.throws(()=>calendarEvent({...a,state:'cancelled'}));
  for(const url of ['http://payments.example.test','javascript:alert(1)','https://user:password@example.test','https://localhost/pay','https://127.0.0.1/pay'])assert.throws(()=>externalLink(url));
});

 test('Israel scheduling resolves summer and winter and rejects ambiguous or skipped local times',()=>{
  assert.equal(israelAppointmentTime('2026-09-26T12:30'),'2026-09-26T09:30:00.000Z');
  assert.equal(israelAppointmentTime('2026-12-26T12:30'),'2026-12-26T10:30:00.000Z');
  assert.throws(()=>israelAppointmentTime('2026-10-25T01:30'));
  assert.throws(()=>israelAppointmentTime('2026-03-27T02:30'));
  assert.throws(()=>israelAppointmentTime('2026-02-30T12:30'));
 });

 test('confirmed built-in service can be scheduled without saving an identical catalog row',async t=>{
 const p=platform(t),a=await p.appointments.create(client,request());
 const saved=await p.appointments.update(doctor,{id:a.id,version:a.version,action:'schedule',startsAt:future()});
 assert.equal(saved.state,'scheduled');assert.equal((await p.appointments.list(client))[0].startsAt,saved.startsAt);
 assert.equal(p.sql.prepare('SELECT COUNT(*) AS n FROM consultation_services').get().n,0);
 });
