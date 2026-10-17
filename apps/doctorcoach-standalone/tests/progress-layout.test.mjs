import test from 'node:test';
import assert from 'node:assert/strict';
import {platform} from './platform-db.mjs';
import {progressCards,parseProgressOrder,moveProgressCard,progressLayoutStore} from '../lib/progress-layout.ts';
test('pain can move to the top without dropping or duplicating any card',()=>{
 const original=[...progressCards],next=moveProgressCard(original,'recovery','consistency');
 assert.equal(next[0],'recovery');assert.deepEqual(parseProgressOrder(next),next);assert.deepEqual(original,[...progressCards]);
 for(const invalid of [[],['recovery'],[...progressCards,'body'],['body','body','body','body','body'],['__proto__',...progressCards.slice(1)]])assert.throws(()=>parseProgressOrder(invalid));
});
test('layout is persistent and owner scoped; concurrent edits cannot silently overwrite',async t=>{
 const f=platform(t),store=progressLayoutStore(f.db);const order=moveProgressCard([...progressCards],'recovery','consistency');
 assert.deepEqual(await store.get('one'),{order:[...progressCards],version:0});
 const saved=await store.save('one',{order,version:0,userId:'other'});assert.equal(saved.version,1);
 assert.deepEqual((await progressLayoutStore(f.db).get('one')).order,order);assert.deepEqual((await store.get('other')).order,[...progressCards]);
 await assert.rejects(()=>store.save('one',{order:[...progressCards],version:0}),e=>e.status===409);
 const fresh=await store.save('one',{order:[...progressCards],version:1});assert.equal(fresh.version,2);
 await assert.rejects(()=>store.save('one',{order,version:1}),e=>e.status===409);
});
test('invalid order/version cannot change the saved preference or training data',async t=>{
 const f=platform(t),store=progressLayoutStore(f.db);await store.save('one',{order:[...progressCards],version:0});
 for(const payload of [{order:[],version:1},{order:[...progressCards],version:-1},{order:[...progressCards],version:'1'}])await assert.rejects(()=>store.save('one',payload));
 assert.equal((await store.get('one')).version,1);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM training_sessions').get().n,0);
});
test('account deletion write barrier blocks preference creation and updates',async t=>{
 const f=platform(t),store=progressLayoutStore(f.db);await store.save('existing',{order:[...progressCards],version:0});
 for(const id of ['new','existing'])f.sql.prepare("INSERT INTO account_deletions(user_id,request_id,state,reviewer_id,started_at) VALUES(?,?,'deleting','admin','2026-10-16')").run(id,'request-'+id);
 await assert.rejects(()=>store.save('new',{order:[...progressCards],version:0}));await assert.rejects(()=>store.save('existing',{order:[...progressCards],version:1}));assert.equal((await store.get('existing')).version,1);
});
