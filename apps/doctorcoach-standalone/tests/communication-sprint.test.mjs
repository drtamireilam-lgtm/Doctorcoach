import test from 'node:test';
import assert from 'node:assert/strict';
import {platform,client,doctor,coach,stranger} from './platform-db.mjs';
import {communicationStore} from '../lib/communication-store.ts';
import {privateDocumentStore} from '../lib/private-document-store.ts';
async function fixture(t){const f=platform(t);await f.connect();return {...f,store:communicationStore(f.db,{clinicianEmails:doctor.email}),documents:privateDocumentStore(f.db,{clinicianEmails:doctor.email})};}
const msg=(content='Text',channel='training')=>({id:crypto.randomUUID(),clientId:client.userId,channel,content});
test('read receipts, handling status and reopening preserve one conversation history',async t=>{const f=await fixture(t),m=msg();await f.store.send(client,m);let r=await f.store.list(client,client.userId,'training');assert.equal(r.messages[0].read,false);await f.store.read(coach,{clientId:client.userId,channel:'training',messageId:m.id});r=await f.store.list(client,client.userId,'training');assert.equal(r.messages[0].read,true);await f.store.resolve(coach,{clientId:client.userId,channel:'training'});assert.equal((await f.store.list(client,client.userId,'training')).resolved,true);await f.store.send(client,msg('new'));assert.equal((await f.store.list(client,client.userId,'training')).resolved,false);await assert.rejects(f.store.resolve(client,{clientId:client.userId,channel:'training'}),e=>e.status===403);});
test('unauthorized users and revoked staff cannot search or send messages',async t=>{const f=await fixture(t);await f.store.send(client,msg('secret'));await assert.rejects(f.store.list(stranger,client.userId,'training','secret'),e=>e.status===403);f.sql.exec("UPDATE care_connections SET active=0 WHERE staff_email='coach@example.test'");await assert.rejects(f.store.list(coach,client.userId,'training','secret'),e=>e.status===403);await assert.rejects(f.store.send(coach,msg()),e=>e.status===403);assert.equal((await f.store.list(client,client.userId,'training')).messages.length,1);});
test('attachments send atomically, retry exactly and cannot cross channels or purposes',async t=>{const f=await fixture(t),p={id:crypto.randomUUID(),clientId:client.userId,purpose:'message',channel:'training',mime:'application/pdf',filename:'training.pdf',bytes:16};await f.documents.initialize(client,p);await f.documents.ready(client,p.id,'key');const m={...msg(),documentId:p.id};await f.store.send(client,m);await f.store.send(client,m);assert.equal((await f.store.list(coach,client.userId,'training')).messages[0].documentId,p.id);await assert.rejects(f.store.send(client,{...m,id:crypto.randomUUID(),channel:'medical'}),e=>e.status===403);await assert.rejects(f.store.send(client,{...m,documentId:null}),e=>e.status===409);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM team_messages').get().n,1);});
test('foreign workout references cannot create a message',async t=>{const f=await fixture(t);await assert.rejects(f.store.send(client,{...msg(),sessionId:crypto.randomUUID()}),e=>e.status===403);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM team_messages').get().n,0);});
test('permission revoked between authorization and batch blocks all writes',async t=>{const f=await fixture(t),batch=f.db.batch;f.db.batch=async stmts=>{f.sql.exec("UPDATE care_connections SET active=0 WHERE staff_email='coach@example.test'");return batch(stmts);};await assert.rejects(f.store.send(coach,msg()),e=>e.status===403);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM team_messages').get().n,0);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM message_links').get().n,0);});
test('search reaches an older message outside the latest 100',async t=>{const f=await fixture(t);for(let i=0;i<110;i++)f.sql.prepare('INSERT INTO team_messages(id,client_id,channel,author_id,author_name,author_role,content,created_at) VALUES(?,?,?,?,?,?,?,?)').run(crypto.randomUUID(),client.userId,'training',client.userId,'Test','trainee',i===0?'needle old':'Other','2026-10-01');assert.equal((await f.store.list(client,client.userId,'training')).messages.length,100);const found=await f.store.list(client,client.userId,'training','needle');assert.equal(found.messages.length,1);assert.equal(found.messages[0].content,'needle old');});

test('withdrawn media consent prevents sharing an existing attachment',async t=>{const f=await fixture(t),p={id:crypto.randomUUID(),clientId:client.userId,purpose:'message',channel:'training',mime:'application/pdf',filename:'training.pdf',bytes:16};await f.documents.initialize(client,p);await f.documents.ready(client,p.id,'key');f.sql.prepare("UPDATE user_consents SET accepted=0 WHERE user_id=? AND consent_id='media'").run(client.userId);await assert.rejects(f.store.send(client,{...msg(),documentId:p.id}),e=>e.status===403);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM team_messages').get().n,0);});

test('handling an older displayed message cannot silently close a newly arrived message',async t=>{
 const f=await fixture(t),first=msg();await f.store.send(client,first);await f.store.read(coach,{clientId:client.userId,channel:'training',messageId:first.id});
 await f.store.send(client,msg('new while staff is reading'));
 await assert.rejects(f.store.resolve(coach,{clientId:client.userId,channel:'training',messageId:first.id}),e=>e.status===409);
 assert.equal((await f.store.list(client,client.userId,'training')).resolved,false);
 const latest=(await f.store.list(coach,client.userId,'training')).messages.at(-1);
 await f.store.resolve(coach,{clientId:client.userId,channel:'training',messageId:latest.id});
 assert.equal((await f.store.threads(client)).find(t=>t.channel==='training').resolved,true);
 await f.store.send(client,msg('reopened'));
 assert.equal((await f.store.threads(client)).find(t=>t.channel==='training').resolved,false);
});
test('an unrelated or foreign-channel message cannot be used as the handling checkpoint',async t=>{
 const f=await fixture(t),m=msg('medical','medical');await f.store.send(client,m);
 await assert.rejects(f.store.resolve(coach,{clientId:client.userId,channel:'training',messageId:m.id}),e=>e.status===409);
});
