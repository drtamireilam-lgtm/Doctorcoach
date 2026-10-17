import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,doctor,coach,client,verifySyntheticDietitian} from './platform-db.mjs';
import {nutritionCredentialStore,explicitNutritionPrescription} from '../lib/nutrition-authority.ts';
import {wellnessStore} from '../lib/wellness-store.ts';
import {communicationStore} from '../lib/communication-store.ts';
import {messagingStore} from '../lib/messaging-store.ts';
import {privateDocumentStore} from '../lib/private-document-store.ts';
import {todayIsrael} from '../lib/wellness.ts';
const diet={userId:'qualified-diet-test',email:'qualified@example.test'},config={adminEmails:doctor.email,clinicianEmails:doctor.email,ownerProgramEmails:doctor.email};
const plan=()=>({id:randomUUID(),kind:'plan',day:todayIsrael(),version:0,data:{mode:'flexible',principles:'תפריט אישי לבדיקה',trainingDay:'',restDay:''}});
async function fixture(t){const f=platform(t);await f.connect();await f.care.saveStaff(doctor,{email:diet.email,name:'דיאטן בדיקה',role:'dietitian',active:true});const invite=await f.care.createInvite(doctor,{emails:[doctor.email,coach.email,diet.email]});await f.care.acceptInvite(client,{code:invite.code,consent:true});return {...f,wellness:wellnessStore(f.db,config),credentials:nutritionCredentialStore(f.db,config)};}
test('role alone and client-side qualification claims cannot authorize a nutrition plan',async t=>{
 const f=await fixture(t);assert.equal((await f.wellness.bundle(diet,client.userId)).canPlan,false);
 for(const user of [coach,diet,client])await assert.rejects(()=>f.wellness.save(user,client.userId,{...plan(),verified:true,role:'dietitian'}),e=>e.status===403);
 assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM wellness_records WHERE kind='plan'").get().n,0);
});
test('only owner clinician can attest a qualification; qualified assigned dietitian can write, and revocation blocks edits',async t=>{
 const f=await fixture(t),payload={email:diet.email,reference:'SYNTHETIC-123',issuer:'Synthetic issuer',active:true,version:0,confirmed:true};
 for(const user of [coach,diet,client])await assert.rejects(()=>f.credentials.save(user,payload),e=>e.status===403);
 await assert.rejects(()=>f.credentials.save(doctor,{...payload,confirmed:false}));await f.credentials.save(doctor,payload);
 assert.equal((await f.wellness.bundle(diet,client.userId)).canPlan,true);const p=plan();await f.wellness.save(diet,client.userId,p);
 await f.credentials.save(doctor,{...payload,active:false,version:1});assert.equal((await f.wellness.bundle(diet,client.userId)).canPlan,false);
 await assert.rejects(()=>f.wellness.save(diet,client.userId,{...p,version:1}),e=>e.status===403);assert.equal((await f.wellness.bundle(client,client.userId)).records.filter(r=>r.kind==='plan').length,1);
});
test('qualification revoked at the persistence boundary leaves no new nutrition plan',async t=>{
 const f=await fixture(t);verifySyntheticDietitian(f,diet.email);const prepare=f.db.prepare.bind(f.db);let fired=false;
 f.db.prepare=q=>{if(q.startsWith('INSERT INTO wellness_records')&&!fired){fired=true;f.sql.prepare('UPDATE nutrition_credentials SET active=0 WHERE email=?').run(diet.email);}return prepare(q);};
 await assert.rejects(()=>f.wellness.save(diet,client.userId,plan()),e=>e.status===403);assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM wellness_records WHERE kind='plan'").get().n,0);
});
test('explicit meal-plan text is blocked through both message stores and ordinary exercise notes still work',async t=>{
 const f=await fixture(t);for(const store of [communicationStore(f.db,config),messagingStore(f.db,config)])await assert.rejects(()=>store.send(coach,{id:randomUUID(),clientId:client.userId,channel:'training',content:'תפריט יומי: 2000 קלוריות'}),e=>e.status===403);
 await communicationStore(f.db,config).send(coach,{id:randomUUID(),clientId:client.userId,channel:'training',content:'בצעו שלושה סטים של שמונה חזרות'});
 await assert.rejects(()=>f.care.addNote(coach,client.userId,{id:randomUUID(),kind:'training',content:'meal plan 2000 kcal',shared:true}),e=>e.status===403);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM team_messages').get().n,1);
});
test('a nutrition document name cannot bypass the training attachment route',async t=>{
 const f=await fixture(t);await assert.rejects(()=>privateDocumentStore(f.db,config).initialize(coach,{id:randomUUID(),clientId:client.userId,purpose:'message',channel:'training',filename:'meal-plan.pdf',mime:'application/pdf',bytes:100}),e=>e.status===403);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM private_documents').get().n,0);
});
test('explicit text detection normalizes simple invisible separators but does not claim image or semantic coverage',()=>{
 assert.equal(explicitNutritionPrescription('תפ\u200bריט יומי'),true);assert.equal(explicitNutritionPrescription('meal plan'),true);assert.equal(explicitNutritionPrescription('2000 kcal'),true);assert.equal(explicitNutritionPrescription('3 sets of squats'),false);
});
