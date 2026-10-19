import test from 'node:test';
import assert from 'node:assert/strict';
import {platform,client,doctor,coach} from './platform-db.mjs';
import {privateDocumentStore} from '../lib/private-document-store.ts';
async function fixture(t){
 const f=platform(t);await f.connect();const docs=privateDocumentStore(f.db,{clinicianEmails:doctor.email});
 const id=crypto.randomUUID();await docs.initialize(client,{id,clientId:client.userId,purpose:'medical',category:'blood',filename:'synthetic.pdf',mime:'application/pdf',bytes:16});await docs.ready(client,id,'synthetic-key');
 return {...f,docs,id};
}
function onAudit(f,change){
 const prepare=f.db.prepare.bind(f.db);
 f.db.prepare=q=>{const s=prepare(q);if(!q.startsWith('INSERT INTO audit_events'))return s;
  const wrap=b=>({...b,bind(...args){return wrap(b.bind(...args));},async run(){const result=await b.run();change();return result;}});
  return wrap(s);
 };
}
for(const [name,change] of [
 ['medical sharing revoked',f=>f.sql.exec('UPDATE care_connections SET medical_access=0')],
 ['health consent withdrawn',f=>f.sql.exec("UPDATE user_consents SET accepted=0 WHERE consent_id='health'")],
 ['document archived',f=>f.sql.prepare("UPDATE private_documents SET status='archived' WHERE id=?").run(f.id)],
 ['document reassigned',f=>f.sql.prepare("UPDATE private_documents SET client_id='stranger' WHERE id=?").run(f.id)],
])test('document metadata is withheld when '+name+' during final audit',async t=>{
 const f=await fixture(t);onAudit(f,()=>change(f));
 await assert.rejects(f.docs.list(doctor,client.userId),e=>e.status===403);
});
test('owner cannot receive an archived captured document after final audit',async t=>{
 const f=await fixture(t);onAudit(f,()=>f.sql.prepare("UPDATE private_documents SET status='archived' WHERE id=?").run(f.id));
 await assert.rejects(f.docs.list(client,client.userId),e=>e.status===403);
});
for(const viewer of [doctor,coach])test('team bundle rejects withdrawn health consent for '+viewer.userId+' while owner retains records',async t=>{
 const f=await fixture(t);f.sql.exec("UPDATE user_consents SET accepted=0 WHERE consent_id='health'");
 await assert.rejects(f.care.bundle(viewer,client.userId),e=>e.status===403);
 assert.equal((await f.care.bundle(client,client.userId)).profile.userId,client.userId);
});
for(const grant of ['health','media'])test('private review video denies staff after '+grant+' withdrawal but owner retains access',async t=>{
 const f=await fixture(t),id=crypto.randomUUID();
 await f.media.initialize(client,{id,kind:'review',exerciseId:'goblet',caption:'Synthetic',mime:'video/mp4',bytes:64});await f.media.ready(client,id);
 f.sql.prepare('UPDATE user_consents SET accepted=0 WHERE consent_id=?').run(grant);
 await assert.rejects(f.media.list(coach,'review',client.userId),e=>e.status===403);
 await assert.rejects(f.media.readable(coach,id),e=>e.status===403);
 assert.equal((await f.media.readable(client,id)).id,id);
});
