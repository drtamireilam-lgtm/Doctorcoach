import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,doctor,coach,client,stranger} from './platform-db.mjs';
import {wellnessStore} from '../lib/wellness-store.ts';
import {onboardingStore} from '../lib/onboarding-store.ts';
import {todayIsrael} from '../lib/wellness.ts';
const config={adminEmails:doctor.email,clinicianEmails:doctor.email};
const plan=()=>({id:randomUUID(),kind:'return',day:todayIsrael(),version:0,data:{stage:'הערכה',goal:'יעד ראשון לבדיקה',criteria:'בדיקה אישית עם הרופא',limits:'מגבלה ראשונה',milestones:'[]'}});
async function fixture(t){const f=platform(t);await f.connect();return {...f,wellness:wellnessStore(f.db,config)};}
test('each successful return save preserves the exact previous plan; retries and stale writes add no revisions',async t=>{
 const f=await fixture(t),p=plan();let b=await f.wellness.save(doctor,client.userId,p);assert.equal(b.returnHistoryTotal,1);
 const edit={...p,version:1,data:{...p.data,stage:'פעילות מותאמת',limits:'מגבלה חדשה'}};
 b=await f.wellness.save(doctor,client.userId,edit);
 assert.deepEqual(b.returnHistory.map(r=>r.version),[2,1]);assert.equal(b.returnHistory[1].data.limits,'מגבלה ראשונה');assert.equal(b.returnHistory[1].data.stage,'הערכה');assert.equal(b.returnHistory[0].data.stage,'פעילות מותאמת');
 assert.equal((await f.wellness.save(doctor,client.userId,edit)).returnHistoryTotal,2);
 await assert.rejects(()=>f.wellness.save(doctor,client.userId,{...edit,data:{...edit.data,goal:'עריכה ישנה אחרת'}}),e=>e.status===409);
 assert.equal((await f.wellness.bundle(client,client.userId)).returnHistoryTotal,2);
});
test('legacy current version becomes one marked baseline without invented earlier history',async t=>{
 const f=await fixture(t),p=plan();await f.wellness.save(doctor,client.userId,p);
 f.sql.prepare('UPDATE wellness_records SET version=7 WHERE id=?').run(p.id);
 f.sql.prepare('DELETE FROM return_plan_revisions WHERE record_id=?').run(p.id);
 const b=await f.wellness.save(doctor,client.userId,{...p,version:7,data:{...p.data,stage:'פעילות מותאמת'}});
 assert.deepEqual(b.returnHistory.map(r=>r.version),[8,7]);assert.equal(b.returnHistory[1].baseline,true);assert.equal(b.returnHistory[0].baseline,false);
});
test('failure to persist a snapshot rolls back the current plan update atomically',async t=>{
 const f=await fixture(t),p=plan();await f.wellness.save(doctor,client.userId,p);
 f.sql.exec("CREATE TRIGGER test_revision_failure BEFORE INSERT ON return_plan_revisions WHEN NEW.version=2 BEGIN SELECT RAISE(ABORT,'snapshot unavailable'); END;");
 await assert.rejects(()=>f.wellness.save(doctor,client.userId,{...p,version:1,data:{...p.data,goal:'אסור שישמר חלקית'}}));
 const b=await f.wellness.bundle(client,client.userId);assert.equal(b.records.find(r=>r.kind==='return').version,1);assert.equal(b.records.find(r=>r.kind==='return').data.goal,p.data.goal);assert.equal(b.returnHistoryTotal,1);
});
test('history remains client scoped, is included in owner export and disappears from revoked staff access',async t=>{
 const f=await fixture(t),p=plan();await f.wellness.save(doctor,client.userId,p);
 assert.equal((await f.wellness.bundle(coach,client.userId)).returnHistoryTotal,1);
 await assert.rejects(()=>f.wellness.bundle(stranger,client.userId),e=>e.status===403);
 assert.equal((await f.wellness.bundle(stranger,stranger.userId)).returnHistoryTotal,0);
 const exported=await onboardingStore(f.db,config).export(client);assert.equal(exported.returnPlanHistory.length,1);assert.equal(exported.returnPlanHistory[0].client_id,client.userId);
 const link=(await f.care.bundle(client,client.userId)).connections.find(c=>c.role==='coach');await f.care.revoke(client,{id:link.id});
 await assert.rejects(()=>f.wellness.bundle(coach,client.userId),e=>e.status===403);
 assert.equal((await f.wellness.bundle(client,client.userId)).returnHistoryTotal,1);
});
test('personal measurement writes and client supplied history fields cannot fabricate revisions',async t=>{
 const f=await fixture(t),p=plan();await f.wellness.save(doctor,client.userId,{...p,returnHistory:[{version:999,data:{stage:'חזרה לפעילות'}}]});
 await f.wellness.save(client,client.userId,{id:randomUUID(),kind:'readiness',day:todayIsrael(),version:0,data:{sleep:8,energy:7,stress:2,note:''}});
 const b=await f.wellness.bundle(client,client.userId);assert.equal(b.returnHistoryTotal,1);assert.equal(b.returnHistory[0].version,1);
});
