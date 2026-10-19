import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,doctor,coach,client,stranger} from './platform-db.mjs';
import {defaultServices} from '../lib/services.ts';
import {appointmentGroups} from '../lib/appointment-navigation.ts';
import {notificationsStore} from '../lib/notifications-store.ts';
import {CONSENT_REVISION} from '../lib/intake.ts';
async function fixture(t){const f=platform(t),service=defaultServices[0];const a=await f.appointments.create(client,{id:randomUUID(),serviceId:service.id,clientName:'משתמש בדיקה',preference:'זמן לבדיקה',expectedPrice:service.priceAgorot});return {...f,a};}
function past(f){f.sql.prepare("UPDATE care_appointments SET state='completed',starts_at='2026-01-01T10:00:00Z',ends_at='2026-01-01T10:30:00Z' WHERE id=?").run(f.a.id);}
test('feedback requires a completed consultation and appointment management access; request cannot be sent twice',async t=>{
 const f=await fixture(t),payload={id:f.a.id,version:1,action:'requestFeedback',content:'איך היה המפגש?'};
 await assert.rejects(()=>f.appointments.update(doctor,payload));past(f);
 for(const user of [client,coach,stranger])await assert.rejects(()=>f.appointments.update(user,payload),e=>e.status===403);
 const a=await f.appointments.update(doctor,payload);assert.ok(a.feedbackRequestedAt);assert.equal(a.state,'completed');assert.equal(a.staffNote,'');
 await assert.rejects(()=>f.appointments.update(doctor,{...payload,version:a.version}));
 assert.equal((await f.appointments.list(client))[0].feedbackMessage,payload.content);
});
test('only appointment owner can reply once and response does not alter calendar, notes or payment',async t=>{
 const f=await fixture(t);past(f);let a=await f.appointments.update(doctor,{id:f.a.id,version:1,action:'requestFeedback',content:'נשמח למשוב'});
 const payload={id:a.id,version:a.version,action:'submitFeedback',content:'הסבר ברור ומועיל'};
 for(const user of [doctor,stranger])await assert.rejects(()=>f.appointments.update(user,payload),e=>e.status===403);
 a=await f.appointments.update(client,payload);assert.equal(a.feedbackResponse,payload.content);assert.ok(a.feedbackRespondedAt);assert.equal(a.state,'completed');assert.equal(a.paymentState,'unpaid');
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM google_calendar_sync').get().n,0);
 await assert.rejects(()=>f.appointments.update(client,{...payload,version:a.version}),e=>e.status===403);
 assert.equal((await f.appointments.list(doctor,true))[0].feedbackResponse,payload.content);
});
test('feedback notification is private, stable, consent-controlled and disappears after reply',async t=>{
 const f=await fixture(t);past(f);const a=await f.appointments.update(doctor,{id:f.a.id,version:1,action:'requestFeedback',content:'פרטי הודעת בדיקה'});const n=notificationsStore(f.db,{adminEmails:doctor.email,clinicianEmails:doctor.email});
 assert.deepEqual(await n.list(client),{enabled:false,items:[]});
 f.sql.prepare("INSERT INTO user_consents(id,user_id,consent_id,revision,accepted,created_at) VALUES(?,'client','notifications',?,1,?)").run(randomUUID(),CONSENT_REVISION,new Date().toISOString());
 const before=await n.list(client),item=before.items.find(i=>i.id==='consultation-feedback:'+a.id);assert.ok(item);assert.equal(item.section,'appointments');assert.ok(!item.text.includes('פרטי הודעת בדיקה'));
 assert.equal((await n.list(client)).items.filter(i=>i.id===item.id).length,1);
 await f.appointments.update(client,{id:a.id,version:a.version,action:'submitFeedback',content:'תודה על ההסבר'});assert.ok(!(await n.list(client)).items.some(i=>i.id===item.id));
});
test('management grouping keeps unresolved payments visible and sorts scheduled appointments by time',()=>{
 const base={clientName:'Test',title:'Consult',provider:'tamir',state:'scheduled',paymentState:'unpaid'};
 const a={...base,id:'a',startsAt:'2090-01-02T10:00:00Z',endsAt:'2090-01-02T11:00:00Z'},b={...a,id:'b',startsAt:'2090-01-01T10:00:00Z'},c={...base,id:'c',state:'completed',paymentState:'reported'},d={...base,id:'d',state:'cancelled'};
 const g=appointmentGroups([a,b,c,d]);assert.deepEqual(g.attention.map(x=>x.id),['c']);assert.deepEqual(g.upcoming.map(x=>x.id),['b','a']);assert.deepEqual(g.past.map(x=>x.id),['d']);assert.equal(appointmentGroups([a],'test','nadav').upcoming.length,0);
});
