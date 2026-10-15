import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,doctor,coach,client,stranger} from './platform-db.mjs';
import {customExercisesStore,availableCustomExercises,parseCustomExercise} from '../lib/custom-exercises.ts';
import {customPrescription,programItemsForWrite} from '../lib/custom-exercise-types.ts';
import {readPayload} from '../lib/api-helpers.ts';
import {careStore} from '../lib/care-store.ts';
import {coachDraftStore} from '../lib/coach-drafts.ts';
import {trainingStore} from '../lib/training-store.ts';
import {favoritesStore} from '../lib/favorites-store.ts';
import {exercises} from '../lib/content.ts';
import {detectImportColumns,extractImportRows,finalizeImport,matchImportExercise} from '../lib/program-import.ts';
import {exerciseFamily} from '../lib/exercise-families.ts';
const config={ownerProgramEmails:doctor.email,clinicianEmails:doctor.email,adminEmails:doctor.email};
const payload=()=>({requestId:randomUUID(),name:'תרגיל אישי לבדיקה',en:'Custom Test Row',group:'גב',equipment:'כבל וספסל',family:'חתירה',kind:'רגיל',unit:'reps',desc:'תנועה מבוקרת עם תמיכת הגוף וללא תנופה.',aliases:['Special Row'],videoUrl:''});
async function fixture(t){const f=platform(t);await f.connect();return {...f,custom:customExercisesStore(f.db,config),care:careStore(f.db,config),training:trainingStore(f.db,config)};}
test('private creation is owner scoped, idempotent and disabled/noncoach identities cannot create',async t=>{
 const f=await fixture(t),p=payload(),e=await f.custom.create(coach,p);assert.equal(e.id,'custom-'+p.requestId);assert.deepEqual(await f.custom.create(coach,p),e);await assert.rejects(()=>f.custom.create(coach,{...p,desc:'Different exercise description'}),e=>e.status===409);
 assert.equal((await f.custom.list(coach)).items.length,1);assert.equal((await f.custom.list(client)).items.length,0);assert.equal((await f.custom.list(doctor)).items.length,0);await assert.rejects(()=>f.custom.create(client,payload()),e=>e.status===403);
 f.sql.exec("UPDATE care_staff SET active=0 WHERE role='coach'");await assert.rejects(()=>f.custom.create(coach,payload()),e=>e.status===403);assert.equal((await f.custom.list(coach)).canCreate,false);
});
test('publication requires owner clinician approval and optimistic version',async t=>{
 const f=await fixture(t),e=await f.custom.create(coach,payload());await assert.rejects(()=>f.custom.status(client,{action:'request',id:e.id,version:1}),e=>e.status===403);await f.custom.status(coach,{action:'request',id:e.id,version:1});
 assert.equal((await f.custom.list(doctor)).items[0].state,'pending');assert.equal((await f.custom.list(stranger)).items.length,0);await assert.rejects(()=>f.custom.status(coach,{action:'publish',id:e.id,version:2}),e=>e.status===403);await assert.rejects(()=>f.custom.status(doctor,{action:'publish',id:e.id,version:1}),e=>e.status===409);
 await f.custom.status(doctor,{action:'publish',id:e.id,version:2});assert.equal((await f.custom.list(stranger)).items[0].state,'published');assert.equal((await availableCustomExercises(f.db,stranger.userId))[0].id,e.id);
});
test('private custom program saves to draft, assigns, executes and preserves authoritative instructions',async t=>{
 const f=await fixture(t),e=await f.custom.create(coach,payload()),p={id:randomUUID(),title:'תוכנית אישית לבדיקה',items:[{...customPrescription(e),targetRpe:8,reps:6,repsMax:8,customExercise:{...e,name:'Forged name'}}]};
 await assert.rejects(()=>f.care.assign(doctor,client.userId,p)); // Other coaches cannot import a private definition until assigned here.
 const drafts=coachDraftStore(f.db,f.care);await drafts.save(coach,client.userId,{...p,requestId:p.id,action:'save',version:0,revisionOf:null});assert.equal((await drafts.get(coach,client.userId)).draft.items[0].customExercise.name,e.name);
 await f.care.assign(coach,client.userId,p);assert.equal((await f.training.getPlan(client.userId))[0].customExercise.name,e.name);assert.ok((await availableCustomExercises(f.db,doctor.userId,client.userId)).some(x=>x.id===e.id));
 let s=await f.training.start(client.userId,{requestId:randomUUID(),before:0});assert.equal(s.items[0].name,e.name);assert.equal(s.items[0].customExercise.desc,e.desc);s=await f.training.patch(client.userId,{id:s.id,version:s.version,action:'set',exerciseId:e.id,setIndex:0,done:true,amount:7,weight:10,actualRpe:8});s=await f.training.patch(client.userId,{id:s.id,version:s.version,action:'finish',after:0});assert.equal(s.status,'completed');assert.equal((await f.training.feed(client.userId)).history[0].items[0].customExercise.en,e.en);
 const video=await f.media.initialize(client,{id:randomUUID(),kind:'review',exerciseId:e.id,sessionId:s.id,setIndex:0,caption:'סרטון סט לבדיקה',mime:'video/mp4',bytes:32});f.sql.prepare("UPDATE media_assets SET status='ready' WHERE id=?").run(video.id);assert.equal((await f.media.list(client,'review'))[0].exerciseName,e.name);
 const fav=favoritesStore(f.db);assert.ok((await fav.set(client.userId,{exerciseId:e.id,favorite:true})).includes(e.id));assert.equal((await f.custom.list(stranger)).items.length,0);
});
test('unknown or another coach private ID cannot be forged into assignments or independent plans',async t=>{
 const f=await fixture(t),e=await f.custom.create(coach,payload());await assert.rejects(()=>f.training.savePlan(stranger.userId,customPrescription(e)));await assert.rejects(()=>f.care.assign(coach,client.userId,{id:randomUUID(),title:'Forged program',items:[{...customPrescription(e),exerciseId:'custom-'+randomUUID(),targetRpe:8}]}));
 await assert.rejects(()=>favoritesStore(f.db).set(stranger.userId,{exerciseId:e.id,favorite:true}));
});
test('published custom definitions support independent plans, workout history and safe removal',async t=>{
 const f=await fixture(t),e=await f.custom.create(doctor,{...payload(),unit:'seconds'});await f.custom.status(doctor,{action:'request',id:e.id,version:1});await f.custom.status(doctor,{action:'publish',id:e.id,version:2});
 const item=await f.training.savePlan(client.userId,{...customPrescription(e),customExercise:{...e,desc:'Forged client text'}});assert.equal(item.customExercise.desc,e.desc);assert.equal(item.unit,'seconds');assert.equal((await f.training.getPlan(client.userId))[0].customExercise.id,e.id);
 await f.training.removePlan(client.userId,{exerciseId:e.id});assert.equal((await f.training.savePlan(client.userId,{exerciseId:e.id})).unit,'seconds');
 const s=await f.training.start(client.userId,{requestId:randomUUID(),before:0});assert.equal(s.items[0].name,e.name);await f.training.patch(client.userId,{id:s.id,version:s.version,action:'cancel'});await f.training.removePlan(client.userId,{exerciseId:e.id});assert.equal((await f.training.getPlan(client.userId)).length,0);
});
test('import uses a custom alias and preserves timing, family and source dose',()=>{
 const e=parseCustomExercise({...payload(),unit:'seconds',kind:'מתיחה'},'custom-'+randomUUID()),catalog=[...exercises,e],c=value=>({value,formula:false}),sheet={name:'A',rows:[['Exercise','Sets','Reps'].map(c),['Special Row','2','30'].map(c)]};assert.equal(matchImportExercise('Special Row',catalog),e.id);assert.equal(exerciseFamily(e),'חתירה');const d=detectImportColumns(sheet),rows=extractImportRows(sheet,d.header,d.mapping,{catalog});const item=finalizeImport(rows,catalog)[0];assert.equal(item.unit,'seconds');assert.equal(item.reps,30);assert.equal(item.workoutSection,'stretch');assert.equal(item.customExercise.desc,e.desc);
 assert.throws(()=>parseCustomExercise({...payload(),videoUrl:'javascript:alert(1)'},e.id));assert.throws(()=>parseCustomExercise({...payload(),aliases:Array(13).fill('x')},e.id));
});
test('disabled owner or changed coach role is rechecked inside creation write',async t=>{
 const f=await fixture(t),base=f.db.prepare.bind(f.db);let raced=false;f.db.prepare=query=>{if(query.startsWith('INSERT INTO custom_exercises')&&!raced){raced=true;f.sql.exec("UPDATE care_staff SET role='clinician' WHERE role='coach'");}return base(query);};await assert.rejects(()=>f.custom.create(coach,payload()));assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM custom_exercises').get().n,0);
});
test('private definitions cannot get public demonstration assets before library approval',async t=>{
 const f=await fixture(t),e=await f.custom.create(doctor,payload()),v={id:randomUUID(),kind:'demo',exerciseId:e.id,caption:'הדגמה כללית לבדיקה',mime:'video/mp4',bytes:32};await assert.rejects(()=>f.media.initialize(doctor,v),e=>e.status===403);await f.custom.status(doctor,{action:'request',id:e.id,version:1});await f.custom.status(doctor,{action:'publish',id:e.id,version:2});assert.ok((await f.media.initialize(doctor,v)).id);
});
test('moderation list hides another creator pending definitions when owner role is revoked during read',async t=>{
 const f=await fixture(t),e=await f.custom.create(coach,payload());await f.custom.status(coach,{action:'request',id:e.id,version:1});const base=f.db.prepare.bind(f.db);let raced=false;f.db.prepare=query=>{if(query.startsWith('SELECT id,owner_id,definition_json,state,version')&&!raced){raced=true;f.sql.prepare("INSERT INTO care_staff(email,name,role,active,updated_at) VALUES(?,'owner','clinician',0,'2026-01-01')").run(doctor.email);}return base(query);};const result=await f.custom.list(doctor);assert.equal(result.canApprove,false);assert.deepEqual(result.items,[]);
});
test('30 custom prescriptions fit the program write path without echoing definition snapshots',async()=>{
 const e=parseCustomExercise({...payload(),desc:'x'.repeat(2000)},'custom-'+randomUUID()),items=Array.from({length:30},()=>({...customPrescription(e),notes:'n'.repeat(500),targetRpe:8})),body=JSON.stringify({items:programItemsForWrite(items)});assert.ok(body.length<64000);assert.ok(body.length>16000);assert.ok(!body.includes('customExercise'));assert.equal(items[0].customExercise.desc.length,2000);const req=()=>new Request('https://example.test/api/care/team',{method:'POST',headers:{'Content-Type':'application/json'},body});await assert.rejects(()=>readPayload(req()),e=>e.status===413);assert.equal((await readPayload(req(),64000)).items.length,30);
});
test('configured coordinators do not gain creation permission from a legacy coach role row',async t=>{
 const f=await fixture(t),store=customExercisesStore(f.db,{...config,operationsEmails:coach.email});assert.equal((await store.list(coach)).canCreate,false);await assert.rejects(()=>store.create(coach,payload()),e=>e.status===403);
});
