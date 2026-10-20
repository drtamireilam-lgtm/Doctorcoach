import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {parseMilestones,readMilestones,rehabStages} from '../lib/rehab-journey.ts';
import {wellnessStore} from '../lib/wellness-store.ts';
import {todayIsrael} from '../lib/wellness.ts';
import {platform,doctor,coach,client,stranger} from './platform-db.mjs';
const milestone={id:'milestone-1',stage:rehabStages[1],label:'יעד אישי לבדיקה',criteria:'אישור לפי בדיקת הרופא',status:'pending'};
const plan=()=>({id:randomUUID(),kind:'return',day:todayIsrael(),version:0,data:{stage:rehabStages[0],goal:'חזרה מדורגת לאימון',criteria:'הערכה חוזרת עם הרופא',limits:'הנחיה אישית',milestones:JSON.stringify([milestone])}});
async function fixture(t){const f=platform(t);await f.connect();return {...f,wellness:wellnessStore(f.db,{adminEmails:doctor.email,clinicianEmails:doctor.email})};}
test('milestones reject malformed, duplicate, oversized and invalid clinical workflow input',()=>{
 assert.equal(parseMilestones(undefined),'[]');assert.deepEqual(readMilestones('broken'),[]);
 for(const value of ['broken',JSON.stringify({}),JSON.stringify([milestone,milestone]),JSON.stringify([{...milestone,status:'automatic'}]),JSON.stringify([{...milestone,stage:'unknown'}]),JSON.stringify([{...milestone,criteria:''}]),JSON.stringify(Array.from({length:13},(_,i)=>({...milestone,id:'m'+i})))])assert.throws(()=>parseMilestones(value));
 assert.deepEqual(JSON.parse(parseMilestones(JSON.stringify([milestone]))),[milestone]);
});
test('only consented clinician can save milestones; achieved status does not advance stage or start a workout',async t=>{
 const f=await fixture(t),p=plan();
 for(const user of [client,coach,stranger])await assert.rejects(()=>f.wellness.save(user,client.userId,p),e=>e.status===403);
 let bundle=await f.wellness.save(doctor,client.userId,p),record=bundle.records.find(r=>r.kind==='return');
 assert.equal(readMilestones(record.data.milestones)[0].status,'pending');
 bundle=await f.wellness.save(doctor,client.userId,{...p,version:1,data:{...p.data,milestones:JSON.stringify([{...milestone,status:'met'}])}});
 record=bundle.records.find(r=>r.kind==='return');assert.equal(record.data.stage,rehabStages[0]);assert.equal(readMilestones(record.data.milestones)[0].status,'met');
 assert.equal((await f.care.bundle(client,client.userId)).training.active,null);
 for(const user of [client,coach]){const view=await f.wellness.bundle(user,client.userId);assert.equal(view.canReturn,false);assert.equal(readMilestones(view.records.find(r=>r.kind==='return').data.milestones)[0].status,'met');}
});
test('legacy return plan updates retain milestones and stale edits conflict',async t=>{
 const f=await fixture(t),p=plan();await f.wellness.save(doctor,client.userId,p);
 const legacy={...p.data};delete legacy.milestones;
 let b=await f.wellness.save(doctor,client.userId,{...p,version:1,data:{...legacy,goal:'יעד חדש לבדיקה'}});
 assert.equal(readMilestones(b.records.find(r=>r.kind==='return').data.milestones).length,1);
 await assert.rejects(()=>f.wellness.save(doctor,client.userId,{...p,version:1,data:{...p.data,goal:'עריכה ישנה'}}),e=>e.status===409);
 b=await f.wellness.save(doctor,client.userId,{...p,version:2,data:{...legacy,milestones:'[]'}});assert.equal(readMilestones(b.records.find(r=>r.kind==='return').data.milestones).length,0);
});
test('revoking the clinician prevents further updates without losing saved milestones',async t=>{
 const f=await fixture(t),p=plan();await f.wellness.save(doctor,client.userId,p);
 const link=(await f.care.bundle(client,client.userId)).connections.find(c=>c.role==='clinician');await f.care.revoke(client,{id:link.id});
 await assert.rejects(()=>f.wellness.save(doctor,client.userId,{...p,version:1}),e=>e.status===403);
 assert.equal(readMilestones((await f.wellness.bundle(client,client.userId)).records.find(r=>r.kind==='return').data.milestones).length,1);
});
