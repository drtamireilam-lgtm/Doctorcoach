import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {platform,client,stranger} from './platform-db.mjs';
import {identityMapping,verifyIdentity} from '../lib/identity-mapping.ts';
import {defaultPrescription} from '../lib/training.ts';

const schema=await readFile(new URL('./fixtures/identity-mapping.sql',import.meta.url),'utf8');
const legacyIssuer='sites:synthetic-doctorcoach',externalIssuer='https://synthetic-auth.example.test';
const baseTime=Date.parse('2026-10-11T04:00:00Z');
async function fixture(t){
  const f=platform(t);f.sql.exec(schema);
  let time=baseTime,queue=Promise.resolve();
  // D1 serializes its transactional batches; the SQLite fixture has one connection.
  const db={...f.db,batch(statements){const next=queue.then(()=>f.db.batch(statements));queue=next.catch(()=>{});return next;}};
  const store=identityMapping(db,{legacyIssuer,externalIssuers:[externalIssuer,'https://second-auth.example.test'],now:()=>time});
  // This HMAC verifier exists ONLY in tests, and validates synthetic signatures.
  // Production needs a provider adapter validating audience and session state too.
  const key=await crypto.subtle.generateKey({name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
  async function sign(claims){const body=Buffer.from(JSON.stringify(claims)).toString('base64url');const signature=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(body));return body+'.'+Buffer.from(signature).toString('base64url');}
  async function verifier(token){const [body,signature,...extra]=token.split('.');if(extra.length||!body||!signature)return null;const ok=await crypto.subtle.verify('HMAC',key,Buffer.from(signature,'base64url'),new TextEncoder().encode(body));return ok?JSON.parse(Buffer.from(body,'base64url').toString()):null;}
  const claims=(issuer,subject,extra={})=>({issuer,subject,authenticatedAt:time,expiresAt:time+3600000,...extra});
  const proof=async(issuer,subject,extra={})=>verifyIdentity(await sign(claims(issuer,subject,extra)),verifier,[legacyIssuer,externalIssuer,'https://second-auth.example.test'],time);
  const old=await proof(legacyIssuer,client.userId),external=await proof(externalIssuer,'mobile-client');
  const register=()=>store.registerLegacy(old);
  return {...f,db,store,old,external,register,proof,sign,verifier,claims,setTime:value=>{time=value;},time:()=>time};
}
const rejected=status=>error=>error.status===status;

test('only verifier-issued immutable identities are accepted; JSON copies cannot impersonate a user',async t=>{
  const f=await fixture(t);assert.equal(Object.isFrozen(f.external),true);
  await assert.rejects(f.store.createAccount({...f.external}),rejected(401));
  await assert.rejects(f.store.registerLegacy(JSON.parse(JSON.stringify(f.old))),rejected(401));
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dc_identity_principals').get().n,0);
});
test('tampered signature, wrong issuer, expired and future proofs are rejected',async t=>{
  const f=await fixture(t),token=await f.sign(f.claims(externalIssuer,'x'));
  await assert.rejects(verifyIdentity(token+'broken',f.verifier,[externalIssuer],f.time()),rejected(401));
  for(const extra of [{issuer:'https://attacker.example.test'},{expiresAt:f.time()},{authenticatedAt:f.time()+60000},{subject:' x '}]){
    await assert.rejects(verifyIdentity(await f.sign(f.claims(externalIssuer,'x',extra)),f.verifier,[externalIssuer],f.time()),rejected(401));
  }
});
test('verified linking preserves the original owner and existing medical profile, program and consents',async t=>{
  const f=await fixture(t);await f.connect();await f.training.savePlan(client.userId,defaultPrescription('goblet'));
  const before=await f.care.bundle(client,client.userId),consents=f.sql.prepare('SELECT * FROM user_consents WHERE user_id=? ORDER BY id').all(client.userId);
  await f.register();const challenge=await f.store.beginLink(f.old,f.external);
  assert.equal((await f.store.completeLink(challenge.ticket,f.old,f.external,true)).userId,client.userId);
  const linked=await f.store.resolve(f.external);
  const after=await f.care.bundle({...client,userId:linked.userId},client.userId);
  assert.deepEqual(after,before);assert.deepEqual(f.sql.prepare('SELECT * FROM user_consents WHERE user_id=? ORDER BY id').all(client.userId),consents);
  await assert.rejects(f.care.bundle(stranger,linked.userId),rejected(403));
});
test('new identities receive stable server IDs without profile data, team roles or paid access',async t=>{
  const f=await fixture(t),a=await f.store.createAccount(f.external),b=await f.store.createAccount(f.external);
  assert.equal(a.userId,b.userId);assert.match(a.userId,/^dc:/);
  for(const table of ['care_profiles','care_staff'])assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM '+table).get().n,0);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM training_access WHERE user_id=?').get(a.userId).n,0);
  await assert.rejects(f.training.savePlan(a.userId,defaultPrescription('goblet')),rejected(403));
});
test('same email does not link identities, and issuer plus subject are case-sensitive keys',async t=>{
  const f=await fixture(t),a=await f.store.createAccount(await f.proof(externalIssuer,'Case',{email:'same@example.test'}));
  const b=await f.store.createAccount(await f.proof(externalIssuer,'case',{email:'same@example.test'}));
  const c=await f.store.createAccount(await f.proof('https://second-auth.example.test','Case',{email:'same@example.test'}));
  assert.equal(new Set([a.userId,b.userId,c.userId]).size,3);
  assert.equal('email' in f.external,false);
});
test('external identity cannot register itself as a legacy owner and unresolved login fails closed',async t=>{
  const f=await fixture(t);
  await assert.rejects(f.store.registerLegacy(f.external),rejected(401));
  await assert.rejects(f.store.resolve(f.external),rejected(404));
});
test('confirmation and both bound identities are required; rejected attempts do not consume the ticket',async t=>{
  const f=await fixture(t);await f.register();const challenge=await f.store.beginLink(f.old,f.external),other=await f.proof(externalIssuer,'another');
  await assert.rejects(f.store.completeLink(challenge.ticket,f.old,f.external,false),rejected(400));
  await assert.rejects(f.store.completeLink(challenge.ticket,f.old,other,true),rejected(403));
  await assert.rejects(f.store.completeLink(challenge.ticket,await f.proof(legacyIssuer,stranger.userId),f.external,true),rejected(403));
  await assert.rejects(f.store.completeLink('bad-ticket',f.old,f.external,true),rejected(403));
  assert.equal((await f.store.completeLink(challenge.ticket,f.old,f.external,true)).userId,client.userId);
});
test('tickets are hashed, expire at their boundary and cannot be replayed',async t=>{
  const f=await fixture(t);await f.register();const first=await f.store.beginLink(f.old,f.external);
  assert.equal(JSON.stringify(f.sql.prepare('SELECT * FROM dc_identity_challenges').all()).includes(first.ticket),false);
  await f.store.completeLink(first.ticket,f.old,f.external,true);
  await assert.rejects(f.store.completeLink(first.ticket,f.old,f.external,true),rejected(403));
  const second=await f.store.beginLink(f.old,await f.proof(externalIssuer,'second'));
  f.setTime(second.expiresAt);
  await assert.rejects(f.store.completeLink(second.ticket,f.old,await f.proof(externalIssuer,'second'),true),rejected(403));
});
test('a later link for the same owner is safe; a pre-existing different account cannot be merged',async t=>{
  const f=await fixture(t);await f.register();
  for(let i=0;i<2;i++){const c=await f.store.beginLink(f.old,f.external);await f.store.completeLink(c.ticket,f.old,f.external,true);}
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dc_identity_aliases WHERE issuer=? AND subject=?').get(externalIssuer,f.external.subject).n,1);
  const other=await f.proof(externalIssuer,'new-account');await f.store.createAccount(other);
  await assert.rejects(f.store.beginLink(f.old,other),rejected(409));
});
test('stale authentication and proofs that expire after verification cannot authorize a link',async t=>{
  const f=await fixture(t);await f.register();f.setTime(baseTime+10*60000+1);
  await assert.rejects(f.store.beginLink(f.old,f.external),rejected(401));
  f.setTime(baseTime+3600000);await assert.rejects(f.store.createAccount(f.external),rejected(401));
});
test('blocked and deleted principals cannot resolve, link, or be recreated',async t=>{
  const f=await fixture(t);await f.register();const challenge=await f.store.beginLink(f.old,f.external);
  for(const state of ['blocked','deleted']){
    f.sql.prepare('UPDATE dc_identity_principals SET state=? WHERE id=?').run(state,client.userId);
    await assert.rejects(f.store.registerLegacy(f.old),rejected(403));
    await assert.rejects(f.store.completeLink(challenge.ticket,f.old,f.external,true),rejected(403));
  }
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dc_identity_aliases WHERE issuer=?').get(externalIssuer).n,0);
});
test('receipt failure rolls back alias insertion and ticket consumption together',async t=>{
  const f=await fixture(t);await f.register();const c=await f.store.beginLink(f.old,f.external);
  f.sql.exec("CREATE TRIGGER fail_identity_receipt BEFORE INSERT ON dc_identity_link_receipts BEGIN SELECT RAISE(ABORT,'audit unavailable'); END");
  await assert.rejects(f.store.completeLink(c.ticket,f.old,f.external,true));
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dc_identity_aliases WHERE issuer=?').get(externalIssuer).n,0);
  assert.equal(f.sql.prepare('SELECT consumed_at FROM dc_identity_challenges').get().consumed_at,null);
  f.sql.exec('DROP TRIGGER fail_identity_receipt');await f.store.completeLink(c.ticket,f.old,f.external,true);
});
test('two accounts racing for one identity have one winner and preserve the winner ownership',async t=>{
  const f=await fixture(t);await f.register();const old2=await f.proof(legacyIssuer,stranger.userId);await f.store.registerLegacy(old2);
  const a=await f.store.beginLink(f.old,f.external),b=await f.store.beginLink(old2,f.external);
  const results=await Promise.allSettled([f.store.completeLink(a.ticket,f.old,f.external,true),f.store.completeLink(b.ticket,old2,f.external,true)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.filter(r=>r.status==='rejected').length,1);
  assert.equal((await f.store.resolve(f.external)).userId,results.find(r=>r.status==='fulfilled').value.userId);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dc_identity_link_receipts').get().n,1);
});
test('parallel completion of a single ticket has one operation receipt',async t=>{
  const f=await fixture(t);await f.register();const c=await f.store.beginLink(f.old,f.external);
  const results=await Promise.allSettled([f.store.completeLink(c.ticket,f.old,f.external,true),f.store.completeLink(c.ticket,f.old,f.external,true)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dc_identity_link_receipts').get().n,1);
});
test('parallel registration does not create orphan duplicate principals',async t=>{
  const f=await fixture(t),results=await Promise.all([f.store.createAccount(f.external),f.store.createAccount(f.external)]);
  assert.equal(results[0].userId,results[1].userId);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dc_identity_principals').get().n,1);
});
test('account blocking between the pre-read and transactional link prevents all linking writes',async t=>{
  const f=await fixture(t);await f.register();const c=await f.store.beginLink(f.old,f.external);
  const db={...f.db,async batch(statements){f.sql.prepare("UPDATE dc_identity_principals SET state='blocked' WHERE id=?").run(client.userId);return f.db.batch(statements);}};
  const store=identityMapping(db,{legacyIssuer,externalIssuers:[externalIssuer],now:f.time});
  await assert.rejects(store.completeLink(c.ticket,f.old,f.external,true),rejected(409));
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dc_identity_aliases WHERE issuer=?').get(externalIssuer).n,0);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dc_identity_link_receipts').get().n,0);
  assert.equal(f.sql.prepare('SELECT consumed_at FROM dc_identity_challenges').get().consumed_at,null);
});
test('legacy registration refuses a canonical ID already originating from another identity',async t=>{
  const f=await fixture(t);
  f.sql.prepare("INSERT INTO dc_identity_principals(id,state,origin_issuer,origin_subject,created_at) VALUES(?,'active',?,?,?)").run(client.userId,externalIssuer,'different',f.time());
  await assert.rejects(f.register(),rejected(409));
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dc_identity_aliases').get().n,0);
});
test('blocked or deleted external accounts cannot be recreated by signing in again',async t=>{
  const f=await fixture(t),account=await f.store.createAccount(f.external);
  for(const state of ['blocked','deleted']){
    f.sql.prepare('UPDATE dc_identity_principals SET state=? WHERE id=?').run(state,account.userId);
    await assert.rejects(f.store.resolve(f.external),rejected(403));
    await assert.rejects(f.store.createAccount(f.external),rejected(403));
  }
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dc_identity_principals').get().n,1);
});
