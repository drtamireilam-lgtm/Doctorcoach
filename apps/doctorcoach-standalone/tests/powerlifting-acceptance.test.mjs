import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,coach,client} from './platform-db.mjs';
import {coachDraftStore} from '../lib/coach-drafts.ts';
import {prepareProgramReview} from '../lib/program-review.ts';
import {defaultPrescription} from '../lib/training.ts';
import {performancePoints} from '../lib/performance.ts';

const week=[['1',['back-squat','barbell-bench','deadlift']],['3',['barbell-bench','back-squat']],['5',['back-squat','barbell-bench','deadlift']],['6',['barbell-bench','barbell-bench']]];

test('requested Sunday Tuesday Thursday Friday Powerlifting acceptance: draft, approve, assign, four workouts, graphs and independent revision',async t=>{
 const f=platform(t);await f.connect();const drafts=coachDraftStore(f.db,f.care),id=randomUUID();let n=0;
 const items=week.flatMap(([dayId,ids])=>ids.map(exerciseId=>({...defaultPrescription(exerciseId),occurrenceId:randomUUID(),dayId,sets:2+n++%3,reps:4+n%4,weight:60+n*5,targetRpe:7+n%3,effortScale:n%2?'rpe':'rir'})));
 assert.equal(items.length,10);const review=prepareProgramReview('Four day Powerlifting acceptance',items);
 await drafts.save(coach,client.userId,{action:'save',version:0,requestId:id,title:review.title,items:review.items,revisionOf:null});
 const restored=(await drafts.get(coach,client.userId)).draft;assert.equal(restored.items.length,10);
 await f.care.assign(coach,client.userId,{id,title:restored.title,items:restored.items});
 const plan=await f.training.getPlan(client.userId);assert.equal(plan.length,10);assert.equal(new Set(plan.map(i=>i.occurrenceId)).size,10);
 for(const [dayId,ids] of week){
  let session=await f.training.start(client.userId,{requestId:randomUUID(),before:0,dayId});assert.deepEqual(session.items.map(i=>i.exerciseId),ids);
  for(const item of session.items){
   for(let setIndex=0;setIndex<item.sets;setIndex++){
    session=await f.training.patch(client.userId,{action:'set',id:session.id,version:session.version,exerciseId:item.exerciseId,occurrenceId:item.occurrenceId,setIndex,done:true,amount:item.reps,weight:item.weight,actualRpe:item.targetRpe});
    assert.equal(session.items.find(i=>i.occurrenceId===item.occurrenceId).results[setIndex].done,true);
   }
  }
  session=await f.training.patch(client.userId,{action:'finish',id:session.id,version:session.version,after:0});assert.equal(session.completedSets,session.plannedSets);
 }
 const feed=await f.training.feed(client.userId),snapshot=JSON.stringify(feed.history);assert.equal(feed.stats.total,4);assert.equal(feed.history.length,4);
 const bench=performancePoints(feed.history,'barbell-bench');assert.equal(bench.length,4);assert.ok(bench.every(p=>p.e1rm>0&&p.weight>0));assert.equal(performancePoints(feed.history,'deadlift').length,2);
 const friday=feed.history.find(s=>s.items.every(i=>i.dayId==='6'));assert.equal(friday.items.length,2);assert.notEqual(friday.items[0].occurrenceId,friday.items[1].occurrenceId);assert.notEqual(friday.items[0].sets,friday.items[1].sets);
 const changed=structuredClone(plan),first=changed.find(i=>i.dayId==='6');first.sets=5;first.weight+=15;first.targetRpe=10;
 await f.care.assign(coach,client.userId,{id:randomUUID(),title:'Independent occurrence revision',revisionOf:id,items:changed});
 const edited=await f.training.getPlan(client.userId);for(const item of plan.filter(i=>i.occurrenceId!==first.occurrenceId))assert.deepEqual(edited.find(i=>i.occurrenceId===item.occurrenceId),item);
 assert.equal(JSON.stringify((await f.training.feed(client.userId)).history),snapshot,'revision never rewrites completed history');
});
