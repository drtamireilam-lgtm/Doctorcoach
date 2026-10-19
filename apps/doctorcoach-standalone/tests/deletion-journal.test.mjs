import test from 'node:test';
import assert from 'node:assert/strict';
import {platform,client,doctor,stranger} from './platform-db.mjs';
import {deletionJournal,restoreDeletionBarrier,reconcileDeletionPage} from '../lib/deletion-journal.ts';
import {accountDeletionStore,deletionStatus} from '../lib/account-deletion.ts';
import {requestAccount} from '../lib/account-requests.ts';
function storage(){
 const files=new Map();let failure=false;
 return {files,fail(value){failure=value;},async get(k){if(failure)throw Error('offline');return files.has(k)?{async text(){return files.get(k);}}:null;},async put(k,v){if(failure)throw Error('offline');files.set(k,v);},async list({prefix}){return {objects:[...files.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key})),truncated:false};}};
}
function receipt(){return {version:1,userId:client.userId,requestId:crypto.randomUUID(),reviewerId:doctor.userId,startedAt:new Date().toISOString()};}
test('journal survives simulated D1 receipt loss and restores access/write barrier',async t=>{
 const f=platform(t),bucket=storage(),j=deletionJournal(bucket),r=receipt();
 await j.record(r);await restoreDeletionBarrier(f.db,r);
 f.sql.exec('DELETE FROM account_deletions');assert.equal(await deletionStatus(f.db,client.userId),null);
 await restoreDeletionBarrier(f.db,await j.read(client.userId));
 assert.equal((await deletionStatus(f.db,client.userId)).state,'deleting');
 assert.throws(()=>f.sql.prepare("INSERT INTO care_profiles(user_id,name,goal,experience,equipment,days,updated_at) VALUES(?,'x','x','x','x',3,'now')").run(client.userId),/write barrier/);
 assert.equal(await j.read(stranger.userId),null);
 assert.ok(![...bucket.files.keys()][0].includes(client.userId));
 const stored=JSON.parse([...bucket.files.values()][0]);assert.deepEqual(Object.keys(stored),['version','userId','requestId','reviewerId','startedAt']);
});
test('record is idempotent and rejects replacement of an account receipt',async()=>{
 const b=storage(),j=deletionJournal(b),r=receipt();await j.record(r);await j.record(r);
 await assert.rejects(j.record({...r,requestId:crypto.randomUUID()}),e=>e.status===409);
 assert.deepEqual(await j.read(r.userId),r);
});
test('unavailable and corrupt storage fail closed',async()=>{
 await assert.rejects(deletionJournal(null).read(client.userId));
 const b=storage(),j=deletionJournal(b),r=receipt();await j.record(r);
 b.fail(true);await assert.rejects(j.read(r.userId));b.fail(false);
 b.files.set([...b.files.keys()][0],'{}');await assert.rejects(j.read(r.userId));
});
test('reconciliation requires administrator and confirmation; only locks, never purges',async t=>{
 const f=platform(t);await f.connect();const j=deletionJournal(storage()),r=receipt();await j.record(r);
 const before=f.sql.prepare('SELECT COUNT(*) n FROM care_profiles').get().n;
 await assert.rejects(reconcileDeletionPage(f.db,j,stranger,doctor.email,{confirmed:true}),e=>e.status===403);
 await assert.rejects(reconcileDeletionPage(f.db,j,doctor,doctor.email,{}),e=>e.status===400);
 assert.deepEqual(await reconcileDeletionPage(f.db,j,doctor,doctor.email,{confirmed:true}),{locked:1,nextCursor:null,complete:true});
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM care_profiles').get().n,before);
 f.sql.prepare("UPDATE account_deletions SET state='deleted',completed_at='old'").run();
 await reconcileDeletionPage(f.db,j,doctor,doctor.email,{confirmed:true});
 assert.equal((await deletionStatus(f.db,r.userId)).state,'deleting');
});
test('journal failure prevents any file/data purge and succeeds on retry',async t=>{
 const f=platform(t);await f.connect();const id=crypto.randomUUID();
 await requestAccount(f.db,client,{id,kind:'deletion',confirmed:true});
 const b=storage(),j=deletionJournal(b),removed=[];
 b.delete=async key=>removed.push(key);
 const store=accountDeletionStore(f.db,b,doctor.email,true,j);
 const payload={id,confirmation:id,confirmed:true,retentionReviewed:true,externalReviewed:true,retentionDecision:'no_hold'};
 b.fail(true);await assert.rejects(store.execute(doctor,payload));
 assert.equal(removed.length,0);assert.equal((await deletionStatus(f.db,client.userId)).state,'deleting');
 assert.ok(f.sql.prepare('SELECT COUNT(*) n FROM care_profiles').get().n>0);
 b.fail(false);await store.execute(doctor,payload);
 assert.equal((await deletionStatus(f.db,client.userId)).state,'deleted');
 assert.equal((await j.read(client.userId)).requestId,id);
});
test('journal listing follows pagination and rejects missing records or mismatched keys',async t=>{
 const f=platform(t),j=deletionJournal(storage()),r=receipt();await j.record(r);
 const first=await j.page();let calls=0;
 const paged={...j,async page(cursor){calls++;return cursor?{receipts:[],cursor:null}:{receipts:first.receipts,cursor:'next'};}};
 const a=await reconcileDeletionPage(f.db,paged,doctor,doctor.email,{confirmed:true});
 assert.equal(a.complete,false);assert.equal(a.nextCursor,'next');
 assert.equal((await reconcileDeletionPage(f.db,paged,doctor,doctor.email,{confirmed:true,cursor:a.nextCursor})).complete,true);
 assert.equal(calls,2);
 const b=storage(),bad=deletionJournal(b);await bad.record(r);b.files.set([...b.files.keys()][0],JSON.stringify({...r,userId:stranger.userId}));
 await assert.rejects(bad.page());
});
