import test from 'node:test';
import assert from 'node:assert/strict';
import {platform,doctor,client} from './platform-db.mjs';
import {careStore} from '../lib/care-store.ts';
import {privateDocumentStore} from '../lib/private-document-store.ts';
import {passportStore} from '../lib/passport-store.ts';
import {documentRetentionStore} from '../lib/document-retention.ts';
import {dashboardStore} from '../lib/dashboard-store.ts';
import {messagingStore} from '../lib/messaging-store.ts';
import {staffRoleGuard,careConnectionGuard} from '../lib/care-write-guard.ts';
import {wellnessWriteGuard} from '../lib/wellness-write-guard.ts';
const operations=[{userId:'shira',email:'shira12g@gmail.com'},{userId:'alon',email:'6a.d.alon6@gmail.com'}];
const config={adminEmails:[doctor.email,...operations.map(u=>u.email)].join(','),clinicianEmails:doctor.email,operationsEmails:operations.map(u=>u.email).join(','),exclusiveMedical:true};
test('both exact operation accounts can manage but cannot access another user medical record, passport, messages or retention',async t=>{
 const f=platform(t);await f.connect();const care=careStore(f.db,config);
 for(const u of operations){
  assert.equal((await care.requireStaff(u)).role,'coordinator');
  assert.equal((await care.teamOverview(u)).canManage,true);
  await assert.rejects(()=>care.bundle(u,client.userId),e=>e.status===403);
  await assert.rejects(()=>privateDocumentStore(f.db,config).list(u,client.userId,'medical'),e=>e.status===403);
  await assert.rejects(()=>passportStore(f.db,config).get(u,client.userId),e=>e.status===403);
  await assert.rejects(()=>messagingStore(f.db,config).list(u,client.userId,'medical'),e=>e.status===403);
  await assert.rejects(()=>documentRetentionStore(f.db,config).list(u,true),e=>e.status===403);
  await assert.rejects(()=>care.saveStaff(u,{email:'new@example.test',name:'New staff',role:'clinician',active:true}),e=>e.status===403);
  const d=await dashboardStore(f.db,config).get(u);assert.equal(d.canAdmin,true);assert.deepEqual(d.reviews,[]);
 }
 assert.equal((await care.bundle(doctor,client.userId)).canViewMedical,true);
 await privateDocumentStore(f.db,config).list(doctor,client.userId,'medical');
});
test('even an existing clinical role and medical relationship cannot bypass exclusive physician access',async t=>{
 const f=platform(t);await f.connect();const rogue={userId:'other-clinician',email:'other-clinician@example.test'};
 f.sql.prepare("INSERT INTO care_staff(email,name,role,active,updated_at) VALUES(?,'Other','clinician',1,'2026-01-01')").run(rogue.email);
 f.sql.prepare("INSERT INTO care_connections(id,client_id,staff_email,medical_access,nutrition_access,created_at,scope) VALUES('rogue-link',?,?,1,0,'2026-01-01','care')").run(client.userId,rogue.email);
 assert.equal(await careStore(f.db,config).staffFor(rogue.email),null);
 const role=staffRoleGuard(rogue.email,'clinician',config);assert.equal(f.sql.prepare('SELECT CASE WHEN '+role.sql+' THEN 1 ELSE 0 END AS n').get(...role.args).n,0);
 const link=careConnectionGuard({clientId:client.userId,email:rogue.email,role:'clinician',grant:'medical_access'},config);assert.equal(f.sql.prepare('SELECT CASE WHEN '+link.sql+' THEN 1 ELSE 0 END AS n').get(...link.args).n,0);
 assert.equal(wellnessWriteGuard(rogue,client.userId,'return',config).sql,'0=1');
 await assert.rejects(()=>passportStore(f.db,config).get(rogue,client.userId),e=>e.status===403);
});
test('disabled operations staff is denied staff fallback and operation scheduling keeps clinical channels closed',async t=>{
 const f=platform(t);await f.connect();const u=operations[0];
 f.sql.prepare("INSERT INTO care_staff(email,name,role,active,updated_at) VALUES(?,'Shira','coordinator',0,'2026-01-01')").run(u.email);
 assert.equal(await careStore(f.db,config).staffFor(u.email),null);
 const guard=staffRoleGuard(u.email,'coordinator',config);assert.equal(f.sql.prepare('SELECT CASE WHEN '+guard.sql+' THEN 1 ELSE 0 END AS n').get(...guard.args).n,0);
 f.sql.exec('UPDATE care_staff SET active=1');
 f.sql.prepare("INSERT INTO care_connections(id,client_id,staff_email,medical_access,nutrition_access,created_at,scope) VALUES('schedule',?,?,0,0,'2026-01-01','coordinator')").run(client.userId,u.email);
 assert.equal((await messagingStore(f.db,config).list(u,client.userId,'scheduling')).messages.length,0);
 await assert.rejects(()=>messagingStore(f.db,config).list(u,client.userId,'medical'),e=>e.status===403);
});
