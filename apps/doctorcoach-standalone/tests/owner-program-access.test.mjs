import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,doctor,coach,client,stranger} from './platform-db.mjs';
import {careStore} from '../lib/care-store.ts';
import {trainingStore} from '../lib/training-store.ts';
import {trainingAccess} from '../lib/training-access.ts';
import {defaultPrescription} from '../lib/training.ts';
import {coachDraftStore} from '../lib/coach-drafts.ts';
const config={adminEmails:doctor.email,clinicianEmails:doctor.email,ownerProgramEmails:doctor.email};
const program=()=>({id:randomUUID(),title:'Owner program',items:[{...defaultPrescription('leg-press'),reps:6,repsMax:8,weight:20,targetRpe:8,tempo:{eccentric:3,bottom:0,concentric:2,top:0}}]});
async function fixture(t){const f=platform(t);await f.connect();return {...f,care:careStore(f.db,config),training:trainingStore(f.db,config)};}

test('configured physician-owner can draft, assign and run a client program without changing roles',async t=>{
 const f=await fixture(t);const bundle=await f.care.bundle(doctor,client.userId);assert.equal(bundle.viewerRole,'clinician');assert.equal(bundle.canManagePrograms,true);assert.equal(bundle.canManageTeamAssignments,true);
 const p=program(),drafts=coachDraftStore(f.db,f.care);await drafts.save(doctor,client.userId,{action:'save',version:0,requestId:p.id,title:p.title,items:p.items,revisionOf:null});
 assert.deepEqual((await drafts.get(doctor,client.userId)).draft.items,p.items.map(i=>({...i,occurrenceId:`1:${i.exerciseId}`,effortScale:'rpe',workoutSection:'main',weightUnspecified:false})));
 await f.care.assign(doctor,client.userId,p);assert.equal((await trainingAccess(f.db,client.userId,config)).canStart,true);
 const trainee=(await f.training.getPlan(client.userId))[0];assert.equal(trainee.repsMax,8);
 let s=await f.training.start(client.userId,{requestId:randomUUID(),before:0});
 s=await f.training.patch(client.userId,{id:s.id,version:s.version,action:'set',exerciseId:'leg-press',setIndex:0,done:true,amount:7,weight:20,actualRpe:8});
 assert.equal(s.completedSets,1);assert.equal(s.items[0].repsMax,8);
 assert.equal((await f.care.staffFor(doctor.email)).role,'clinician');assert.equal((await f.care.staffFor(coach.email)).role,'coach');
});
test('nonowner clinician and coordinator gain no authoring permission',async t=>{
 const f=await fixture(t);const clinician={userId:'other-doctor',email:'other-doctor@example.test'},coordinator={userId:'coord',email:'coord@example.test'};
 await f.care.saveStaff(doctor,{...clinician,name:'Other physician',role:'clinician',active:true});await f.care.saveStaff(doctor,{...coordinator,name:'Coordinator',role:'coordinator',active:true});
 const invite=await f.care.createInvite(doctor,{emails:[doctor.email,clinician.email,coordinator.email]});await f.care.acceptInvite(client,{code:invite.code,consent:true});
 assert.equal((await f.care.bundle(clinician,client.userId)).canManagePrograms,false);
 for(const user of [clinician,coordinator])await assert.rejects(()=>f.care.assign(user,client.userId,program()),e=>e.status===403);
 await assert.rejects(()=>coachDraftStore(f.db,f.care).save(clinician,client.userId,{action:'discard',version:0}),e=>e.status===403);
 assert.equal((await f.care.bundle(coach,client.userId)).canManagePrograms,true);
});
test('revoked connection or disabled owner blocks program access and new sets',async t=>{
 const f=await fixture(t);await f.care.assign(doctor,client.userId,program());const s=await f.training.start(client.userId,{requestId:randomUUID(),before:0});
 f.sql.prepare("INSERT INTO care_staff(email,name,role,active,updated_at) VALUES(?,'Owner','clinician',0,'2026-01-01')").run(doctor.email);
 assert.equal((await trainingAccess(f.db,client.userId,config)).canStart,false);
 await assert.rejects(()=>f.training.patch(client.userId,{id:s.id,version:s.version,action:'set',exerciseId:'leg-press',setIndex:0,done:true,amount:6,weight:20,actualRpe:8}),e=>e.status===403);
 await f.training.patch(client.userId,{id:s.id,version:s.version,action:'cancel'});
 f.sql.prepare('UPDATE care_staff SET active=1 WHERE email=?').run(doctor.email);f.sql.prepare('UPDATE care_connections SET active=0 WHERE client_id=? AND staff_email=?').run(client.userId,doctor.email);
 assert.equal((await trainingAccess(f.db,client.userId,config)).canStart,false);
 await assert.rejects(()=>f.care.assign(doctor,client.userId,program()),e=>e.status===403);
});
test('owner scope is rechecked inside assignment batch',async t=>{
 const f=await fixture(t);const p=program(),batch=f.db.batch.bind(f.db);f.db.batch=async statements=>{f.sql.prepare('UPDATE care_connections SET active=0 WHERE client_id=? AND staff_email=?').run(client.userId,doctor.email);return batch(statements);};
 await assert.rejects(()=>f.care.assign(doctor,client.userId,p),e=>e.status===409);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM care_programs').get().n,0);
});
test('targeted assignment invitation grants nothing until the designated client consents',async t=>{
 const f=await fixture(t);const second={userId:'second-coach',email:'second-coach@example.test'};await f.care.saveStaff(doctor,{...second,name:'Second coach',role:'coach',active:true});
 const invite=await f.care.createInvite(doctor,{clientId:client.userId,emails:[second.email]});
 await assert.rejects(()=>f.care.authorize(second,client.userId),e=>e.status===403);
 await assert.rejects(()=>f.care.previewInvite(stranger,{code:invite.code}),e=>e.status===404);
 await assert.rejects(()=>f.care.acceptInvite(stranger,{code:invite.code,consent:true}),e=>e.status===404);
 const preview=await f.care.previewInvite(client,{code:invite.code});assert.ok(preview.staff.some(s=>s.email===second.email));assert.ok(preview.staff.some(s=>s.email===doctor.email));
 await f.care.acceptInvite(client,{code:invite.code,consent:true});assert.equal((await f.care.authorize(second,client.userId)).program,true);assert.equal((await f.care.authorize(second,client.userId)).medical,false);
 await f.care.assign(second,client.userId,program());assert.equal((await trainingAccess(f.db,client.userId,config)).canStart,true);
});
test('targeted invitation cannot be made by a coach or for an unrelated client',async t=>{
 const f=await fixture(t);
 await assert.rejects(()=>f.care.createInvite(coach,{clientId:client.userId,emails:[coach.email]}),e=>e.status===403);
 await assert.rejects(()=>f.care.createInvite(doctor,{clientId:stranger.userId,emails:[coach.email]}),e=>e.status===403);
});
