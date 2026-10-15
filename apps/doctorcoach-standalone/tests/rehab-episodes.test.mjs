import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,doctor,coach,client,stranger} from './platform-db.mjs';
import {wellnessStore} from '../lib/wellness-store.ts';
import {todayIsrael} from '../lib/wellness.ts';
const episode=()=>({id:randomUUID(),kind:'episode',version:0,day:todayIsrael(),data:{label:'פציעת ברך מתועדת',region:'ברך',side:'ימין',status:'active'}});
const plan=(episodeId)=>({id:randomUUID(),kind:'return',version:0,day:todayIsrael(),data:{stage:'הערכה',goal:'יעד אישי',criteria:'בדיקה עם הרופא',limits:'',milestones:'[]',...(episodeId?{episodeId}:{})}});
async function fixture(t){const f=platform(t);await f.connect();return {...f,w:wellnessStore(f.db,{adminEmails:doctor.email,clinicianEmails:doctor.email})};}
test('episodes and plans require assigned clinician and owner scoped active episode',async t=>{
 const f=await fixture(t),e=episode();
 for(const u of [client,coach,stranger])await assert.rejects(()=>f.w.save(u,client.userId,e),err=>err.status===403);
 await f.w.save(doctor,client.userId,e);
 await assert.rejects(()=>f.w.save(doctor,client.userId,plan(randomUUID())),err=>err.status===409);
 assert.equal((await f.w.bundle(client,client.userId)).records.filter(r=>r.kind==='episode').length,1);
 assert.equal((await f.w.bundle(stranger,stranger.userId)).records.length,0);
});
test('separate injury plans preserve legacy plan, immutable linkage and independent history',async t=>{
 const f=await fixture(t),a=episode(),b=episode(),legacy=plan();
 await f.w.save(doctor,client.userId,legacy);
 await f.w.save(doctor,client.userId,a);await f.w.save(doctor,client.userId,b);
 const p=plan(a.id),q=plan(b.id);await f.w.save(doctor,client.userId,p);await f.w.save(doctor,client.userId,q);
 const data={...p.data};delete data.episodeId;
 const result=await f.w.save(doctor,client.userId,{...p,version:1,data:{...data,goal:'יעד מתוקן'}});
 assert.equal(result.records.filter(r=>r.kind==='return').length,3);
 assert.equal(result.records.find(r=>r.id===p.id).data.episodeId,a.id);
 assert.equal(result.returnHistoryTotals[a.id],2);assert.equal(result.returnHistoryTotals[b.id],1);
 assert.equal(result.returnHistoryTotals.current,1);
 await assert.rejects(()=>f.w.save(doctor,client.userId,{...p,version:2,data:{...p.data,episodeId:b.id}}),err=>err.status===409);
 await assert.rejects(()=>f.w.save(doctor,client.userId,{...legacy,version:1,data:{...legacy.data,episodeId:a.id}}),err=>err.status===409);
});
test('closed episodes keep history but block new plans and edits until clinician reopens',async t=>{
 const f=await fixture(t),e=episode(),p=plan(e.id);
 await f.w.save(doctor,client.userId,e);await f.w.save(doctor,client.userId,p);
 await f.w.save(doctor,client.userId,{...e,version:1,data:{...e.data,status:'closed'}});
 await assert.rejects(()=>f.w.save(doctor,client.userId,{...p,version:1,data:{...p.data,goal:'שינוי חסום'}}),err=>err.status===409);
 const b=await f.w.bundle(client,client.userId);assert.equal(b.returnHistoryTotals[e.id],1);
 await f.w.save(doctor,client.userId,{...e,version:2});
 assert.equal((await f.w.save(doctor,client.userId,{...p,version:1,data:{...p.data,goal:'יעד חדש'}})).returnHistoryTotals[e.id],2);
});
test('one long episode does not displace another episode history',async t=>{
 const f=await fixture(t),e=episode(),p=plan(e.id),legacy=plan();
 await f.w.save(doctor,client.userId,e);await f.w.save(doctor,client.userId,legacy);await f.w.save(doctor,client.userId,p);
 for(let version=1;version<=51;version++)await f.w.save(doctor,client.userId,{...p,version,data:{...p.data,goal:'יעד '+version}});
 const b=await f.w.bundle(client,client.userId);
 assert.equal(b.returnHistory.filter(r=>r.data.episodeId===e.id).length,50);
 assert.equal(b.returnHistory.filter(r=>!r.data.episodeId).length,1);
 assert.equal(b.returnHistoryTotals[e.id],52);
});
