import test from 'node:test';
import assert from 'node:assert/strict';
import {platform,client} from './platform-db.mjs';
import {membershipStore} from '../lib/membership-store.ts';
const owner={userId:'d8610259-5bae-409f-8e9d-b027617ee91c',email:'dr.tamireilam@gmail.com'};
test('owner can switch their own account without a paid order; access and audit persist together',async t=>{
 const f=platform(t); const m=membershipStore(f.db,owner.email);
 assert.equal((await m.get(owner)).ownerSelfAvailable,true);
 await m.activateSelf(owner);
 const d=await m.get(owner);assert.equal(d.access.mode,'self');assert.equal(d.access.canBuild,true);assert.equal(d.orders.length,0);
 assert.equal(f.sql.prepare("SELECT count(*) AS n FROM audit_events WHERE action='owner_self_activated'").get().n,1);
 const later='2090-01-01T00:00:00.000Z';f.sql.prepare('UPDATE training_access SET self_until=? WHERE user_id=?').run(later,owner.userId);
 await m.activateSelf(owner);assert.equal((await m.get(owner)).access.selfUntil,later);
 assert.equal((await m.get(client)).access.mode,'self');
});
test('different email or missing configured admin authorization cannot grant complementary self access',async t=>{
 const f=platform(t);f.sql.exec('DELETE FROM training_access');const m=membershipStore(f.db,owner.email+',other@example.test');
 for(const u of [{userId:'',email:owner.email},{userId:owner.userId,email:'other@example.test'},{userId:'other',email:'other@example.test'}]){
  assert.equal((await m.get(u)).ownerSelfAvailable,false);await assert.rejects(()=>m.activateSelf(u),e=>e.status===403);
 }
 await assert.rejects(()=>membershipStore(f.db,'other@example.test').activateSelf(owner),e=>e.status===403);
 assert.equal(f.sql.prepare('SELECT count(*) AS n FROM audit_events').get().n,0);
});
test('active owner workout blocks the switch without an entitlement or audit write',async t=>{
 const f=platform(t);f.sql.prepare("INSERT INTO training_sessions(id,owner_id,status,items_json,started_at,pain_before,planned_sets) VALUES('active-owner',?,'active','[]',?,0,1)").run(owner.userId,new Date().toISOString());
 await assert.rejects(()=>membershipStore(f.db,owner.email).activateSelf(owner),e=>e.status===409);
 assert.equal(f.sql.prepare('SELECT count(*) AS n FROM training_access WHERE user_id=?').get(owner.userId).n,0);
 assert.equal(f.sql.prepare('SELECT count(*) AS n FROM audit_events').get().n,0);
});

test('owner access follows authenticated email across site-scoped user ids and only changes that signed-in profile',async t=>{const f=platform(t);const m=membershipStore(f.db,owner.email);const scoped={...owner,userId:'site-scoped-owner'};await m.activateSelf(scoped);assert.equal((await m.get(scoped)).access.canBuild,true);assert.equal((await m.get(owner)).access.canBuild,false);});
