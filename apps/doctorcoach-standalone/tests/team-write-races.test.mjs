import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,doctor,coach,client,stranger} from './platform-db.mjs';
import {messagingStore} from '../lib/messaging-store.ts';
import {careStore} from '../lib/care-store.ts';
import {CONSENT_REVISION} from '../lib/intake.ts';
const config={adminEmails:doctor.email,clinicianEmails:doctor.email};
const diet={userId:'diet',email:'diet@example.test'},coord={userId:'coord',email:'coord@example.test'},otherDoctor={userId:'other-doctor',email:'other-doctor@example.test'};
const channels=['medical','training','nutrition','scheduling'];
async function fixture(t){
 const f=platform(t);await f.connect();const care=careStore(f.db,config);
 for(const [u,role] of [[diet,'dietitian'],[coord,'coordinator'],[otherDoctor,'clinician']])await care.saveStaff(doctor,{email:u.email,name:'צוות לבדיקה',role,active:true});
 const invitation=await care.createInvite(doctor,{emails:[doctor.email,coach.email,diet.email,coord.email,otherDoctor.email]});
 await care.acceptInvite(client,{code:invitation.code,consent:true});
 return {...f,care,messages:messagingStore(f.db,config)};
}
const staff=channel=>({medical:doctor,training:coach,nutrition:diet,scheduling:coord})[channel];
const message=(channel)=>({id:randomUUID(),clientId:client.userId,channel,content:'הודעת בדיקה'});
const note=(kind)=>({id:randomUUID(),kind,content:'הערה מקצועית',shared:false});
function beforeWrite(f,table,change){
 const prepare=f.db.prepare.bind(f.db);let fired=false;
 f.db.prepare=query=>{const stmt=prepare(query);if(!query.startsWith('INSERT INTO '+table))return stmt;
 return {bind(...values){const bound=stmt.bind(...values);const act=async method=>{if(!fired){fired=true;change();}return bound[method]();};return {...bound,first:()=>act('first'),run:()=>act('run')};}};
 };
}
const revoke=(f,u)=>f.sql.prepare('UPDATE care_connections SET active=0 WHERE client_id=? AND staff_email=?').run(client.userId,u.email);
const scope=(f,u)=>f.sql.prepare('UPDATE care_connections SET scope=? WHERE client_id=? AND staff_email=?').run(u===coord?'care':'coordinator',client.userId,u.email);
const grant=(f,u)=>f.sql.prepare('UPDATE care_connections SET medical_access=0,nutrition_access=0 WHERE client_id=? AND staff_email=?').run(client.userId,u.email);
const changeRole=(f,u)=>f.sql.prepare("INSERT INTO care_staff(email,name,role,active,updated_at) VALUES(?,'צוות',?,1,?) ON CONFLICT(email) DO UPDATE SET role=excluded.role").run(u.email,u===coord?'coach':'coordinator',new Date().toISOString());
const disable=(f,u)=>f.sql.prepare("INSERT INTO care_staff(email,name,role,active,updated_at) VALUES(?,'צוות','clinician',0,?) ON CONFLICT(email) DO UPDATE SET active=0").run(u.email,new Date().toISOString());
const withdraw=f=>f.sql.prepare('INSERT INTO user_consents(id,user_id,consent_id,revision,accepted,created_at) VALUES(?,?,?,?,0,?)').run(randomUUID(),client.userId,'health',CONSENT_REVISION,'2099-01-01');
test('staff messages cannot persist after concurrent revocation, role change, disablement or clinical consent withdrawal',async t=>{
 for(const channel of channels)for(const change of [revoke,scope,changeRole,disable,...(['medical','nutrition'].includes(channel)?[grant]:[]),...(channel==='scheduling'?[]:[withdraw])]){
 const f=await fixture(t),p=message(channel),u=staff(channel);
 beforeWrite(f,'team_messages',()=>change===withdraw?withdraw(f):change(f,u));
 await assert.rejects(()=>f.messages.send(u,p),err=>err.status===403);
 assert.equal(f.sql.prepare('SELECT id FROM team_messages WHERE id=?').get(p.id),undefined,channel+' '+change.name);
 }
});
test('trainee messages require a currently available recipient and current clinical consent',async t=>{
 for(const channel of channels)for(const consentLoss of [false,true]){
 if(channel==='scheduling'&&consentLoss)continue;
 const f=await fixture(t),p=message(channel);
 beforeWrite(f,'team_messages',()=>{if(consentLoss)withdraw(f);else f.sql.prepare('UPDATE care_connections SET active=0 WHERE client_id=?').run(client.userId);});
 await assert.rejects(()=>f.messages.send(client,p),err=>err.status===403);
 assert.equal(f.sql.prepare('SELECT id FROM team_messages WHERE id=?').get(p.id),undefined);
 }
});
test('professional notes atomically protect author access, consent and mentioned recipient',async t=>{
 for(const kind of ['medical','nutrition','training'])for(const change of [revoke,scope,changeRole,disable,...(kind==='training'?[]:[grant]),withdraw]){
 const f=await fixture(t),u=kind==='medical'?doctor:kind==='nutrition'?diet:coach,p=note(kind);
 beforeWrite(f,'care_notes',()=>change===withdraw?withdraw(f):change(f,u));
 await assert.rejects(()=>f.care.addNote(u,client.userId,p),err=>err.status===403);
 assert.equal(f.sql.prepare('SELECT id FROM care_notes WHERE id=?').get(p.id),undefined);
 }
 for(const change of [revoke,changeRole,disable]){
 const f=await fixture(t),p={...note('medical'),mentionEmail:otherDoctor.email};
 beforeWrite(f,'care_notes',()=>change(f,otherDoctor));
 await assert.rejects(()=>f.care.addNote(doctor,client.userId,p),err=>err.status===403);
 assert.equal(f.sql.prepare('SELECT id FROM care_notes WHERE id=?').get(p.id),undefined);
 }
});
test('scheduling remains independent of health consent while connections and scheduling role remain required',async t=>{
 const f=await fixture(t);withdraw(f);
 for(const u of [client,coord])await f.messages.send(u,message('scheduling'));
 assert.equal(f.sql.prepare("SELECT COUNT(*) AS total FROM team_messages WHERE channel='scheduling'").get().total,2);
 await assert.rejects(()=>f.messages.send(doctor,message('medical')),err=>err.status===403);
});
test('message and note retries are exact and owner scoped; conflicts cannot rewrite existing content',async t=>{
 const f=await fixture(t),p=message('medical'),n=note('medical');
 await f.messages.send(client,p);await f.messages.send(client,p);
 await assert.rejects(()=>f.messages.send(client,{...p,content:'תוכן אחר'}),err=>err.status===409);
 await assert.rejects(()=>f.messages.send(doctor,p),err=>err.status===409);
 await f.care.addNote(doctor,client.userId,n);await f.care.addNote(doctor,client.userId,n);
 for(const patch of [{content:'תוכן אחר'},{shared:true},{mentionEmail:otherDoctor.email}])await assert.rejects(()=>f.care.addNote(doctor,client.userId,{...n,...patch}),err=>err.status===409);
 await assert.rejects(()=>f.care.addNote(otherDoctor,client.userId,n),err=>err.status===409);
 await assert.rejects(()=>f.messages.send(stranger,p),err=>err.status===403);
 assert.equal(f.sql.prepare('SELECT COUNT(*) AS total FROM care_notes WHERE id=?').get(n.id).total,1);
 assert.equal(f.sql.prepare('SELECT COUNT(*) AS total FROM team_messages WHERE id=?').get(p.id).total,1);
});
test('staff read markers reject concurrent revocation while owners retain their existing conversation history',async t=>{
 const f=await fixture(t),p=message('medical');await f.messages.send(client,p);
 beforeWrite(f,'message_reads',()=>revoke(f,doctor));
 await assert.rejects(()=>f.messages.read(doctor,{clientId:client.userId,channel:'medical',messageId:p.id}),err=>err.status===403);
 assert.equal(f.sql.prepare('SELECT user_id FROM message_reads WHERE user_id=?').get(doctor.userId),undefined);
 await f.messages.read(client,{clientId:client.userId,channel:'medical',messageId:p.id});
 assert.equal((await f.messages.list(client,client.userId,'medical')).messages[0].id,p.id);
});
test('concurrent ID collisions cannot report another author message or note as a successful write',async t=>{
 for(const table of ['team_messages','care_notes']){
 const f=await fixture(t),p=table==='team_messages'?message('medical'):note('medical');
 beforeWrite(f,table,()=>{
 if(table==='team_messages')f.sql.prepare("INSERT INTO team_messages(id,client_id,channel,author_id,author_name,author_role,content,created_at) VALUES(?,?,'medical',?,'אחר','trainee','תוכן אחר',?)").run(p.id,client.userId,stranger.userId,new Date().toISOString());
 else f.sql.prepare("INSERT INTO care_notes(id,client_id,author_id,author_name,kind,content,shared,mention_email,created_at) VALUES(?,?,?,'אחר','medical','תוכן אחר',0,'',?)").run(p.id,client.userId,otherDoctor.userId,new Date().toISOString());
 });
 await assert.rejects(()=>table==='team_messages'?f.messages.send(client,p):f.care.addNote(doctor,client.userId,p),err=>err.status===409);
 assert.equal(f.sql.prepare('SELECT content FROM '+table+' WHERE id=?').get(p.id).content,'תוכן אחר');
 }
});
