import test from 'node:test';
import assert from 'node:assert/strict';
import {progressTimeline,filterProgress} from '../lib/progress-timeline.ts';
const feed={active:null,history:[],stats:{total:0,week:0,sets:0}};
const record=(id,kind,day,data)=>({id,kind,day,data,slot:day,version:1,authorName:'test',updatedAt:'2026-10-09T10:00:00Z'});
const session={id:'s1',status:'completed',startedAt:'2026-10-08T20:00:00Z',finishedAt:'2026-10-08T22:00:00Z',items:[],before:0,after:0,plannedSets:3,completedSets:2,version:1};
test('timeline joins domains by event date, not edit time, and preserves zero measurements',()=>{
 const events=progressTimeline({...feed,history:[session]},[record('n','daily','2026-10-07',{weight:80,adherence:0,waist:null,hip:null}),record('r','readiness','2026-10-08',{sleep:0,energy:0,stress:0})]);
 assert.deepEqual(events.map(e=>e.day),['2026-10-09','2026-10-08','2026-10-07']);
 assert.ok(events[0].details.includes('כאב לפני: 0/10'));
 assert.ok(events[1].details.includes('שינה: 0 שעות'));
 assert.ok(events[2].details.includes('התמדה בתזונה: 0/10'));
 assert.ok(!events[2].details.some(d=>d.includes('מותניים')));
});
test('follow-up uses its own date and cancelled/active workouts never count as completed',()=>{
 const events=progressTimeline({...feed,history:[{...session,followup:{day:'2026-10-10',pain:0,recordedAt:'2026-10-10T10:00:00Z'}},{...session,id:'cancel',status:'cancelled'},{...session,id:'active',status:'active'}]},[]);
 assert.equal(events.length,2);assert.equal(events[0].day,'2026-10-10');assert.equal(events[0].category,'recovery');
 assert.equal(events[1].title,'אימון הושלם');
});
test('timeline does not include private free text, assessments, plans, notes or duplicate readiness snapshots',()=>{
 const events=progressTimeline({...feed,history:[{...session,readiness:{data:{note:'secret'}}}]},[
  record('a','assessment','2026-10-08',{history:'secret'}),record('p','plan','2026-10-08',{principles:'secret'}),record('w','weekly','2026-10-08',{question:'secret'}),record('r','readiness','2026-10-08',{sleep:7,energy:6,stress:3,note:'secret'}),
 ]);
 assert.equal(events.length,2);assert.ok(!JSON.stringify(events).includes('secret'));
});
test('rehab retains region, side, movement and timing rather than merging unlike measurements',()=>{
 const events=progressTimeline(feed,[record('r1','rehab','2026-10-08',{region:'כתף',side:'ימין',motion:'כפיפה',pain:0,rom:0,functionScore:5,response:'לפני אימון'}),record('r2','rehab','2026-10-08',{region:'ברך',side:'שמאל',motion:'כפיפה',pain:3,rom:null,functionScore:5,response:'אחרי אימון'})]);
 assert.equal(events.length,2);assert.notEqual(events[0].title,events[1].title);assert.ok(events[0].details.includes('טווח תנועה: 0°'));assert.ok(!events[1].details.some(s=>s.includes('טווח')));
});
test('inclusive date and category filters keep stable ordering and do not mutate inputs',()=>{
 const events=progressTimeline({...feed,history:[session]},[record('r','readiness','2026-10-08',{sleep:7,energy:5,stress:4})]);
 assert.equal(filterProgress(events,'all','2026-10-08','2026-10-09').length,2);
 assert.equal(filterProgress(events,'readiness','2026-10-08','2026-10-08').length,1);
 assert.equal(filterProgress(events,'training','','2026-10-08').length,0);
 assert.equal(events.length,2);
});
