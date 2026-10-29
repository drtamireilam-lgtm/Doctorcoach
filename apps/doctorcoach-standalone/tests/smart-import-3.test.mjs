import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {detectImportColumns,extractImportRows,finalizeImport} from '../lib/program-import.ts';
import {importRowReview} from '../lib/import-review.ts';
import {parseAssignedItems} from '../lib/care.ts';
import {programItemsForWrite} from '../lib/custom-exercise-types.ts';
import {platform,coach,client,stranger} from './platform-db.mjs';
import {coachDraftStore} from '../lib/coach-drafts.ts';
const sheet=rows=>({name:'SYNTHETIC',rows:rows.map(row=>row.map(value=>({value:String(value)})))});
const parse=rows=>{const s=sheet(rows),d=detectImportColumns(s);return extractImportRows(s,d.header,d.mapping);};
const header=['Exercise','Sets','Reps','Weight','RPE','Notes'];
test('unmatched valid exercises are program-scoped, saveable and retain original prescriptions',()=>{
 const rows=parse([header,['SYNTHETIC Unknown movement',2,8,24.75,'7,7','Original note']]);
 const items=finalizeImport(rows);assert.equal(items.length,1);assert.equal(items[0].customExercise.name,'SYNTHETIC Unknown movement');assert.equal(items[0].weight,24.75);assert.deepEqual(items[0].targetRpes,[7,7]);
 assert.equal(items[0].importSource.matchingStatus,'CUSTOM_EXERCISE');assert.equal(items[0].importSource.originalName,rows[0].name);assert.equal(importRowReview(rows[0],[]).level==='invalid',false);
 assert.deepEqual(parseAssignedItems(programItemsForWrite(items)),items);
});
test('single-cell C2 is a workout heading, never a phantom exercise',()=>{
 const rows=parse([header,['A'],['Leg Press',2,8,33,8,''],['C'],['Leg Curl',2,8,42.5,8,''],['C2'],['SYNTHETIC custom',2,8,32.5,8,''],['D'],['Squat',2,8,119.5,8,'']]);
 assert.equal(rows.length,4);assert.deepEqual(rows.map(r=>r.sourceDay),['A','C','C2','D']);assert.deepEqual(rows.map(r=>r.dayId),['1','2','3','4']);
});
test('per-set repetitions and RPE, decimals and ranges preserve meaning without changing loads',()=>{
 const items=finalizeImport(parse([header,['Leg Press',2,'8,10',152.5,'8,8',''],['Leg Curl',2,'6–8',24.75,'7.5',''],['Squat',2,8,32.5,'7–8','']]));
 assert.deepEqual(items[0].importSource.repsBySet,[{min:8,max:8},{min:10,max:10}]);assert.deepEqual(items[0].targetRpes,[8,8]);assert.equal(items[1].targetRpe,7.5);assert.deepEqual(items.map(i=>i.weight),[152.5,24.75,32.5]);assert.deepEqual(items[2].importSource.rpeRange,[7,8]);assert.equal(items[2].targetRpe,null);
});
test('unmatched program saves, reloads, assigns and executes without global exercise inserts',async t=>{
 const f=platform(t);await f.connect();const rows=parse([header,['SYNTHETIC private row',2,'8,10',42.5,'9,9','Keep this note']]);const items=finalizeImport(rows),payload=programItemsForWrite(items),drafts=coachDraftStore(f.db,f.care);
 await assert.rejects(()=>drafts.save(stranger,client.userId,{action:'save',version:0,requestId:randomUUID(),title:'Synthetic import',items:payload}),e=>e.status===403);
 await drafts.save(coach,client.userId,{action:'save',version:0,requestId:randomUUID(),title:'Synthetic import',items:payload});const saved=(await drafts.get(coach,client.userId)).draft;assert.deepEqual(saved.items,items);
 await f.care.assign(coach,client.userId,{id:randomUUID(),title:saved.title,items:programItemsForWrite(saved.items)});
 const s=await f.training.start(client.userId,{requestId:randomUUID(),dayId:'1',before:0});assert.equal(s.items[0].name,'SYNTHETIC private row');assert.deepEqual(s.items[0].results.map(r=>r.amount),[8,10]);assert.equal(s.items[0].weight,42.5);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM custom_exercises').get().n,0);assert.deepEqual((await f.training.feed(client.userId)).active.items[0].importSource,items[0].importSource);
});

test('ambiguous decimal comma and RPE ranges remain reviewable without blocking valid source data',()=>{
 const items=finalizeImport(parse([header,['Leg Press',2,8,33,'7,5',''],['Leg Curl',3,10,42.5,'7,5','']]));
 assert.equal(items[0].targetRpe,null);assert.ok(items[0].importSource.warnings.length);assert.equal(items[1].targetRpe,7.5);assert.equal(items[0].importSource.raw.rpe,'7,5');
 for(const rpe of ['7,7','8,8','9,9','10,10'])assert.deepEqual(finalizeImport(parse([header,['SYNTHETIC',2,8,33,rpe,'']]))[0].targetRpes,rpe.split(',').map(Number));
});
test('raw provenance survives a later library match and old workout results remain immutable',async t=>{
 const f=platform(t);await f.connect();const item=finalizeImport(parse([header,['SYNTHETIC private exercise',2,8,24.75,8,'Raw note']]))[0];
 await f.care.assign(coach,client.userId,{id:randomUUID(),title:'Original import',items:programItemsForWrite([item])});const original=await f.training.start(client.userId,{requestId:randomUUID(),dayId:'1',before:0});
 await f.training.patch(client.userId,{id:original.id,version:original.version,action:'set',exerciseId:item.exerciseId,occurrenceId:item.occurrenceId,setIndex:0,done:true,weight:32.5,amount:8,actualRpe:8});
 const active=(await f.training.feed(client.userId)).active;await f.training.patch(client.userId,{id:active.id,version:active.version,action:'finish',after:0});
 const replacement={...item,exerciseId:'leg-press',customExercise:undefined,weight:42.5,load:{...item.load,sourceValue:42.5},importSource:{...item.importSource,matchingStatus:'MATCHED',matchedLibraryId:'leg-press'}};
 await f.care.assign(coach,client.userId,{id:randomUUID(),title:'Reviewed import',items:programItemsForWrite([replacement])});
 const s=await f.training.start(client.userId,{requestId:randomUUID(),dayId:'1',before:0});assert.equal(s.items[0].exerciseId,'leg-press');assert.equal(s.items[0].importSource.originalName,item.importSource.originalName);
 const old=(await f.training.feed(client.userId)).history.find(s=>s.id===original.id);assert.equal(old.items[0].exerciseId,item.exerciseId);assert.equal(old.items[0].results[0].weight,32.5);assert.equal(old.items[0].importSource.raw.weight,'24.75');
});
test('program-scoped snapshots cannot masquerade as global private library records or contain unsafe definitions',()=>{
 const item=finalizeImport(parse([header,['SYNTHETIC',2,8,33,8,'']]))[0];
 assert.throws(()=>parseAssignedItems([{...item,exerciseId:'custom-'+randomUUID(),customExercise:{...item.customExercise,id:'custom-'+randomUUID()}}]));
 assert.throws(()=>parseAssignedItems([{...item,customExercise:{...item.customExercise,name:'',unit:'reps'}}]));
 assert.throws(()=>parseAssignedItems([{...item,importSource:{...item.importSource,fileSha256:'not-a-digest'}}]));
});
test('coach-owned remembered mappings apply without losing prescriptions and reject conflicting equipment',async()=>{
 const {applyRememberedImportMappings}=await import('../lib/import-mapping-types.ts');const {exercises}=await import('../lib/content.ts');
 const rows=parse([header,['SYNTHETIC personal spelling',2,8,24.75,8,'Keep']]);const matched=applyRememberedImportMappings(rows,[{source:rows[0].name,exerciseId:'leg-press',version:1}],exercises);assert.equal(matched[0].exerciseId,'leg-press');assert.equal(matched[0].weight,'24.75');assert.equal(matched[0].originalName,rows[0].name);
 const wrong=applyRememberedImportMappings([{...rows[0],name:'SYNTHETIC Barbell',originalName:'SYNTHETIC Barbell',equipment:'barbell'}],[{source:'SYNTHETIC Barbell',exerciseId:'bench',version:1}],exercises);assert.notEqual(wrong[0].exerciseId,'bench');
});

test('complete bounded program JSON includes unknown snapshots and source metadata without a 64KB bottleneck',async()=>{
 const {PROGRAM_PAYLOAD_LIMIT}=await import('../lib/program-payload.ts');const {readPayload}=await import('../lib/api-helpers.ts');
 const rows=parse([header,...Array.from({length:30},(_,n)=>['SYNTHETIC '+n,2,8,24.75,'7,7','x'.repeat(490)])]);const items=programItemsForWrite(finalizeImport(rows));const body=JSON.stringify({items});assert.ok(body.length>64000);assert.ok(body.length<PROGRAM_PAYLOAD_LIMIT);
 const p=await readPayload(new Request('https://local.test/api/care/draft',{method:'POST',headers:{'Content-Type':'application/json'},body}),PROGRAM_PAYLOAD_LIMIT);assert.equal(p.items.length,30);
});

test('coach dose overrides never reactivate original per-set repetitions',async t=>{
 const f=platform(t);await f.connect();const original=finalizeImport(parse([header,['SYNTHETIC timed override',3,'8,6,4',33,8,'']]))[0];
 const {programDosePatch}=await import('../lib/import-source.ts');const edit=(item,patch)=>({...item,...(programDosePatch?programDosePatch(item,patch):patch)});
 const changed=edit(original,{unit:'seconds'});await f.care.assign(coach,client.userId,{id:randomUUID(),title:'Overridden quantity',items:programItemsForWrite([changed])});
 const session=await f.training.start(client.userId,{requestId:randomUUID(),dayId:'1',before:0});assert.deepEqual(session.items[0].results.map(s=>s.amount),[8,8,8]);
 const back=edit(edit(original,{reps:12}),{reps:8});assert.equal(back.setReps,undefined);assert.deepEqual(back.importSource.repsBySet,[{min:8,max:8},{min:6,max:6},{min:4,max:4}]);
});

test('equipment columns reinforce exact names without duplication and conflicting implements require review',()=>{
 const rows=parse([[...header,'Equipment'],['Dumbbell Bench Press',2,8,33,8,'','Dumbbell'],['Dumbbell Bench Press',2,8,42.5,8,'','Barbell']]);const items=finalizeImport(rows);
 assert.equal(items[0].exerciseId,'bench');assert.equal(items[1].importSource.matchingStatus,'NEEDS_REVIEW');assert.equal(items[1].customExercise.name,'Dumbbell Bench Press');assert.equal(items[1].importSource.raw.equipment,'Barbell');
});
