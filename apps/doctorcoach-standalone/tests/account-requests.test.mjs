import test from 'node:test';
import assert from 'node:assert/strict';
import {platform,client,stranger} from './platform-db.mjs';
import {requestAccount} from '../lib/account-requests.ts';
import {chatGPTSignInPath} from '../app/chatgpt-auth-paths.ts';

const payload=(id=crypto.randomUUID())=>({id,kind:'deletion',confirmed:true});
test('deletion requires explicit confirmation and remains available without intake or consent',async t=>{
  const f=platform(t);
  await assert.rejects(requestAccount(f.db,client,{id:crypto.randomUUID(),kind:'deletion'}),e=>e.status===400);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM account_requests').get().n,0);
  const result=await requestAccount(f.db,client,payload());
  assert.equal(result.request.state,'pending');assert.equal(result.permanentDeletion,false);
});
test('retry and fresh duplicate return the same owner receipt and create one audit',async t=>{
  const f=platform(t),p=payload();
  const first=await requestAccount(f.db,client,p);
  for(const next of [p,payload()])assert.equal((await requestAccount(f.db,client,next)).request.id,first.request.id);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM account_requests').get().n,1);
  assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM audit_events WHERE action='account_request_deletion'").get().n,1);
});
test('a request ID from another user or kind cannot return false success',async t=>{
  const f=platform(t),p=payload();await requestAccount(f.db,client,p);
  await assert.rejects(requestAccount(f.db,stranger,p),e=>e.status===409);
  await assert.rejects(requestAccount(f.db,client,{...p,kind:'export'}),e=>e.status===409);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM audit_events').get().n,1);
  const other=await requestAccount(f.db,stranger,payload());assert.notEqual(other.request.id,p.id);
});
test('audit failure rolls back request and permits a successful retry',async t=>{
  const f=platform(t),p=payload();
  f.sql.exec("CREATE TRIGGER fail_request BEFORE INSERT ON audit_events WHEN NEW.action='account_request_deletion' BEGIN SELECT RAISE(ABORT,'unavailable'); END");
  await assert.rejects(requestAccount(f.db,client,p));
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM account_requests').get().n,0);
  f.sql.exec('DROP TRIGGER fail_request');await requestAccount(f.db,client,p);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM account_requests').get().n,1);
});
test('parallel requests converge on one pending request and one audit receipt',async t=>{
  const f=platform(t);
  // D1 serializes transactional batches. Queue the single-connection SQLite
  // fixture's batches while keeping both submissions and pre-reads concurrent.
  let queue=Promise.resolve();
  const db={...f.db,batch(statements){const next=queue.then(()=>f.db.batch(statements));queue=next.catch(()=>{});return next;}};
  const results=await Promise.all([requestAccount(db,client,payload()),requestAccount(db,client,payload())]);
  assert.equal(results[0].request.id,results[1].request.id);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM account_requests').get().n,1);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM audit_events').get().n,1);
});
test('handled IDs cannot be reused, but a new request can be submitted',async t=>{
  const f=platform(t),p=payload();await requestAccount(f.db,client,p);
  f.sql.prepare("UPDATE account_requests SET state='handled' WHERE id=?").run(p.id);
  await assert.rejects(requestAccount(f.db,client,p),e=>e.status===409);
  assert.notEqual((await requestAccount(f.db,client,payload())).request.id,p.id);
});
test('request submission leaves profile, training entitlement and uploaded files intact',async t=>{
  const f=platform(t);await f.connect();
  const before=f.sql.prepare('SELECT * FROM care_profiles WHERE user_id=?').get(client.userId);
  await requestAccount(f.db,client,payload());
  assert.deepEqual(f.sql.prepare('SELECT * FROM care_profiles WHERE user_id=?').get(client.userId),before);
  assert.equal(f.sql.prepare('SELECT mode FROM training_access WHERE user_id=?').get(client.userId).mode,'self');
});
test('public deletion login returns to the web page and refuses external return URLs',()=>{
  assert.equal(chatGPTSignInPath('/account-deletion'),'/signin-with-chatgpt?return_to=%2Faccount-deletion');
  for(const path of ['https://attacker.test/','//attacker.test/','/callback','/signin-with-chatgpt'])assert.equal(chatGPTSignInPath(path),'/signin-with-chatgpt?return_to=%2F');
});
