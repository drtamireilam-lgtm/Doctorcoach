import test from 'node:test';
import assert from 'node:assert/strict';
import {platform,client,doctor,stranger} from './platform-db.mjs';
import {pushStore} from '../lib/push-store.ts';
import {pushEndpoint,sendWebPush,base64url} from '../lib/web-push.ts';
import {notificationPreferencesStore,defaultNotificationPreferences} from '../lib/notification-preferences.ts';
import {CONSENT_REVISION} from '../lib/intake.ts';
import {onboardingStore} from '../lib/onboarding-store.ts';
import {notificationsStore} from '../lib/notifications-store.ts';
const endpoint='https://web.push.apple.com/test-endpoint';
const keys=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
const config={publicKey:base64url(new Uint8Array(await crypto.subtle.exportKey('raw',keys.publicKey))),privateJwk:JSON.stringify(await crypto.subtle.exportKey('jwk',keys.privateKey)),subject:'mailto:push@example.test'};
async function fixture(t,status=201){const f=platform(t);await f.connect();for(const id of ['notifications','push'])f.sql.prepare('INSERT INTO user_consents(id,user_id,consent_id,revision,accepted,created_at) VALUES(?,?,?,?,1,?)').run('push-consent-'+id,client.userId,id,CONSENT_REVISION,'2026-10-11');let sends=0;const store=pushStore(f.db,{clinicianEmails:doctor.email},config,async()=>{sends++;return new Response(null,{status});});return {...f,store,sends:()=>sends};}
test('legacy in-app consent never authorizes device push; separate opt-in is required',async t=>{
 const f=await fixture(t);f.sql.exec("DELETE FROM user_consents WHERE consent_id='push'");
 assert.equal((await f.store.status(client)).consented,false);
 await assert.rejects(f.store.subscribe(client,{endpoint}),e=>e.status===403);
 assert.equal((await f.store.status(client)).devices.length,0);
});
test('withdrawing only push consent blocks tests and dispatch but retains in-app consent',async t=>{
 const f=await fixture(t);await f.store.subscribe(client,{endpoint});
 f.sql.exec("UPDATE user_consents SET accepted=0 WHERE consent_id='push'");
 await assert.rejects(f.store.test(client,{endpoint}),e=>e.status===403);
 await f.store.dispatch();assert.equal(f.sends(),0);
 assert.equal(f.sql.prepare("SELECT accepted FROM user_consents WHERE consent_id='notifications'").get().accepted,1);
});
test('revoking push during notification computation prevents dispatch',async t=>{
 const f=await fixture(t);await f.store.subscribe(client,{endpoint});const prepare=f.db.prepare;
 f.db.prepare=query=>{if(query.startsWith('SELECT preferences_json'))f.sql.exec("UPDATE user_consents SET accepted=0 WHERE consent_id='push'");return prepare(query);};
 await f.store.dispatch();assert.equal(f.sends(),0);
});
test('privacy controls persist separate push consent without invalidating medical consent',async t=>{
 const f=await fixture(t),onboard=onboardingStore(f.db,{clinicianEmails:doctor.email});
 await onboard.optionalConsent(client,{id:'push',accepted:false});
 assert.equal((await f.store.status(client)).consented,false);
 assert.equal((await onboard.consentState(client.userId)).health,true);
 await onboard.optionalConsent(client,{id:'push',accepted:true});
 assert.equal((await f.store.status(client)).consented,true);
});
test('revocation at subscription persistence prevents an endpoint from being stored',async t=>{
 const f=await fixture(t),prepare=f.db.prepare;
 f.db.prepare=query=>{if(query.startsWith('INSERT INTO push_devices'))f.sql.exec("UPDATE user_consents SET accepted=0 WHERE consent_id='push'");return prepare(query);};
 await assert.rejects(f.store.subscribe(client,{endpoint}),e=>e.status===403);
 assert.equal((await f.store.status(client)).devices.length,0);
});
test('push destinations reject local hosts, lookalike hosts, credentials, redirects and unsupported schemes',()=>{
 for(const value of ['http://web.push.apple.com/x','https://localhost/x','https://web.push.apple.com.evil.test/x','https://user@web.push.apple.com/x','https://web.push.apple.com:8443/x','https://web.push.apple.com/x#test'])assert.throws(()=>pushEndpoint(value));
 assert.equal(pushEndpoint(endpoint),endpoint);
});
test('VAPID signature verifies and the push request contains no payload or medical content',async()=>{
 let options;await sendWebPush(endpoint,config,async(url,opts)=>{assert.equal(url,endpoint);options=opts;return new Response(null,{status:201});});
 assert.equal(options.body,null);assert.equal(options.redirect,'manual');assert.equal(options.headers.TTL,'0');
 const token=options.headers.Authorization.match(/^vapid t=(.+), k=/)[1];const [a,b,c]=token.split('.');
 assert.equal(JSON.parse(Buffer.from(b,'base64url')).aud,'https://web.push.apple.com');
 assert.ok(await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},keys.publicKey,Buffer.from(c,'base64url'),new TextEncoder().encode(a+'.'+b)));
});
test('provider redirects are returned without forwarding authorization or reporting acceptance',async t=>{
 const f=await fixture(t);await f.store.subscribe(client,{endpoint});let calls=0;
 const fetcher=async(url,options)=>{
  calls++;assert.equal(url,endpoint);
  if(options.redirect!=='manual')throw new TypeError('Worker requires manual redirect mode');
  return new Response(null,{status:307,headers:{Location:'https://untrusted.example.test/push'}});
 };
 const store=pushStore(f.db,{clinicianEmails:doctor.email},config,fetcher);
 await assert.rejects(store.test(client,{endpoint}),e=>e.status===502);
 assert.equal(calls,1);
 assert.equal(f.sql.prepare('SELECT last_sent_at FROM push_devices').get().last_sent_at,null);
});
test('device subscriptions require consent, are owner scoped and never reveal endpoints in status',async t=>{
 const f=await fixture(t);await f.store.subscribe(client,{endpoint});assert.equal((await f.store.status(client)).devices.length,1);assert.equal((await f.store.status(stranger)).devices.length,0);
 assert.equal((await f.store.status(client)).devices[0].endpoint,undefined);
 await assert.rejects(f.store.unsubscribe(stranger,{endpoint}),e=>e.status===404);
 f.sql.exec("UPDATE user_consents SET accepted=0 WHERE consent_id='notifications'");await assert.rejects(f.store.subscribe(client,{endpoint:endpoint+'2'}),e=>e.status===403);
});
test('scheduled dispatch sends generic updates once and stops after device removal',async t=>{
 const f=await fixture(t);await f.store.subscribe(client,{endpoint});assert.equal((await f.store.dispatch()).sent,1);assert.equal((await f.store.dispatch()).sent,0);assert.equal(f.sends(),1);
 await f.store.unsubscribe(client,{endpoint});await f.store.dispatch();assert.equal(f.sends(),1);
});
test('rescheduling an appointment sends a fresh push while unchanged schedules stay deduplicated',async t=>{
 const f=await fixture(t);await f.store.subscribe(client,{endpoint});
 const a=await f.appointments.create(client,{id:crypto.randomUUID(),clientName:'Test client',serviceId:'medical-video',expectedPrice:30000,preference:'Tomorrow'});
 const startsAt=new Date(Date.now()+3600000).toISOString();
 const scheduled=await f.appointments.update(doctor,{id:a.id,version:a.version,action:'schedule',startsAt});
 assert.equal((await f.store.dispatch()).sent,1);
 assert.equal((await f.store.dispatch()).sent,0);
 await f.appointments.update(doctor,{id:a.id,version:scheduled.version,action:'schedule',startsAt:new Date(Date.now()+7200000).toISOString()});
 assert.equal((await f.store.dispatch()).sent,1);
 assert.equal((await f.store.dispatch()).sent,0);
 assert.equal(f.sends(),2);
});
test('confirmed cancellation sends once even outside the next-day window; pending requests are not confirmation',async t=>{
 const f=await fixture(t);await f.store.subscribe(client,{endpoint});
 const list=notificationsStore(f.db,{clinicianEmails:doctor.email});
 const a=await f.appointments.create(client,{id:crypto.randomUUID(),clientName:'Test client',serviceId:'medical-video',expectedPrice:30000,preference:'Next week'});
 const scheduled=await f.appointments.update(doctor,{id:a.id,version:a.version,action:'schedule',startsAt:new Date(Date.now()+3*86400000).toISOString()});
 await f.store.dispatch();const initial=f.sends();
 const pending=await f.appointments.update(client,{id:a.id,version:scheduled.version,action:'requestCancel'});
 assert.equal((await list.list(client)).items.some(i=>i.id.startsWith('appointment-cancelled:')),false);
 await f.appointments.update(doctor,{id:a.id,version:pending.version,action:'cancel'});
 assert.equal((await f.store.dispatch()).sent,1);
 assert.equal((await f.store.dispatch()).sent,0);
 assert.equal(f.sends(),initial+1);
 assert.equal((await list.list(stranger)).items.some(i=>i.id.startsWith('appointment-cancelled:')),false);
 assert.equal((await list.list(client)).items.some(i=>i.id.startsWith('appointments:')),false);
 f.sql.prepare('UPDATE care_appointments SET updated_at=? WHERE id=?').run(new Date().toISOString(),a.id);
 assert.equal((await f.store.dispatch()).sent,0);
 f.sql.prepare('UPDATE care_appointments SET updated_at=? WHERE id=?').run(new Date(Date.now()-8*86400000).toISOString(),a.id);
 assert.equal((await list.list(client)).items.some(i=>i.id.startsWith('appointment-cancelled:')),false);
});
test('revoked consent and all-day quiet hours prevent background sending',async t=>{
 const f=await fixture(t);await f.store.subscribe(client,{endpoint});f.sql.exec("UPDATE user_consents SET accepted=0 WHERE consent_id='notifications'");await f.store.dispatch();assert.equal(f.sends(),0);
 f.sql.exec("UPDATE user_consents SET accepted=1 WHERE consent_id='notifications'");
 const time=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jerusalem',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());
 await notificationPreferencesStore(f.db).save(client.userId,{version:0,preferences:{...defaultNotificationPreferences,quietEnabled:true,quietStart:time,quietEnd:time==='00:00'?'23:59':'00:00'}});
 await f.store.dispatch();assert.equal(f.sends(),0);
});
test('expired push endpoints are removed and never retried',async t=>{
 const f=await fixture(t,410);await f.store.subscribe(client,{endpoint});await f.store.dispatch();assert.equal((await f.store.status(client)).devices.length,0);await f.store.dispatch();assert.equal(f.sends(),1);
});
test('test push is owner scoped, rate limited and reports provider acceptance rather than delivery',async t=>{
 const f=await fixture(t);await f.store.subscribe(client,{endpoint});await assert.rejects(f.store.test(stranger,{endpoint}),e=>e.status===403||e.status===404);
 assert.deepEqual(await f.store.test(client,{endpoint}),{accepted:true,delivered:false});await assert.rejects(f.store.test(client,{endpoint}),e=>e.status===429);assert.equal(f.sends(),1);
});
test('removing a device during test notification computation prevents sending',async t=>{
 const f=await fixture(t);await f.store.subscribe(client,{endpoint});const prepare=f.db.prepare;
 f.db.prepare=query=>{if(query.startsWith('SELECT preferences_json'))f.sql.exec('DELETE FROM push_devices');return prepare(query);};
 await assert.rejects(f.store.test(client,{endpoint}),e=>e.status===404);assert.equal(f.sends(),0);
});
test('withdrawal during test computation prevents provider submission',async t=>{
 const f=await fixture(t);await f.store.subscribe(client,{endpoint});const prepare=f.db.prepare;
 f.db.prepare=query=>{if(query.startsWith('SELECT preferences_json'))f.sql.exec("UPDATE user_consents SET accepted=0 WHERE consent_id='push'");return prepare(query);};
 await assert.rejects(f.store.test(client,{endpoint}),e=>e.status===403);assert.equal(f.sends(),0);
});
test('quiet hours also block manually requested test pushes',async t=>{
 const f=await fixture(t);await f.store.subscribe(client,{endpoint});
 const time=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jerusalem',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());
 await notificationPreferencesStore(f.db).save(client.userId,{version:0,preferences:{...defaultNotificationPreferences,quietEnabled:true,quietStart:time,quietEnd:time==='00:00'?'23:59':'00:00'}});
 await assert.rejects(f.store.test(client,{endpoint}),e=>e.status===403);assert.equal(f.sends(),0);
});
test('replacing a device registration during test computation invalidates the old test claim',async t=>{
 const f=await fixture(t);await f.store.subscribe(client,{endpoint});const prepare=f.db.prepare;let replaced=false;
 f.db.prepare=query=>{if(query.startsWith('SELECT preferences_json')&&!replaced){replaced=true;f.sql.exec('UPDATE push_devices SET last_test_at=NULL');}return prepare(query);};
 await assert.rejects(f.store.test(client,{endpoint}),e=>e.status===404);assert.equal(f.sends(),0);
});

test('five-device cap permits renewal but blocks an additional device',async t=>{
 const f=await fixture(t);for(let i=0;i<5;i++)await f.store.subscribe(client,{endpoint:endpoint+i});
 await f.store.subscribe(client,{endpoint:endpoint+'0'});
 await assert.rejects(f.store.subscribe(client,{endpoint:endpoint+'5'}),e=>e.status===409);
 assert.equal((await f.store.status(client)).devices.length,5);
});
test('parallel dispatch claims send each device only once',async t=>{
 const f=await fixture(t);await f.store.subscribe(client,{endpoint});
 await Promise.all([f.store.dispatch(),f.store.dispatch()]);assert.equal(f.sends(),1);
});
test('consent revoked while a dispatch is computing notifications fails closed',async t=>{
 const f=await fixture(t);await f.store.subscribe(client,{endpoint});
 const prepare=f.db.prepare;let reads=0;f.db.prepare=query=>{if(query.startsWith('SELECT preferences_json')&&++reads===1)f.sql.exec("UPDATE user_consents SET accepted=0 WHERE consent_id='notifications'");return prepare(query);};
 await f.store.dispatch();assert.equal(f.sends(),0);
});

import {communicationStore} from '../lib/communication-store.ts';
test('a new unread message triggers another push even when unread count is unchanged, without cooldown loss',async t=>{
 const f=await fixture(t),messages=communicationStore(f.db,{clinicianEmails:doctor.email});await f.store.subscribe(client,{endpoint});
 // Start with no weekly-checkin reminder so only message events drive delivery.
 await notificationPreferencesStore(f.db).save(client.userId,{version:0,preferences:{...defaultNotificationPreferences,categories:{training:false,rehab:false,progress:false,team:true,appointments:false}}});
 await f.store.dispatch();assert.equal(f.sends(),0);
 const first={id:crypto.randomUUID(),clientId:client.userId,channel:'medical',content:'First team message'};await messages.send(doctor,first);await f.store.dispatch();assert.equal(f.sends(),1);
 await messages.read(client,{clientId:client.userId,channel:'medical',messageId:first.id});
 // A second message arrives before another dispatch observes zero unread.
 await messages.send(doctor,{...first,id:crypto.randomUUID(),content:'Second team message'});await f.store.dispatch();assert.equal(f.sends(),2);
 await f.store.dispatch();assert.equal(f.sends(),2);
});
