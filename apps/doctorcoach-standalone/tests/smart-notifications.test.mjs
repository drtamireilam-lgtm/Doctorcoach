import test from 'node:test';
import assert from 'node:assert/strict';
import {platform,client,doctor} from './platform-db.mjs';
import {notificationsStore} from '../lib/notifications-store.ts';
import {notificationPreferencesStore,defaultNotificationPreferences,quietNow,parseNotificationPreferences} from '../lib/notification-preferences.ts';
import {currentWeek} from '../lib/care.ts';
import {shiftDay} from '../lib/weekly-progress.ts';
import {CONSENT_REVISION} from '../lib/intake.ts';
test('quiet hours use Israel time, cross midnight, and end at the boundary',()=>{const p={...defaultNotificationPreferences,quietEnabled:true};assert.equal(quietNow(p,new Date('2026-10-10T20:00:00Z')),true);assert.equal(quietNow(p,new Date('2026-10-11T04:59:00Z')),true);assert.equal(quietNow(p,new Date('2026-10-11T05:00:00Z')),false);assert.throws(()=>parseNotificationPreferences({...p,quietStart:'25:00'}));assert.throws(()=>parseNotificationPreferences({...p,quietEnd:p.quietStart}));});
async function fixture(t){const f=platform(t);await f.connect();f.sql.prepare('INSERT INTO user_consents(id,user_id,consent_id,revision,accepted,created_at) VALUES(?,?,?,?,1,?)').run('notify',client.userId,'notifications',CONSENT_REVISION,'2026-10-09');return {...f,notifications:notificationsStore(f.db,{clinicianEmails:doctor.email}),preferences:notificationPreferencesStore(f.db)};}
test('no consent means no notification content is returned',async t=>{const f=await fixture(t);f.sql.exec("UPDATE user_consents SET accepted=0 WHERE consent_id='notifications'");assert.deepEqual(await f.notifications.list(client),{enabled:false,items:[]});});
test('category opt-outs filter reminders without changing service consent or stored history',async t=>{const f=await fixture(t);await f.preferences.save(client.userId,{version:0,preferences:{...defaultNotificationPreferences,categories:{...defaultNotificationPreferences.categories,rehab:false}}});const r=await f.notifications.list(client);assert.ok(!r.items.some(i=>i.category==='rehab'));assert.equal((await f.preferences.get(client.userId)).pushSupported,false);await assert.rejects(f.preferences.save(client.userId,{version:0,preferences:defaultNotificationPreferences}),e=>e.status===409);});
test('a weekly summary notification has a stable ID and repeated reads do not duplicate it',async t=>{const f=await fixture(t),day=shiftDay(currentWeek(),-4);f.sql.prepare("INSERT INTO training_sessions(id,owner_id,status,items_json,started_at,finished_at,pain_before,planned_sets) VALUES(?,'client','completed','[]',?,?,0,0)").run(crypto.randomUUID(),day+'T10:00:00Z',day+'T11:00:00Z');const one=await f.notifications.list(client),two=await f.notifications.list(client);const weekly=one.items.find(i=>i.id.startsWith('weekly:'));assert.ok(weekly);assert.equal(two.items.filter(i=>i.id===weekly.id).length,1);assert.ok(!weekly.text.includes('כאב'));await f.preferences.dismiss(client.userId,{id:weekly.id});assert.ok(!(await f.notifications.list(client)).items.some(i=>i.id===weekly.id));});

import {smartNotifications} from '../lib/smart-notifications.ts';
const insertRecord=(f,id,kind,day,data)=>f.sql.prepare("INSERT INTO wellness_records(id,client_id,kind,slot,day,content_json,version,author_name,updated_at) VALUES(?,'client',?,?,?, ?,1,'Test',?)").run(id,kind,id,day,JSON.stringify(data),day+'T10:00:00Z');
test('weekly summary reminder includes rehabilitation-only tracking without claiming an empty week',async t=>{
 const f=await fixture(t),now=new Date('2026-10-11T09:00:00Z');
 assert.ok(!(await smartNotifications(f.db,client.userId,now)).some(i=>i.id==='weekly:2026-10-04'));
 insertRecord(f,crypto.randomUUID(),'rehab','2026-10-06',{pain:0,rom:90});
 const reminders=await smartNotifications(f.db,client.userId,now);
 assert.equal(reminders.filter(i=>i.id==='weekly:2026-10-04').length,1);
 assert.ok(!(await smartNotifications(f.db,'stranger',now)).some(i=>i.id.startsWith('weekly:')));
});
test('planned target reminders start Thursday, stop when reached, and never invent a schedule',async t=>{
 const f=await fixture(t),thursday=new Date('2026-10-08T09:00:00Z');
 assert.ok(!(await smartNotifications(f.db,client.userId,thursday)).some(i=>i.id.startsWith('goal-pending:')));
 f.sql.prepare("INSERT INTO weekly_goals(client_id,week,planned_sessions,updated_at) VALUES('client','2026-10-04',1,'2026-10-04')").run();
 assert.ok(!(await smartNotifications(f.db,client.userId,new Date('2026-10-07T09:00:00Z'))).some(i=>i.id.startsWith('goal-pending:')));
 assert.ok((await smartNotifications(f.db,client.userId,thursday)).some(i=>i.id==='goal-pending:2026-10-04'));
 f.sql.prepare("INSERT INTO training_sessions(id,owner_id,status,items_json,started_at,finished_at,pain_before,planned_sets) VALUES(?,'client','completed','[]','2026-10-08T08:00:00Z','2026-10-08T09:00:00Z',0,0)").run(crypto.randomUUID());
 const reminders=await smartNotifications(f.db,client.userId,thursday);
 assert.ok(!reminders.some(i=>i.id.startsWith('goal-pending:')));
 assert.ok(reminders.some(i=>i.id==='goal:2026-10-04'));
});
test('ROM reminder follows linked active episodes, preserves zero ROM, and is compact and private',async t=>{
 const f=await fixture(t),a=crypto.randomUUID(),b=crypto.randomUUID(),now=new Date('2026-10-11T09:00:00Z');
 insertRecord(f,a,'episode','2026-09-20',{status:'active',region:'ברך',side:'ימין',label:'Private injury A'});
 insertRecord(f,b,'episode','2026-09-20',{status:'active',region:'כתף',side:'שמאל',label:'Private injury B'});
 insertRecord(f,crypto.randomUUID(),'rehab','2026-10-01',{episodeId:a,region:'ברך',side:'ימין',rom:0});
 insertRecord(f,crypto.randomUUID(),'rehab','2026-10-10',{episodeId:b,region:'כתף',side:'שמאל',rom:90});
 const reminders=(await smartNotifications(f.db,client.userId,now)).filter(i=>i.id.startsWith('rom:'));
 assert.equal(reminders.length,1);assert.ok(!reminders[0].text.includes('Private'));
 f.sql.prepare("UPDATE wellness_records SET content_json=? WHERE id=?").run(JSON.stringify({status:'closed',region:'ברך',side:'ימין'}),a);
 assert.ok(!(await smartNotifications(f.db,client.userId,now)).some(i=>i.id.startsWith('rom:')));
});
