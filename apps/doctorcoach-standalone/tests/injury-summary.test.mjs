import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,doctor,client,stranger} from './platform-db.mjs';
import {wellnessStore} from '../lib/wellness-store.ts';
import {todayIsrael} from '../lib/wellness.ts';
import {latestEpisodeMeasurement} from '../lib/rehab-measurements.ts';
const episode=()=>({id:randomUUID(),kind:'episode',day:todayIsrael(),version:0,data:{label:'פציעה מתועדת',region:'ברך',side:'ימין',status:'active'}});
const measurement=(episodeId,day='2026-01-01')=>({id:randomUUID(),kind:'rehab',day,version:0,data:{episodeId,region:'ברך',side:'ימין',motion:'כפיפת ברך',pain:0,rom:null,functionScore:0,response:'לפני אימון',note:''}});
const record=(p,updatedAt='2026-01-01T12:00:00Z')=>({...p,slot:p.id,version:1,authorName:'דיווח אישי',updatedAt});
async function fixture(t){const f=platform(t);await f.connect();return {...f,w:wellnessStore(f.db,{adminEmails:doctor.email,clinicianEmails:doctor.email})};}
test('injury summary selects only explicit anatomically matching measurements and retains zero/missing values',()=>{
 const e=record(episode()),m=record(measurement(e.id));
 const unassigned=record(measurement(undefined,'2026-02-01'));
 const other=record(measurement(randomUUID(),'2026-02-01'));
 const mismatch={...m,id:randomUUID(),day:'2026-02-01',data:{...m.data,side:'שמאל'}};
 const rows=[unassigned,other,mismatch,m];
 const before=[...rows];
 assert.equal(latestEpisodeMeasurement(rows,e),m);
 assert.equal(latestEpisodeMeasurement(rows,e).data.pain,0);
 assert.equal(latestEpisodeMeasurement(rows,e).data.rom,null);
 assert.equal(latestEpisodeMeasurement(rows,e).data.functionScore,0);
 assert.deepEqual(rows,before);
 assert.equal(latestEpisodeMeasurement(rows,record(episode())),undefined);
 assert.equal(latestEpisodeMeasurement(rows,m),undefined);
});
test('measurement date precedes edit time; same-day edits and ties sort deterministically',()=>{
 const e=record(episode()),old=record(measurement(e.id),'2026-10-01T12:00:00Z');
 const recent=record(measurement(e.id,'2026-02-01'),'2026-02-01T12:00:00Z');
 assert.equal(latestEpisodeMeasurement([old,recent],e),recent);
 const updated={...recent,id:'b',updatedAt:'2026-03-01T12:00:00Z'},tie={...updated,id:'c'};
 assert.equal(latestEpisodeMeasurement([updated,old,recent,tie],e),tie);
 assert.equal(latestEpisodeMeasurement([tie,recent,old,updated],e),tie);
});
test('latest linked measurements survive general log limit, remain owner scoped and survive closure',async t=>{
 const f=await fixture(t),a=episode(),b=episode();
 await f.w.save(doctor,client.userId,a);await f.w.save(doctor,client.userId,b);
 const old=measurement(a.id),newer=measurement(a.id,'2026-02-01'),other=measurement(b.id,'2026-03-01');
 for(const p of [old,newer,other])await f.w.save(client,client.userId,p);
 // An edit to an older observation must not become the latest observation.
 await f.w.save(client,client.userId,{...old,version:1,data:{...old.data,pain:4}});
 const insert=f.sql.prepare("INSERT INTO wellness_records(id,client_id,kind,slot,day,content_json,author_name,updated_at) VALUES(?,?,'rehab',?,?,?,?,?)");
 f.sql.exec('BEGIN');
 for(let i=0;i<740;i++){const p=measurement(undefined,todayIsrael());insert.run(p.id,client.userId,p.id,p.day,JSON.stringify(p.data),'דיווח אישי',new Date().toISOString());}
 f.sql.exec('COMMIT');
 await f.w.save(doctor,client.userId,{...a,version:1,data:{...a.data,status:'closed'}});
 const bundle=await f.w.bundle(client,client.userId);
 assert.equal(latestEpisodeMeasurement(bundle.records,record(a)).id,newer.id);
 assert.equal(latestEpisodeMeasurement(bundle.records,record(b)).id,other.id);
 assert.equal(bundle.records.find(r=>r.id===a.id).data.status,'closed');
 assert.equal((await f.w.bundle(stranger,stranger.userId)).records.some(r=>[newer.id,other.id].includes(r.id)),false);
 await assert.rejects(()=>f.w.bundle(stranger,client.userId),err=>err.status===403);
});
