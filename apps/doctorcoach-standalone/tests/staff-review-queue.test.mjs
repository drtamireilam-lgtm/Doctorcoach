import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,client,coach,stranger,doctor} from './platform-db.mjs';
import {defaultPrescription} from '../lib/training.ts';
import {staffReviewQueueStore} from '../lib/staff-review-queue.ts';
async function fixture(t){const f=platform(t);await f.connect();const queue=staffReviewQueueStore(f.db,{adminEmails:doctor.email,clinicianEmails:doctor.email});await f.training.savePlan(client.userId,{...defaultPrescription('goblet'),sets:1,reps:8,weight:20});let session=await f.training.start(client.userId,{requestId:randomUUID(),before:0});session=await f.training.patch(client.userId,{action:'set',id:session.id,version:session.version,exerciseId:'goblet',setIndex:0,done:true,amount:8,weight:20,actualRpe:8,painDuring:3});session=await f.training.patch(client.userId,{action:'finish',id:session.id,version:session.version,after:2,feedback:{effort:7,note:'note for team'}});return {f,queue,session};}
test('assigned coach sees completed workout flags and exact details, without medical profile or file keys',async t=>{
 const {queue,session}=await fixture(t);const result=await queue.list(coach),item=result.items.find(i=>i.id===session.id);assert.equal(item.pain,3);assert.equal(item.note,'note for team');assert.equal(item.reviewedAt,null);assert.equal(JSON.stringify(result).includes('medicalHistory'),false);assert.equal(JSON.stringify(result).includes('object_key'),false);assert.equal((await queue.session(coach,session.id)).session.id,session.id);
});
test('acknowledgment is per reviewer and source version, never a workout edit or message',async t=>{
 const {f,queue,session}=await fixture(t);const request={id:session.id,version:session.version,confirmed:true};await queue.review(coach,request);
 assert.ok((await queue.list(coach)).items.find(i=>i.id===session.id).reviewedAt);assert.equal((await queue.list(doctor)).items.find(i=>i.id===session.id).reviewedAt,null);
 assert.equal(f.sql.prepare('SELECT version FROM training_sessions WHERE id=?').get(session.id).version,session.version);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM team_messages').get().n,0);
 f.sql.prepare('UPDATE training_sessions SET version=version+1 WHERE id=?').run(session.id);assert.equal((await queue.list(coach)).items.find(i=>i.id===session.id).reviewedAt,null);await assert.rejects(()=>queue.review(coach,request),e=>e.status===409);
});
test('unassigned coach, trainee, coordinator and operations-only admin cannot open or mark workouts',async t=>{
 const {f,queue,session}=await fixture(t);for(const [person,role] of [[stranger,'coach'],[{userId:'coord',email:'coord@example.test'},'coordinator']])await f.care.saveStaff(doctor,{email:person.email,name:'test staff',role,active:true});
 for(const person of [stranger,client,{userId:'coord',email:'coord@example.test'}]){await assert.rejects(()=>queue.session(person,session.id));await assert.rejects(()=>queue.review(person,{id:session.id,version:session.version,confirmed:true}));}
 assert.deepEqual((await queue.list(stranger)).items,[]);
 const adminOnly=staffReviewQueueStore(f.db,{adminEmails:'admin@example.test'});await assert.rejects(()=>adminOnly.list({userId:'admin',email:'admin@example.test'}),e=>e.status===403);
});
test('revoked association, staff role or required consent hides data and blocks acknowledgement',async t=>{
 for(const revoke of ['link','role','consent']){
 const {f,queue,session}=await fixture(t);
 if(revoke==='link')f.sql.prepare('UPDATE care_connections SET active=0 WHERE client_id=? AND staff_email=?').run(client.userId,coach.email);
 if(revoke==='role')f.sql.prepare('UPDATE care_staff SET active=0 WHERE email=?').run(coach.email);
 if(revoke==='consent')f.sql.prepare("DELETE FROM user_consents WHERE user_id=? AND consent_id='health'").run(client.userId);
 if(revoke==='role')await assert.rejects(()=>queue.list(coach));else assert.deepEqual((await queue.list(coach)).items,[]);
 await assert.rejects(()=>queue.session(coach,session.id));await assert.rejects(()=>queue.review(coach,{id:session.id,version:session.version,confirmed:true}));
 }
});
test('videos require current media consent and actual feedback removes them from queue',async t=>{
 const {f,queue}=await fixture(t);const id=randomUUID();f.sql.prepare("INSERT INTO media_assets(id,owner_id,kind,exercise_id,caption,mime,bytes,object_key,status,created_at) VALUES(?,?,'review','goblet','private','video/mp4',32,'private-key','ready','2026-10-16')").run(id,client.userId);
 assert.ok((await queue.list(coach)).items.some(i=>i.id===id));await f.media.feedback(coach,{id:randomUUID(),assetId:id,content:'בדקתי את הסרטון'});assert.equal((await queue.list(coach)).items.some(i=>i.id===id),false);f.sql.prepare('DELETE FROM media_feedback WHERE asset_id=?').run(id);f.sql.prepare("DELETE FROM user_consents WHERE user_id=? AND consent_id='media'").run(client.userId);assert.equal((await queue.list(coach)).items.some(i=>i.id===id),false);
});
test('acknowledgment requires explicit confirmation and a completed current source',async t=>{
 const {queue,session}=await fixture(t);await assert.rejects(()=>queue.review(coach,{id:session.id,version:session.version}));await assert.rejects(()=>queue.review(coach,{id:randomUUID(),version:1,confirmed:true}));
});

test('guards are checked in the final read and write even if a role is revoked after initial lookup',async t=>{
 for(const operation of ['list','session','review']){
 const {f,queue,session}=await fixture(t),prepare=f.db.prepare.bind(f.db);let fired=false;
 f.db.prepare=q=>{const statement=prepare(q);if(!q.startsWith('SELECT email,name,role,active FROM care_staff'))return statement;return {bind(...args){const bound=statement.bind(...args);return {...bound,async first(){const row=await bound.first();if(!fired){fired=true;f.sql.prepare('UPDATE care_connections SET active=0 WHERE staff_email=?').run(coach.email);}return row;}};}};};
 if(operation==='list')assert.deepEqual((await queue.list(coach)).items,[]);
 else if(operation==='session')await assert.rejects(()=>queue.session(coach,session.id));
 else await assert.rejects(()=>queue.review(coach,{id:session.id,version:session.version,confirmed:true}));
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM staff_workout_reviews').get().n,0);
 }
});

test('actual check-in response removes the pending report; workout review does not resolve it',async t=>{
 const {f,queue,session}=await fixture(t),id=randomUUID();await f.care.checkin(client,{id,sessions:1,pain:4,functionScore:6,effort:7,content:'דיווח לבדיקה'});
 assert.ok((await queue.list(coach)).items.some(i=>i.id===id&&i.kind==='checkin'));
 await queue.review(coach,{id:session.id,version:session.version,confirmed:true});assert.ok((await queue.list(coach)).items.some(i=>i.id===id));
 await f.care.reviewCheckin(coach,client.userId,{id,response:'קראתי את הדיווח ונמשיך מעקב'});assert.equal((await queue.list(coach)).items.some(i=>i.id===id),false);
});
