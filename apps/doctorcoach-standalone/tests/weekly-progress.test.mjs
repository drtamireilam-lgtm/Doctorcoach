import test from 'node:test';
import assert from 'node:assert/strict';
import {weeklyProgress} from '../lib/weekly-progress.ts';
import {weeklyProgressStore,validWeek} from '../lib/weekly-progress-store.ts';
import {platform,client,coach,stranger,doctor} from './platform-db.mjs';
const week='2026-10-04';
const workout=(id,day,weight=50)=>({id,status:'completed',startedAt:day+'T09:00:00Z',finishedAt:day+'T10:00:00Z',before:0,after:0,plannedSets:2,completedSets:1,version:1,items:[{exerciseId:'goblet',name:'Goblet',unit:'reps',results:[{done:true,weight,amount:6},{done:false,weight:100,amount:10}]},{exerciseId:'walk',name:'Walk',unit:'minutes',results:[{done:true,weight:50,amount:10}]}]});
const rec=(id,kind,day,data)=>({id,kind,day,data,slot:id,version:1,updatedAt:day+'T10:00:00Z',authorName:'Test'});
test('empty weeks preserve unknown denominators and measurements',()=>{const r=weeklyProgress([],[],week);assert.equal(r.current.completed,0);assert.equal(r.current.volume,null);assert.equal(r.current.pain,null);assert.equal(r.current.adherence,null);assert.deepEqual(r.exerciseChanges,[]);assert.equal(weeklyProgress([],[],week,0).current.adherence,null);});
test('only completed recorded sets contribute and matched exercise changes are comparable',()=>{const r=weeklyProgress([workout('a','2026-09-28',40),workout('b','2026-10-05',50),{...workout('c','2026-10-06',900),status:'cancelled'}],[],week,2,2);assert.equal(r.current.completed,1);assert.equal(r.current.volume,300);assert.equal(r.current.adherence,50);assert.equal(r.exerciseChanges[0].weightChange,10);assert.equal(r.exerciseChanges[0].e1rmChange,12);});
test('missing sleep values remain unknown while zero reports and zero ROM are retained',()=>{const r=weeklyProgress([], [rec('r','readiness','2026-10-05',{sleep:0,energy:0,stress:0}),rec('m','rehab','2026-10-05',{region:'knee',side:'R',motion:'flexion',response:'before',pain:0,rom:0})],week);assert.equal(r.current.sleep,0);assert.equal(r.current.pain,0);assert.equal(r.current.rom[0].value,0);assert.equal(r.painChange,null);});
test('ROM comparisons never merge sides, regions, motions or timing',()=>{const r=weeklyProgress([], [rec('a','rehab','2026-09-29',{region:'knee',side:'R',motion:'flexion',response:'before',pain:2,rom:90}),rec('b','rehab','2026-10-05',{region:'knee',side:'L',motion:'flexion',response:'before',pain:1,rom:100}),rec('c','rehab','2026-10-05',{region:'knee',side:'R',motion:'flexion',response:'before',pain:1,rom:95})],week);assert.equal(r.romChanges.find(r=>r.side==='L').change,null);assert.equal(r.romChanges.find(r=>r.side==='R').change,5);});
test('Israel local dates assign near-midnight workouts to the correct week',()=>{const s={...workout('a','2026-10-03'),finishedAt:'2026-10-03T21:30:00Z'};assert.equal(weeklyProgress([s],[],week).current.completed,1);assert.throws(()=>validWeek('2026-10-05'));assert.throws(()=>validWeek('2026-02-30'));});
test('weekly targets are owner scoped, versioned and do not invent schedule history',async t=>{const f=platform(t);await f.connect();const store=weeklyProgressStore(f.db,{clinicianEmails:doctor.email});assert.equal((await store.report(client,client.userId,week)).current.planned,null);await store.saveGoal(client,{week,planned:3,version:0,clientId:stranger.userId});assert.equal((await store.report(client,client.userId,week)).current.planned,3);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM weekly_goals WHERE client_id=?').get(stranger.userId).n,0);await assert.rejects(store.saveGoal(client,{week,planned:5,version:0}),e=>e.status===409);await assert.rejects(store.report(stranger,client.userId,week),e=>e.status===403);await assert.rejects(store.report(coach,stranger.userId,week),e=>e.status===403);f.sql.exec("UPDATE care_connections SET active=0 WHERE staff_email='coach@example.test'");await assert.rejects(store.report(coach,client.userId,week),e=>e.status===403);});
test('historical summaries remain readable without a current subscription',async t=>{const f=platform(t);await f.connect();f.sql.exec("UPDATE training_access SET self_until='2020-01-01'");const store=weeklyProgressStore(f.db);assert.equal((await store.report(client,client.userId,week)).current.completed,0);});

test('rehabilitation stage snapshots compare the same episode at each week end',()=>{
 const r=weeklyProgress([], [rec('a','return','2026-09-29',{episodeId:'a',stage:'הערכה'}),rec('b','return','2026-10-05',{episodeId:'a',stage:'פעילות מותאמת'}),rec('c','return','2026-10-06',{episodeId:'b',stage:'הערכה'}),{...rec('late','return','2026-10-01',{episodeId:'a',stage:'חזרה לפעילות'}),updatedAt:'2026-10-10T21:30:00Z'}],week);
 assert.equal(r.rehabStages.length,2);assert.equal(r.rehabStageChanges.find(s=>s.episodeId==='a').previousStage,'הערכה');assert.equal(r.rehabStageChanges.find(s=>s.episodeId==='a').stage,'פעילות מותאמת');assert.equal(r.rehabStageChanges.find(s=>s.episodeId==='a').changed,true);assert.equal(r.rehabStageChanges.find(s=>s.episodeId==='b').previousStage,null);
});

test('database stage history retains the previous week and late staff reads recheck consent',async t=>{
 const f=platform(t);await f.connect();const store=weeklyProgressStore(f.db,{clinicianEmails:doctor.email}),id=crypto.randomUUID();
 f.sql.prepare("INSERT INTO wellness_records(id,client_id,kind,slot,day,content_json,version,author_name,updated_at) VALUES(?,'client','return','current','2026-09-29',?,1,'Doctor','2026-09-29T10:00:00Z')").run(id,JSON.stringify({stage:'הערכה',episodeId:'episode-a'}));
 f.sql.prepare("UPDATE wellness_records SET day='2026-10-05',content_json=?,version=2,updated_at='2026-10-05T10:00:00Z' WHERE id=?").run(JSON.stringify({stage:'פעילות מותאמת',episodeId:'episode-a'}),id);
 const r=await store.report(doctor,client.userId,week);assert.equal(r.rehabStageChanges[0].previousStage,'הערכה');assert.equal(r.rehabStageChanges[0].stage,'פעילות מותאמת');
 const prepare=f.db.prepare;f.db.prepare=query=>{if(query.startsWith('SELECT * FROM training_sessions'))f.sql.exec("UPDATE user_consents SET accepted=0 WHERE user_id='client' AND consent_id='health'");return prepare(query);};
 await assert.rejects(store.report(doctor,client.userId,week),e=>e.status===403);
 assert.equal((await store.report(client,client.userId,week)).rehabStageChanges[0].previousStage,'הערכה');
});

test('workout pain separates timing, counts missing reports and weights each workout once',()=>{
 const a=workout('a','2026-10-05');a.before=0;a.after=2;a.followup={day:'2026-10-06',pain:3};
 a.items[0].results=[{done:true,weight:50,amount:6,painDuring:2},{done:true,weight:50,amount:6,painDuring:6},{done:false,weight:50,amount:6,painDuring:10}];
 const b=workout('b','2026-10-06');b.before=4;b.after=null;b.items[0].results[0].painDuring=0;
 const c=workout('c','2026-10-07');c.after=null;
 const cancelled={...workout('d','2026-10-08'),status:'cancelled',before:10,after:10};
 const r=weeklyProgress([a,b,c,cancelled],[],week);
 assert.deepEqual(r.current.workoutPain.before,{average:1.3,reported:3,missing:0});
 assert.deepEqual(r.current.workoutPain.during,{average:3,reported:2,missing:1});
 assert.deepEqual(r.current.workoutPain.after,{average:2,reported:1,missing:2});
 assert.deepEqual(r.current.workoutPain.nextDay,{average:3,reported:1,missing:2});
 assert.deepEqual(r.previous.workoutPain.nextDay,{average:null,reported:0,missing:0});
});

test('next-day pain stays with its original workout across the week boundary',()=>{
 const s=workout('a','2026-10-03');s.followup={day:'2026-10-04',pain:0};
 const r=weeklyProgress([s],[],week);
 assert.deepEqual(r.previous.workoutPain.nextDay,{average:0,reported:1,missing:0});
 assert.equal(r.current.workoutPain.nextDay.average,null);
});

test('weekly API store includes recorded workout pain and followup without inventing missing reports',async t=>{
 const f=platform(t);await f.connect();const s=workout(crypto.randomUUID(),'2026-10-05');s.items[0].results[0].painDuring=5;
 f.sql.prepare("INSERT INTO training_sessions(id,owner_id,status,items_json,started_at,finished_at,pain_before,pain_after,planned_sets,completed_sets,version,followup_json) VALUES(?,'client','completed',?,?,?,?,?,2,1,1,?)").run(s.id,JSON.stringify(s.items),s.startedAt,s.finishedAt,0,null,JSON.stringify({day:'2026-10-06',pain:2,recordedAt:'2026-10-06T10:00:00Z'}));
 const r=await weeklyProgressStore(f.db).report(client,client.userId,week);
 assert.equal(r.current.workoutPain.during.average,5);
 assert.equal(r.current.workoutPain.after.average,null);
 assert.equal(r.current.workoutPain.nextDay.average,2);
});

test('weekly body weight averages only dated reports and does not expose nutrition records to coach or doctor',async t=>{
 const f=platform(t);await f.connect();
 for(const [day,weight] of [['2026-10-05',80],['2026-10-07',82],['2026-09-28',79],['2026-10-08',null]]){
  f.sql.prepare("INSERT INTO wellness_records(id,client_id,kind,slot,day,content_json,version,author_name,updated_at) VALUES(?,'client','daily',?,?,?,1,'Test',?)").run(crypto.randomUUID(),day,day,JSON.stringify({weight,adherence:5}),day+'T10:00:00Z');
 }
 const store=weeklyProgressStore(f.db,{clinicianEmails:doctor.email});
 const owner=await store.report(client,client.userId,week);
 assert.equal(owner.current.bodyWeight,81);assert.equal(owner.current.bodyWeightReports,2);assert.equal(owner.previous.bodyWeight,79);
 for(const user of [coach,doctor]){const r=await store.report(user,client.userId,week);assert.equal(r.current.bodyWeight,null);assert.equal(r.current.bodyWeightReports,0);}
});
