import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile,readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { trainingStore } from '../lib/training-store.ts';
import { defaultPrescription, parsePlanItem } from '../lib/training.ts';
import { privateJson } from '../lib/private-json.ts';
import {CONSENT_REVISION} from '../lib/intake.ts';
const oldMigration=await readFile(new URL('../drizzle/0000_friendly_jocasta.sql',import.meta.url),'utf8');
const newMigration=await readFile(new URL('../drizzle/0001_many_abomination.sql',import.meta.url),'utf8');
const laterMigrations=await Promise.all((await readdir(new URL('../drizzle/',import.meta.url))).filter(n=>/^\d{4}.*\.sql$/.test(n)&&!n.startsWith('0000_')&&!n.startsWith('0001_')).sort().map(n=>readFile(new URL('../drizzle/'+n,import.meta.url),'utf8')));
function database(seedOld=false){
  const sql=new DatabaseSync(':memory:');sql.exec(oldMigration);
  if(seedOld){sql.prepare('INSERT INTO program_items(owner_id,exercise_id,sets,reps) VALUES (?,?,?,?)').run('old-user','goblet',3,8);sql.prepare('INSERT INTO workout_logs(owner_id,exercise_count,pain_before,pain_after) VALUES (?,?,?,?)').run('old-user',1,2,1)}
  sql.exec(newMigration);for(const migration of laterMigrations)sql.exec(migration);
  for(const owner of ['a','b','old-user'])sql.prepare("INSERT INTO user_intakes(user_id,answers_json,completed,created_at,updated_at) VALUES(?,'{}',1,'2026-01-01','2026-01-01')").run(owner);
  for(const owner of ['a','b','old-user'])sql.prepare("INSERT INTO training_access(user_id,mode,self_until,updated_at) VALUES(?,'self',?,'2026-01-01')").run(owner,new Date(Date.now()+365*86400000).toISOString());
  for(const owner of ['a','b','old-user'])for(const consent of ['terms','privacy','health','team'])sql.prepare('INSERT INTO user_consents(id,user_id,consent_id,revision,accepted,created_at) VALUES(?,?,?,?,1,?)').run(owner+'-'+consent,owner,consent,CONSENT_REVISION,'2026-01-01');
  const adapter={
    prepare(query) {
      return {
        bind(...values) {
          return {
            async first() { return sql.prepare(query).get(...values) ?? null; },
            async all() { return { results: sql.prepare(query).all(...values) }; },
            async run() { return sql.prepare(query).run(...values); },
          };
        },
      };
    },
    async batch(statements){sql.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sql.exec('COMMIT');return results}catch(error){sql.exec('ROLLBACK');throw error}},
  };
  return{sql,store:trainingStore(adapter)};
}

test('migration retains old programs and logs with non-destructive defaults',async()=>{
  const {store,sql}=database(true);const items=await store.getPlan('old-user');
  assert.equal(items.length,1);assert.equal(items[0].sets,3);assert.equal(items[0].reps,8);assert.equal(items[0].unit,'reps');assert.equal(items[0].notes,'');
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM workout_logs').get().n,1);
});

test('plan and template operations stay account-scoped and preserve personal edits',async()=>{
  const {store}=database();await store.savePlan('a',{...defaultPrescription('goblet'),sets:4,weight:12.5,notes:'טווח אישי'});
  await store.addTemplate('a',{templateId:'lower'});await store.addTemplate('a',{templateId:'lower'});
  const a=await store.getPlan('a');assert.equal(a.length,4);assert.equal(a.find(i=>i.exerciseId==='goblet').weight,12.5);assert.equal(a.find(i=>i.exerciseId==='balance').unit,'seconds');
  assert.equal((await store.getPlan('b')).length,0);await store.removePlan('b',{exerciseId:'goblet'});assert.equal((await store.getPlan('a')).length,4);
});

test('session resumes from persisted sets, snapshots the plan, and completes once',async()=>{
  const {store}=database();await store.savePlan('a',defaultPrescription('goblet'));
  const requestId=randomUUID();const session=await store.start('a',{requestId,before:3});
  assert.equal(session.plannedSets,2);assert.equal(session.completedSets,0);
  await store.savePlan('a',{...defaultPrescription('goblet'),sets:5,weight:40});
  const saved=await store.patch('a',{id:session.id,version:session.version,action:'set',exerciseId:'goblet',setIndex:0,done:true,amount:8,weight:20});
  const resumed=(await store.feed('a')).active;assert.equal(resumed.id,session.id);assert.equal(resumed.items[0].sets,2);assert.equal(resumed.items[0].results[0].weight,20);assert.equal(resumed.completedSets,1);
  const done=await store.patch('a',{id:session.id,version:saved.version,action:'finish',after:2});
  assert.equal(done.status,'completed');assert.equal(done.after,2);assert.equal(done.completedSets,1);
  const retry=await store.patch('a',{id:session.id,version:saved.version,action:'finish',after:2});assert.equal(retry.version,done.version);
  const feed=await store.feed('a');assert.equal(feed.active,null);assert.equal(feed.history.length,1);assert.equal(feed.stats.total,1);assert.equal(feed.stats.sets,1);
  assert.equal((await store.start('a',{requestId,before:3})).status,'completed');
});

test('unknown owner cannot read or mutate another account session',async()=>{
  const {store}=database();await store.savePlan('a',defaultPrescription('wall-slide'));const s=await store.start('a',{requestId:randomUUID(),before:0});
  await assert.rejects(()=>store.patch('b',{id:s.id,version:s.version,action:'cancel'}),e=>e.status===404);
  const feed=await store.feed('b');assert.equal(feed.active,null);assert.equal(feed.history.length,0);
});

test('concurrent start requests produce a single active session and stale writes conflict',async()=>{
  const {store}=database();await store.savePlan('a',defaultPrescription('walk'));
  const sessions=await Promise.all(Array.from({length:5},()=>store.start('a',{requestId:randomUUID(),before:1})));
  assert.equal(new Set(sessions.map(s=>s.id)).size,1);
  const s=sessions[0];const saved=await store.patch('a',{id:s.id,version:s.version,action:'set',exerciseId:'walk',setIndex:0,done:true,amount:15,weight:0});
  await assert.rejects(()=>store.patch('a',{id:s.id,version:s.version,action:'cancel'}),e=>e.status===409&&e.session.version===saved.version);
  assert.equal((await store.feed('a')).active.completedSets,1);
});

test('invalid inputs and empty finishes do not create fabricated performance',async()=>{
  const {store}=database();await assert.rejects(()=>store.savePlan('a',null));assert.throws(()=>parsePlanItem({...defaultPrescription('goblet'),weight:-1}));
  await store.savePlan('a',defaultPrescription('balance'));const s=await store.start('a',{requestId:randomUUID(),before:0});
  await assert.rejects(()=>store.patch('a',{id:s.id,version:s.version,action:'finish',after:0}));
  await assert.rejects(()=>store.patch('a',{id:s.id,version:s.version,action:'set',exerciseId:'balance',setIndex:90,done:true,amount:20,weight:0}));
  await assert.rejects(()=>store.patch('a',{id:s.id,version:s.version,action:'set',exerciseId:'balance',setIndex:0,done:true,amount:50000,weight:0}));
  const cancelled=await store.patch('a',{id:s.id,version:s.version,action:'cancel'});assert.equal(cancelled.status,'cancelled');
  assert.equal((await store.feed('a')).stats.total,0);assert.equal((await store.feed('a')).active,null);
});

test('private JSON responses cannot be stored by HTTP caches',()=>{
  assert.equal(privateJson({anything:'test'}).headers.get('cache-control'),'private, no-store');
});

test('embedded warmups and side roundtrip independently of repeated work occurrences',async()=>{
 const {store}=database();const warmupSets=[{amount:5,weight:10},{amount:3,weight:20}];
 await store.savePlan('a',{...defaultPrescription('goblet'),occurrenceId:'first',warmupSets,side:'left'});
 await store.savePlan('a',{...defaultPrescription('goblet'),occurrenceId:'second',warmupSets:[{amount:2,weight:5}],side:'right'});
 const plan=await store.getPlan('a');assert.deepEqual(plan[0].warmupSets,warmupSets);assert.equal(plan[0].side,'left');
 const s=await store.start('a',{requestId:randomUUID(),before:0});assert.equal(s.plannedSets,4);assert.equal(s.items[0].warmupResults.length,2);
 const saved=await store.patch('a',{id:s.id,version:s.version,action:'warmupSet',exerciseId:'goblet',occurrenceId:'second',setIndex:0,done:true,amount:4,weight:6});
 assert.equal(saved.completedSets,0);assert.equal(saved.items[0].warmupResults[0].done,false);assert.equal(saved.items[1].warmupResults[0].weight,6);assert.equal(saved.items[1].results[0].weight,0);
 assert.deepEqual((await store.feed('a')).active.items,saved.items);
 await assert.rejects(()=>store.patch('a',{id:s.id,version:s.version,action:'warmupSet',exerciseId:'goblet',occurrenceId:'second',setIndex:0,done:false,amount:4,weight:6}),e=>e.status===409);
 await assert.rejects(()=>store.patch('b',{id:s.id,version:saved.version,action:'warmupSet',exerciseId:'goblet',occurrenceId:'second',setIndex:0,done:false,amount:4,weight:6}),e=>e.status===404);
 await assert.rejects(()=>store.patch('a',{id:s.id,version:saved.version,action:'warmupSet',exerciseId:'goblet',setIndex:0,done:true,amount:4,weight:6}));
 await assert.rejects(()=>store.patch('a',{id:s.id,version:saved.version,action:'finish',after:0}));
 const work=await store.patch('a',{id:s.id,version:saved.version,action:'set',exerciseId:'goblet',occurrenceId:'first',setIndex:0,done:true,amount:8,weight:30});
 await store.patch('a',{id:s.id,version:work.version,action:'finish',after:0});assert.deepEqual((await store.feed('a')).history[0].items[1].warmupResults,saved.items[1].warmupResults);
});

test('warmup and side validation rejects invalid prescriptions and preserves omission fallback',()=>{
 const p={...defaultPrescription('goblet'),warmupSets:[{amount:4,weight:5}],side:'both'};
 assert.deepEqual(parsePlanItem({exerciseId:'goblet'},p).warmupSets,p.warmupSets);
 for(const warmupSets of [null,{},Array.from({length:21},()=>({amount:2,weight:1})),[{amount:0,weight:0}],[{amount:2,weight:Infinity}],[{amount:2,weight:-1}]])assert.throws(()=>parsePlanItem({...p,warmupSets}));
 assert.throws(()=>parsePlanItem({...p,side:'up'}));assert.deepEqual(parsePlanItem({...p,warmupSets:[]}).warmupSets,[]);
});

test('swapping before work cannot discard completed warmups and resets incompatible warmup units',async()=>{
 const {store}=database();await store.savePlan('a',{...defaultPrescription('goblet'),warmupSets:[{amount:5,weight:10}]});
 const s=await store.start('a',{requestId:randomUUID(),before:0});
 const saved=await store.patch('a',{id:s.id,version:s.version,action:'warmupSet',exerciseId:'goblet',setIndex:0,done:true,amount:5,weight:10});
 await assert.rejects(()=>store.patch('a',{id:s.id,version:saved.version,action:'swap',exerciseId:'goblet',replacementId:'walk',confirmed:true}));
 const undone=await store.patch('a',{id:s.id,version:saved.version,action:'warmupSet',exerciseId:'goblet',setIndex:0,done:false,amount:5,weight:10});
 const swapped=await store.patch('a',{id:s.id,version:undone.version,action:'swap',exerciseId:'goblet',replacementId:'walk',confirmed:true});
 assert.equal(swapped.items[0].unit,'minutes');assert.deepEqual(swapped.items[0].warmupSets,[]);assert.deepEqual(swapped.items[0].warmupResults,[]);
});

test('lifetime work-set statistics exclude preparation while session completion remains compatible',async()=>{
 const {store}=database();await store.savePlan('a',{...defaultPrescription('goblet'),sets:1});await store.savePlan('a',{...defaultPrescription('wall-slide'),sets:1,workoutSection:'warmup'});
 let s=await store.start('a',{requestId:randomUUID(),before:0});
 for(const exerciseId of ['goblet','wall-slide'])s=await store.patch('a',{id:s.id,version:s.version,action:'set',exerciseId,setIndex:0,done:true,amount:8,weight:0});
 s=await store.patch('a',{id:s.id,version:s.version,action:'finish',after:0});assert.equal(s.completedSets,2);assert.equal((await store.feed('a')).stats.sets,1);
});

test('explicit null clears self-plan side while omission preserves existing prescription',async()=>{
 const {store}=database();const p={...defaultPrescription('goblet'),side:'left'};await store.savePlan('a',p);
 await store.savePlan('a',{exerciseId:'goblet',weight:5});assert.equal((await store.getPlan('a'))[0].side,'left');
 const wire=JSON.parse(JSON.stringify({...p,side:null}));const parsed=parsePlanItem(wire,p);assert.equal('side' in parsed,false);
 const saved=await store.savePlan('a',wire);assert.equal('side' in saved,false);assert.equal('side' in (await store.getPlan('a'))[0],false);
 assert.equal('side' in (await store.start('a',{requestId:randomUUID(),before:0})).items[0],false);
});
