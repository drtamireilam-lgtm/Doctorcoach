import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,coach,client,doctor,stranger} from './platform-db.mjs';
import {coachDraftStore} from '../lib/coach-drafts.ts';
import {defaultPrescription} from '../lib/training.ts';
const payload=()=>({action:'save',version:0,requestId:randomUUID(),title:'טיוטה פרטית',items:[{...defaultPrescription('goblet'),dayId:'2',targetRpe:8,effortScale:'rir',approvedSubstitutions:['bench']}],revisionOf:null});
async function fixture(t){const f=platform(t);await f.connect();return {...f,drafts:coachDraftStore(f.db,f.care)};}

test('draft survives store reload without creating a program or exposing it to the trainee',async t=>{
 const f=await fixture(t),p=payload();const saved=await f.drafts.save(coach,client.userId,p);
 assert.equal(saved.version,1);assert.equal(saved.draft.items[0].dayId,'2');assert.equal(saved.draft.items[0].effortScale,'rir');
 assert.deepEqual(await coachDraftStore(f.db,f.care).get(coach,client.userId),saved);
 assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM care_programs').get().n,0);
 const own=await f.care.bundle(client,client.userId);assert.equal(own.programs.length,0);assert.ok(!JSON.stringify(own).includes('טיוטה פרטית'));
});
test('only the authoring linked coach can see a draft; all other roles are denied',async t=>{
 const f=await fixture(t);await f.drafts.save(coach,client.userId,payload());
 for(const user of [client,doctor,stranger]){await assert.rejects(()=>f.drafts.get(user,client.userId),e=>e.status===403);await assert.rejects(()=>f.drafts.save(user,client.userId,payload()),e=>e.status===403);}
 const other={userId:'coach-two',email:'coach-two@example.test'};
 await f.care.saveStaff(doctor,{...other,name:'מאמן נוסף',role:'coach',active:true});
 const invite=await f.care.createInvite(doctor,{emails:[doctor.email,other.email]});await f.care.acceptInvite(client,{code:invite.code,consent:true});
 assert.equal((await f.drafts.get(other,client.userId)).draft,null);
 await f.drafts.save(other,client.userId,{...payload(),title:'טיוטה אחרת'});
 assert.equal((await f.drafts.get(coach,client.userId)).draft.title,'טיוטה פרטית');
});
test('stale saves and deletes conflict and cleared drafts retain their version',async t=>{
 const f=await fixture(t),p=payload();await f.drafts.save(coach,client.userId,p);
 await assert.rejects(()=>f.drafts.save(coach,client.userId,p),e=>e.status===409);
 await f.drafts.save(coach,client.userId,{...p,version:1,title:'עדכון'});
 await assert.rejects(()=>f.drafts.save(coach,client.userId,{action:'discard',version:1}),e=>e.status===409);
 const cleared=await f.drafts.save(coach,client.userId,{action:'discard',version:2});assert.equal(cleared.draft,null);assert.equal(cleared.version,3);
 await assert.rejects(()=>f.drafts.save(coach,client.userId,p),e=>e.status===409);
 const empty=await f.drafts.save(coach,client.userId,{...p,version:3,title:'',items:[]});assert.equal(empty.draft.items.length,0);
});
test('publishing clears only the exact saved draft version and leaves concurrent edits intact',async t=>{
 const f=await fixture(t),p=payload();await f.drafts.save(coach,client.userId,p);
 await f.care.assign(coach,client.userId,{id:p.requestId,title:p.title,items:p.items,draftVersion:1});
 assert.equal((await f.drafts.get(coach,client.userId)).draft,null);
 const p2=payload();await f.drafts.save(coach,client.userId,{...p2,version:2});
 await f.drafts.save(coach,client.userId,{...p2,version:3,title:'שינוי מחלון אחר'});
 await f.care.assign(coach,client.userId,{id:p2.requestId,title:p2.title,items:p2.items,draftVersion:3});
 assert.equal((await f.drafts.get(coach,client.userId)).draft.title,'שינוי מחלון אחר');
});
test('revoked access and invalid draft data cannot write',async t=>{
 const f=await fixture(t);
 await assert.rejects(()=>f.drafts.save(coach,client.userId,{...payload(),items:[{...defaultPrescription('goblet'),dayId:'9'}]}));
 const own=await f.care.bundle(client,client.userId);await f.care.revoke(client,{id:own.connections.find(c=>c.role==='coach').id});
 await assert.rejects(()=>f.drafts.get(coach,client.userId),e=>e.status===403);
 await assert.rejects(()=>f.drafts.save(coach,client.userId,payload()),e=>e.status===403);
});
test('publication failure leaves the saved draft intact',async t=>{
 const f=await fixture(t),p=payload();await f.drafts.save(coach,client.userId,p);
 f.sql.exec("CREATE TRIGGER draft_test_fail BEFORE INSERT ON audit_events BEGIN SELECT RAISE(ABORT,'synthetic failure'); END");
 await assert.rejects(()=>f.care.assign(coach,client.userId,{id:p.requestId,title:p.title,items:p.items,draftVersion:1}),/synthetic failure/);
 assert.equal((await f.drafts.get(coach,client.userId)).version,1);
 assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM care_programs').get().n,0);
});
