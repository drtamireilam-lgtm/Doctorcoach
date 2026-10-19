import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {platform,coach,client,stranger} from './platform-db.mjs';
import {parseAssignedItems} from '../lib/care.ts';
import {defaultPrescription,updateSet,withOccurrenceIds} from '../lib/training.ts';
import {prepareProgramReview} from '../lib/program-review.ts';
import {coachDraftStore} from '../lib/coach-drafts.ts';
import {copyWorkoutDay,copiedProgramDraft,moveProgramOccurrence} from '../lib/program-copy.ts';
import {finalizeImport} from '../lib/program-import.ts';
import {templateItems} from '../lib/program-templates.ts';
import {performancePoints} from '../lib/performance.ts';
import {previewNextSetLoad} from '../lib/set-load.ts';
const item=(exerciseId,dayId,sets=2,targetRpe=8)=>({...defaultPrescription(exerciseId),occurrenceId:randomUUID(),dayId,sets,reps:5,weight:100,targetRpe,effortScale:'rpe'});
const powerlifting=()=>[item('barbell-bench','1',2,7),item('barbell-bench','2',3,8),item('barbell-bench','3',4,9),item('back-squat','1',2,7),item('back-squat','1',3,9),item('deadlift','1',2,8),item('deadlift','3',4,8)];
const patch=(f,s,action)=>f.training.patch(client.userId,{id:s.id,version:s.version,...action});

test('Powerlifting review, private draft, approval and assignment retain every independent occurrence',async t=>{
 const f=platform(t);await f.connect();const raw=powerlifting(),review=prepareProgramReview('Powerlifting',raw),id=randomUUID(),drafts=coachDraftStore(f.db,f.care);
 const saved=await drafts.save(coach,client.userId,{action:'save',version:0,requestId:id,title:review.title,items:review.items,revisionOf:null});
 assert.equal(saved.draft.items.length,7);assert.equal(new Set(saved.draft.items.map(i=>i.occurrenceId)).size,7);
 const restored=await drafts.get(coach,client.userId);restored.draft.items[3].sets=5;
 await drafts.save(coach,client.userId,{...restored.draft,action:'save',version:restored.version});
 const again=await drafts.get(coach,client.userId);assert.equal(again.draft.items[4].sets,3);assert.equal(again.draft.items[0].sets,2);
 await f.care.assign(coach,client.userId,{id,title:review.title,items:again.draft.items});
 const plan=await f.training.getPlan(client.userId);assert.equal(plan.length,7);assert.deepEqual(plan.filter(i=>i.exerciseId==='barbell-bench').map(i=>[i.dayId,i.sets,i.targetRpe]),[['1',2,7],['2',3,8],['3',4,9]]);
 assert.equal(plan.filter(i=>i.exerciseId==='deadlift').length,2);
 assert.equal((await f.training.getPlan(stranger.userId)).length,0);
});

test('two Squats in one workout keep sets, effort scale, recommendations and immutable history separate',async t=>{
 const f=platform(t);await f.connect();const first=item('back-squat','1',2,8),second=item('back-squat','1',3,9);
 await f.care.assign(coach,client.userId,{id:randomUUID(),title:'Repeated squat',items:[first,second]});
 let s=await f.training.start(client.userId,{requestId:randomUUID(),before:0,dayId:'1'});assert.equal(s.items.length,2);assert.equal(s.plannedSets,5);
 await assert.rejects(()=>patch(f,s,{action:'set',exerciseId:first.exerciseId,setIndex:0,done:true,amount:5,weight:100,actualRpe:6}));
 s=await patch(f,s,{action:'set',exerciseId:first.exerciseId,occurrenceId:first.occurrenceId,setIndex:0,done:true,amount:5,weight:100,actualRpe:6,autoNextLoad:true,loadMode:'calculated'});
 assert.equal(s.items[1].results[0].done,false);assert.equal(s.items[1].results[1].weight,100);assert.ok(s.items[0].results[1].weight>100);
 const before=structuredClone(s.items[0]);s=await patch(f,s,{action:'effortScale',exerciseId:second.exerciseId,occurrenceId:second.occurrenceId,effortScale:'rir'});
 assert.deepEqual(s.items[0],before);assert.equal(s.items[1].effortScale,'rir');
 s=await patch(f,s,{action:'set',exerciseId:second.exerciseId,occurrenceId:second.occurrenceId,setIndex:0,done:true,amount:5,weight:120,actualRpe:9});
 s=await patch(f,s,{action:'finish',after:0});const history=(await f.training.feed(client.userId)).history;assert.equal(history[0].items.length,2);assert.equal(history[0].completedSets,2);
 const points=performancePoints(history,'back-squat');assert.equal(points.length,1);assert.equal(points[0].weight,120);assert.ok(points[0].e1rm>120);
 assert.deepEqual(history[0].items[0],before);
});

test('independent plan persistence supports repeated same-day rows, editing/deleting one and legacy callers',async t=>{
 const f=platform(t);await f.connect();const a=item('bench','1',2,7),b=item('bench','1',4,9);
 await f.training.savePlan(client.userId,a);await f.training.savePlan(client.userId,b);
 await f.training.savePlan(client.userId,{...a,sets:3});let plan=await f.training.getPlan(client.userId);assert.equal(plan.length,2);assert.equal(plan.find(i=>i.occurrenceId===b.occurrenceId).sets,4);
 await assert.rejects(()=>f.training.savePlan(client.userId,{exerciseId:'bench',sets:8,dayId:'1'}));
 await assert.rejects(()=>f.training.removePlan(client.userId,{exerciseId:'bench',dayId:'1'}));
 await f.training.removePlan(client.userId,{exerciseId:'bench',occurrenceId:a.occurrenceId});plan=await f.training.getPlan(client.userId);assert.equal(plan.length,1);assert.equal(plan[0].occurrenceId,b.occurrenceId);
 await f.training.savePlan(client.userId,{exerciseId:'bench',sets:6});assert.equal((await f.training.getPlan(client.userId))[0].sets,6);
 await f.training.removePlan(stranger.userId,{exerciseId:'bench',occurrenceId:b.occurrenceId});assert.equal((await f.training.getPlan(client.userId)).length,1);
});

test('copy and reusable templates preserve repeats and detach prescriptions from the source',()=>{
 const original=powerlifting(),copy=copyWorkoutDay(original,'1','2');assert.equal(copy.items.filter(i=>i.dayId==='2'&&i.exerciseId==='back-squat').length,2);
 assert.equal(new Set(copy.items.map(i=>i.occurrenceId)).size,copy.items.length);
 const p=copiedProgramDraft({id:'source',title:'Program',items:original},null);assert.ok(p.items.every(i=>!original.some(s=>s.occurrenceId===i.occurrenceId)));p.items[0].sets=10;assert.equal(original[0].sets,2);
 assert.equal(templateItems(original).length,7);
});

test('legacy records normalize deterministically and explicit duplicate/malformed occurrence IDs fail closed',()=>{
 const raw=[defaultPrescription('bench'),defaultPrescription('bench')];const normalized=parseAssignedItems(raw);assert.equal(new Set(normalized.map(i=>i.occurrenceId)).size,2);assert.deepEqual(parseAssignedItems(normalized),normalized);assert.deepEqual(withOccurrenceIds(raw),withOccurrenceIds(raw));
 for(const occurrenceId of ['',{},'x'.repeat(161),'<script>'])assert.throws(()=>parseAssignedItems([{...raw[0],occurrenceId}]));
 assert.throws(()=>parseAssignedItems([{...raw[0],occurrenceId:'same'},{...raw[0],dayId:'2',occurrenceId:'same'}]));
 const legacy={...raw[0],name:'Bench',results:[{done:false,amount:5,weight:100}]};assert.equal(updateSet([legacy],{exerciseId:'bench',setIndex:0,done:true,amount:5,weight:100})[0].results[0].done,true);
 assert.throws(()=>updateSet([{...legacy,occurrenceId:'a'},{...legacy,occurrenceId:'b'}],{exerciseId:'bench',occurrenceId:'foreign',setIndex:0,done:true,amount:5,weight:100}));
});

test('new occurrence migration retains old values, row IDs, timestamps, history and deletion barriers',()=>{
 const sql=new DatabaseSync(':memory:'),dir=new URL('../drizzle/',import.meta.url);try{
 for(const name of readdirSync(dir).filter(n=>/^\d.*\.sql$/.test(n)&&parseInt(n)<52).sort())sql.exec(readFileSync(new URL(name,dir),'utf8'));
 sql.exec("INSERT INTO program_items(owner_id,exercise_id,sets,weight,day_id,created_at) VALUES('old','bench',4,85,'2','original-time')");const before={...sql.prepare('SELECT * FROM program_items').get()};
 sql.exec(readFileSync(new URL('0052_exercise_occurrences.sql',dir),'utf8'));const {occurrence_id,...after}=sql.prepare('SELECT * FROM program_items').get();assert.deepEqual(after,before);assert.equal(occurrence_id,null);
 sql.exec("INSERT INTO program_items(owner_id,exercise_id,day_id,occurrence_id) VALUES('old','bench','2','second')");assert.equal(sql.prepare('SELECT count(*) n FROM program_items').get().n,2);
 assert.throws(()=>sql.exec("INSERT INTO program_items(owner_id,exercise_id,day_id) VALUES('old','bench','2')"));
 assert.equal(sql.prepare("SELECT count(*) n FROM sqlite_master WHERE type='trigger' AND name LIKE 'deletion_guard_program_items_%'").get().n,2);
 }finally{sql.close();}
});


test('reordering repeated occurrences preserves doses, other days and source order',()=>{
 const a=item('bench','1',2),b=item('bench','1',4),other=item('rdl','2'),original=[a,other,b];
 const moved=moveProgramOccurrence(original,b.occurrenceId,-1);assert.deepEqual(moved,[b,other,a]);assert.deepEqual(original,[a,other,b]);assert.equal(moved[0].sets,4);assert.equal(moveProgramOccurrence(moved,b.occurrenceId,-1),moved);
});


test('legacy IDs do not collide with explicit IDs and invalid duplicate IDs cannot target multiple occurrences',()=>{
 const raw=defaultPrescription('bench');const result=parseAssignedItems([{...raw,occurrenceId:'1:bench:2'},raw,raw]);assert.equal(new Set(result.map(i=>i.occurrenceId)).size,3);
 assert.deepEqual(parseAssignedItems(result),result);
});


test('set videos bind to the chosen repeated occurrence and cannot retry against another occurrence',async t=>{
 const f=platform(t);await f.connect();const a=item('bench','1',2),b=item('bench','1',3);await f.training.savePlan(client.userId,a);await f.training.savePlan(client.userId,b);
 const s=await f.training.start(client.userId,{requestId:randomUUID(),before:0});
 const p={id:randomUUID(),kind:'review',exerciseId:'bench',sessionId:s.id,setIndex:2,occurrenceId:b.occurrenceId,caption:'Synthetic set video',mime:'video/mp4',bytes:64};
 await f.media.initialize(client,p);await f.media.ready(client,p.id);assert.equal((await f.media.list(client,'review'))[0].occurrenceId,b.occurrenceId);
 await assert.rejects(()=>f.media.initialize(client,{...p,occurrenceId:a.occurrenceId}),e=>e.status===400||e.status===409);
 await assert.rejects(()=>f.media.initialize(client,{...p,id:randomUUID(),occurrenceId:undefined}));
 await assert.rejects(()=>f.media.initialize(stranger,p));
});


test('concurrent reuse of an occurrence ID cannot silently write another catalog exercise',async t=>{
 const f=platform(t);await f.connect();const originalPrepare=f.db.prepare,occurrenceId=randomUUID();let raced=false;
 f.db.prepare=query=>{if(!raced&&query.startsWith('INSERT INTO program_items')){raced=true;f.sql.prepare("INSERT INTO program_items(owner_id,exercise_id,occurrence_id) VALUES('client','rdl',?)").run(occurrenceId);}return originalPrepare(query);};
 await assert.rejects(()=>f.training.savePlan(client.userId,{...item('bench','1'),occurrenceId}),e=>e.status===409);
 const row=f.sql.prepare('SELECT exercise_id,sets FROM program_items WHERE occurrence_id=?').get(occurrenceId);assert.equal(row.exercise_id,'rdl');assert.equal(row.sets,2);
});


test('import keeps repeated spreadsheet rows independent and reviewable',()=>{
 const row={row:2,name:'Bench',sourceDay:'A',dayId:'1',exerciseId:'barbell-bench',sets:'2',reps:'5',weight:'100',rpe:'8',rir:'',tempo:'',notes:'',unit:'reps',section:'main',issues:[],ignored:false};
 const items=finalizeImport([row,{...row,row:3,sets:'4',rpe:'9'}]);assert.equal(items.length,2);assert.notEqual(items[0].occurrenceId,items[1].occurrenceId);assert.deepEqual(items.map(i=>[i.sets,i.targetRpe]),[[2,8],[4,9]]);
 assert.equal(prepareProgramReview('Imported repeats',items).items.length,2);
});
