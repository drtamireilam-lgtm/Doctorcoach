import test from 'node:test';
import assert from 'node:assert/strict';
import {platform,doctor,coach,client} from './platform-db.mjs';
import {importMappingsStore} from '../lib/import-mappings.ts';
import {rememberedImportMapping} from '../lib/import-mapping-types.ts';
import {customExercisesStore} from '../lib/custom-exercises.ts';
import {randomUUID} from 'node:crypto';
const config={ownerProgramEmails:doctor.email};
const save=(source='My Leg Curl',exerciseId='seated-curl',version=0)=>({action:'save',source,exerciseId,version});
test('import mappings persist per coach, normalize source names, support explicit revision and deletion',async t=>{
 const f=platform(t);await f.connect();const s=importMappingsStore(f.db,config);await s.write(coach,save());const first=await s.list(coach);assert.equal(first[0].exerciseId,'seated-curl');assert.equal(rememberedImportMapping(first,' MY LEG-CURL ').version,1);assert.deepEqual(await s.list(doctor),[]);
 await s.write(doctor,save('My Leg Curl','lying-curl'));assert.equal((await s.list(coach))[0].exerciseId,'seated-curl');
 await assert.rejects(()=>s.write(coach,save('my leg curl','lying-curl')),e=>e.status===409);await s.write(coach,save('my leg curl','lying-curl',1));assert.equal((await s.list(coach))[0].version,2);
 await assert.rejects(()=>s.write(coach,{action:'delete',source:'my leg curl',version:1}),e=>e.status===409);await s.write(coach,{action:'delete',source:'my leg curl',version:2});assert.deepEqual(await s.list(coach),[]);assert.equal((await s.list(doctor)).length,1);
});
test('only active program authors can read or save mappings, including owner fallback and operations override',async t=>{
 const f=platform(t);await f.connect();const s=importMappingsStore(f.db,config);await assert.rejects(()=>s.list(client),e=>e.status===403);await assert.rejects(()=>s.write(client,save()),e=>e.status===403);await s.write(doctor,save());
 f.sql.prepare("INSERT INTO care_staff(email,name,role,active,updated_at) VALUES(?,'owner','clinician',0,'now')").run(doctor.email);await assert.rejects(()=>s.list(doctor),e=>e.status===403);f.sql.exec("UPDATE care_staff SET active=0 WHERE role='coach'");await assert.rejects(()=>s.write(coach,save()),e=>e.status===403);
 f.sql.exec("UPDATE care_staff SET active=1 WHERE role='coach'");await assert.rejects(()=>importMappingsStore(f.db,{...config,operationsEmails:coach.email}).write(coach,save()),e=>e.status===403);
});
test('mapping write rechecks a revoked role and does not accept invented exercises or private definitions of others',async t=>{
 const f=platform(t);await f.connect();const s=importMappingsStore(f.db,config);await assert.rejects(()=>s.write(coach,save('x','unknown')),e=>e.status===403);
 const e=await customExercisesStore(f.db,config).create(doctor,{requestId:randomUUID(),name:'תרגיל אישית',en:'Private Example',group:'גב',equipment:'כבל',family:'חתירה',kind:'רגיל',unit:'reps',desc:'תנועה מבוקרת עם תמיכת הגוף וללא תנופה.',aliases:[],videoUrl:''});await assert.rejects(()=>s.write(coach,save('Custom',e.id)),e=>e.status===403);await s.write(doctor,save('Custom',e.id));assert.ok((await s.list(doctor)).some(r=>r.exerciseId===e.id));
 const base=f.db.prepare.bind(f.db);let raced=false;f.db.prepare=query=>{if(query.startsWith('INSERT INTO import_exercise_mappings')&&!raced){raced=true;f.sql.exec("UPDATE care_staff SET active=0 WHERE role='coach'");}return base(query);};await assert.rejects(()=>s.write(coach,save()),e=>e.status===409);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM import_exercise_mappings WHERE owner_id=?').get(coach.userId).n,0);
});
test('saved suggestions do not choose variants or overwrite source prescription automatically',async()=>{
 const {exercises}=await import('../lib/content.ts'),{extractImportRows,finalizeImport}=await import('../lib/program-import.ts');const c=value=>({value,formula:false});const rows=extractImportRows({name:'A',rows:[['Exercise','Sets','Reps','Weight','RPE','Tempo','Notes'].map(c),['My Leg Curl','3','12-10','','8','3-0-2-0','Keep steady'].map(c)]},0,{exercise:0,sets:1,reps:2,weight:3,rpe:4,tempo:5,notes:6});const mapping=rememberedImportMapping([{source:'My Leg Curl',exerciseId:'seated-curl',version:1}],rows[0].name);assert.equal(rows[0].exerciseId,'');assert.throws(()=>finalizeImport(rows,exercises));const item=finalizeImport([{...rows[0],exerciseId:mapping.exerciseId}],exercises)[0];assert.equal(item.reps,10);assert.equal(item.repsMax,12);assert.equal(item.sets,3);assert.equal(item.weightUnspecified,true);assert.equal(item.targetRpe,8);assert.equal(item.tempo.eccentric,3);assert.equal(item.notes,'Keep steady');
});

test('review proposals derive only from the signed-in coach persisted corrections',async t=>{
 const {proposeImportAliases}=await import('../lib/import-alias-proposals.ts');
 const f=platform(t);await f.connect();const s=importMappingsStore(f.db,config);
 await s.write(coach,save('Coach private spelling for press','bench'));
 await s.write(doctor,save('Different owner spelling','barbell-bench'));
 const before=await s.list(coach),result=proposeImportAliases(before);
 assert.equal(result.proposals.length,1);assert.equal(result.proposals[0].source,'Coach private spelling for press');
 assert.ok(!JSON.stringify(result).includes('Different owner'));
 assert.deepEqual(await s.list(coach),before);
});
