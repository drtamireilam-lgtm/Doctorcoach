import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,doctor,coach,client} from './platform-db.mjs';
import {nutritionServicesStore} from '../lib/nutrition-services-store.ts';
import {nutritionRevenuePreview} from '../lib/nutrition-commercial.ts';
import {servicesStore} from '../lib/services-store.ts';
const lior={userId:'lior-test',email:'lior@example.test'};
const offer=(patch={})=>({id:randomUUID(),title:'ייעוץ תזונה אישי',description:'פגישה עם ליאור לפי מטרות המתאמן',provider:'lior',format:'video',durationMinutes:45,priceAgorot:40000,priceConfirmed:true,status:'listed',bookingUrl:'',version:0,...patch});
async function fixture(t){const f=platform(t);await f.care.saveStaff(doctor,{email:lior.email,name:'ליאור',role:'dietitian',active:true});return {...f,nutrition:nutritionServicesStore(f.db,{liorEmail:lior.email})};}
test('80/20 proposal uses integer agorot and leaves the application share unallocated',()=>{
 assert.deepEqual(nutritionRevenuePreview(40000),{grossAgorot:40000,providerAgorot:32000,platformAgorot:8000,platformBasisPoints:2000,state:'proposal'});
 for(const n of [0,1,49999,1000000]){const split=nutritionRevenuePreview(n);assert.equal(split.platformAgorot+split.providerAgorot,n);assert.ok(Number.isSafeInteger(split.platformAgorot));}
 for(const n of [-1,0.5,NaN,Infinity,1000001])assert.throws(()=>nutritionRevenuePreview(n));
});
test('only configured active dietitian manages Lior services, with no fixed offers or unrelated service access',async t=>{
 const f=await fixture(t);assert.deepEqual(await f.nutrition.list(lior),[]);
 for(const user of [null,coach,client,doctor])await assert.rejects(()=>f.nutrition.save(user,offer()));
 const saved=await f.nutrition.save(lior,offer());assert.equal(saved.provider,'lior');assert.equal((await f.nutrition.list(lior)).length,1);
 await assert.rejects(()=>f.nutrition.save(lior,offer({provider:'tamir'})),e=>e.status===403);
 await assert.rejects(()=>f.nutrition.save(lior,offer({id:'medical-video'})),e=>e.status===403);
 await assert.rejects(()=>nutritionServicesStore(f.db).list(lior),e=>e.status===403);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM care_connections').get().n,0);
});
test('confirmed Lior service can receive a nutrition appointment request with a server-owned price snapshot',async t=>{
 const f=await fixture(t);const s=await f.nutrition.save(lior,offer());assert.ok((await servicesStore(f.db).listPublic()).some(x=>x.id===s.id));
 const request={id:randomUUID(),clientName:'בדיקת מתאמן',serviceId:s.id,preference:'יום ראשון אחר הצהריים',expectedPrice:40000};const appointment=await f.appointments.create(client,request);assert.equal(appointment.provider,'lior');assert.equal(appointment.priceAgorot,40000);
 await f.nutrition.save(lior,{...s,priceAgorot:45000});assert.equal(f.sql.prepare('SELECT price_agorot price FROM care_appointments WHERE id=?').get(appointment.id).price,40000);
 await assert.rejects(()=>f.appointments.create(client,{...request,id:randomUUID()}),e=>e.status===409);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM coach_monthly_charges').get().n,0);
});
test('dietitian deactivation at the persistence boundary cannot change a saved price',async t=>{
 const f=await fixture(t),s=await f.nutrition.save(lior,offer()),prepare=f.db.prepare.bind(f.db);let fired=false;
 f.db.prepare=q=>{if(q.startsWith('UPDATE consultation_services')&&!fired){fired=true;f.sql.prepare('UPDATE care_staff SET active=0 WHERE email=?').run(lior.email);}return prepare(q);};
 await assert.rejects(()=>f.nutrition.save(lior,{...s,priceAgorot:90000}),e=>e.status===403);assert.equal(f.sql.prepare('SELECT price_agorot price FROM consultation_services WHERE id=?').get(s.id).price,40000);
});
test('draft offers remain private; stale editor versions do not overwrite another price',async t=>{
 const f=await fixture(t),s=await f.nutrition.save(lior,offer({status:'draft',priceConfirmed:false}));assert.equal((await servicesStore(f.db).listPublic()).some(x=>x.id===s.id),false);
 await f.nutrition.save(lior,{...s,priceAgorot:45000});await assert.rejects(()=>f.nutrition.save(lior,{...s,priceAgorot:50000}),e=>e.status===409);
});

test('Lior dietitian role shares only authorized nutrition, without medical or program-author privileges',async t=>{
 const f=await fixture(t);await f.connect();const invite=await f.care.createInvite(doctor,{emails:[doctor.email,lior.email]});await f.care.acceptInvite(client,{code:invite.code,consent:true});const bundle=await f.care.bundle(lior,client.userId);assert.equal(bundle.canViewNutrition,true);assert.equal(bundle.canViewMedical,false);assert.equal(bundle.canManagePrograms,false);assert.equal(bundle.profile.medical,undefined);
});
