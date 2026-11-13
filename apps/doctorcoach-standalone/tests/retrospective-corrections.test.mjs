import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform, client} from './platform-db.mjs';
import {defaultPrescription} from '../lib/training.ts';
import {retrospectiveWorkoutStore} from '../lib/retrospective-workout-store.ts';

const input=()=>({requestId:randomUUID(),version:0,source:'free',date:'2026-10-20',time:'19:45',durationMinutes:null,before:null,after:null,note:'',exercises:[{id:randomUUID(),exerciseId:'goblet',name:'',sets:[{done:true,amount:8,weight:33.125,actualRpe:7}]}]});
const setup=async t=>{const f=platform(t,{now:'2026-11-13T10:00:00Z'});await f.connect();return {...f,store:retrospectiveWorkoutStore(f.db)};};
const journal=f=>f.sql.prepare('SELECT * FROM retrospective_workout_revisions').all();

test('historical corrections retain recording time, audit original values, and reorder actual history',async t=>{
 const f=await setup(t),original=await f.store.submit(client.userId,input());
 const ctx=await f.store.loadEntry(client.userId,original.id);
 assert.equal(ctx.draft.time,'19:45');assert.equal(ctx.draft.exercises[0].sets[0].weight,33.125);
 const edit={...ctx.draft,date:'2026-10-21',time:'00:30',note:'corrected'};
 edit.exercises[0].sets[0].weight=35.5;
 const saved=await f.store.correct(client.userId,edit);
 assert.equal(saved.id,original.id);assert.equal(saved.version,original.version+1);
 assert.equal(saved.startedAt,'2026-10-20T21:30:00.000Z');
 assert.equal(saved.retrospective.recordedAt,original.retrospective.recordedAt);
 assert.equal(saved.retrospective.updatedAt,'2026-11-13T10:00:00.000Z');
 assert.equal(saved.items[0].results[0].weight,35.5);
 assert.equal((await f.training.feed(client.userId)).history.length,1);
 assert.equal(journal(f).length,1);
 assert.equal(JSON.parse(journal(f)[0].snapshot_json).items[0].results[0].weight,33.125);
 assert.equal((await f.store.correct(client.userId,edit)).version,saved.version);
 assert.equal(journal(f).length,1);
 await assert.rejects(()=>f.store.correct(client.userId,{...edit,note:'stale'}),e=>e.status===409);
});

test('program correction uses original snapshot after plan edit and leaves ongoing workout and draft untouched',async t=>{
 const f=await setup(t);
 await f.training.savePlan(client.userId,{...defaultPrescription('goblet'),targetRpe:8});
 const ctx=await f.store.load(client.userId),p={...input(),source:'program',programId:ctx.programId,programToken:ctx.programToken,dayId:'1'};
 p.exercises[0].sourceOccurrenceId=ctx.plan[0].occurrenceId;
 const original=await f.store.submit(client.userId,p);
 await f.training.savePlan(client.userId,{...defaultPrescription('goblet'),targetRpe:5});
 const active=await f.training.start(client.userId,{requestId:randomUUID(),before:0});
 const draft=input();await f.store.saveDraft(client.userId,draft);
 const edit=(await f.store.loadEntry(client.userId,original.id)).draft;
 edit.exercises[0].sets[0].actualRpe=9;
 const saved=await f.store.correct(client.userId,edit);
 assert.deepEqual(saved.retrospective.prescription,original.retrospective.prescription);
 assert.equal(saved.items[0].targetRpes[0],8);assert.equal(saved.programId,original.programId);
 assert.equal((await f.training.getPlan(client.userId))[0].targetRpe,5);
 assert.equal((await f.training.feed(client.userId)).active.id,active.id);
 assert.equal((await f.store.load(client.userId)).draft.requestId,draft.requestId);
});

test('corrections reject unauthorized owners, live sessions, stale versions and source changes',async t=>{
 const f=await setup(t),original=await f.store.submit(client.userId,input());
 await assert.rejects(()=>f.store.loadEntry('stranger',original.id),e=>e.status===404);
 const edit=(await f.store.loadEntry(client.userId,original.id)).draft;
 await assert.rejects(()=>f.store.correct('stranger',edit));
 await assert.rejects(()=>f.store.correct(client.userId,{...edit,source:'program'}),e=>e.status===409);
 await assert.rejects(()=>f.store.correct(client.userId,{...edit,version:0}),e=>e.status===409);
 await f.training.savePlan(client.userId,defaultPrescription('goblet'));
 const active=await f.training.start(client.userId,{requestId:randomUUID(),before:0});
 await assert.rejects(()=>f.store.loadEntry(client.userId,active.id),e=>e.status===404);
 assert.equal(journal(f).length,0);
});

test('own completed entry is excluded from duplicate warning but another session requires acknowledgement',async t=>{
 const f=await setup(t),a=await f.store.submit(client.userId,input());
 let edit=(await f.store.loadEntry(client.userId,a.id)).draft;
 await f.store.correct(client.userId,{...edit,note:'same day correction'});
 await f.store.submit(client.userId,{...input(),date:'2026-10-21'});
 edit=(await f.store.loadEntry(client.userId,a.id)).draft;
 await assert.rejects(()=>f.store.correct(client.userId,{...edit,date:'2026-10-21'}),e=>e.code==='duplicate_workout');
 await f.store.correct(client.userId,{...edit,date:'2026-10-21',acknowledgeDuplicate:true});
 assert.equal((await f.training.feed(client.userId)).history.length,2);
});

test('commit-time revocation and failed audit writes roll back corrections',async t=>{
 const f=await setup(t),original=await f.store.submit(client.userId,input());
 const edit=(await f.store.loadEntry(client.userId,original.id)).draft;
 f.sql.exec("CREATE TRIGGER fail_revision BEFORE INSERT ON retrospective_workout_revisions BEGIN SELECT RAISE(ABORT,'synthetic journal failure'); END");
 await assert.rejects(()=>f.store.correct(client.userId,{...edit,note:'failed'}));
 assert.equal((await f.training.feed(client.userId)).history[0].version,original.version);
 f.sql.exec('DROP TRIGGER fail_revision');
 const batch=f.db.batch.bind(f.db);
 f.db.batch=async statements=>{f.sql.exec("UPDATE user_consents SET accepted=0 WHERE user_id='client' AND consent_id='health'");return batch(statements);};
 await assert.rejects(()=>f.store.correct(client.userId,edit),e=>e.status===409);
 assert.equal(journal(f).length,0);
 assert.equal((await f.training.feed(client.userId)).history[0].version,original.version);
});

test('competing corrections serialize without a losing audit row and identical retries share the winner',async t=>{
 const f=await setup(t),a=await f.store.submit(client.userId,input());
 const edit=(await f.store.loadEntry(client.userId,a.id)).draft;
 const identical=await Promise.all([f.store.correct(client.userId,{...edit,note:'winner'}),f.store.correct(client.userId,{...edit,note:'winner'})]);
 assert.equal(identical[0].version,identical[1].version);assert.equal(journal(f).length,1);
 const next=(await f.store.loadEntry(client.userId,a.id)).draft;
 const competing=await Promise.allSettled([f.store.correct(client.userId,{...next,note:'a'}),f.store.correct(client.userId,{...next,note:'b'})]);
 assert.equal(competing.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(competing.filter(r=>r.status==='rejected'&&r.reason.status===409).length,1);
 assert.equal(journal(f).length,2);
});

test('date-only cardio corrections preserve unreported duration and reject future dates and DST gaps',async t=>{
 const f=await setup(t),p=input();p.time='';p.exercises[0].exerciseId='cardio:walking';p.exercises[0].sets=[{done:true,amount:null,weight:null,actualRpe:null}];
 const a=await f.store.submit(client.userId,p),edit=(await f.store.loadEntry(client.userId,a.id)).draft;
 assert.equal(edit.exercises[0].sets[0].amount,null);
 assert.equal(edit.exercises[0].id,a.items[0].occurrenceId);
 await assert.rejects(()=>f.store.correct(client.userId,{...edit,date:'2026-11-14'}));
 await assert.rejects(()=>f.store.correct(client.userId,{...edit,date:'2026-03-27',time:'02:30'}),e=>e.code==='nonexistent_workout_time');
 const saved=await f.store.correct(client.userId,{...edit,note:'still unknown'});
 assert.equal(saved.items[0].cardioResult.durationUnreported,true);
 assert.equal(saved.retrospective.performedAt,null);
 assert.equal(saved.retrospective.recordedAt,a.retrospective.recordedAt);
});
