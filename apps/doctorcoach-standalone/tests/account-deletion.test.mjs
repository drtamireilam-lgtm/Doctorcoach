import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {platform,client,doctor,stranger} from './platform-db.mjs';
import {requestAccount} from '../lib/account-requests.ts';
import {accountDeletionStore,deletionScopes,deletionStatus} from '../lib/account-deletion.ts';
import {dashboardStore} from '../lib/dashboard-store.ts';

async function fixture(t){
 const f=platform(t);await f.connect();const id=crypto.randomUUID();await requestAccount(f.db,client,{id,kind:'deletion',confirmed:true});
 const docId=crypto.randomUUID(),videoId=crypto.randomUUID(),messageId=crypto.randomUUID();
 f.sql.prepare("INSERT INTO private_documents(id,client_id,uploader_id,uploader_name,purpose,category,filename,mime,bytes,object_key,status,created_at) VALUES(?,?,?,'test','medical','other','private.pdf','application/pdf',12,?,'ready','2026-10-11')").run(docId,client.userId,client.userId,`videos/${docId}/attempt`);
 f.sql.prepare("INSERT INTO media_assets(id,owner_id,kind,exercise_id,caption,mime,bytes,object_key,status,created_at) VALUES(?,?,'review','squat','private','video/mp4',32,?,'ready','2026-10-11')").run(videoId,client.userId,`videos/${videoId}/attempt`);
 f.sql.prepare("INSERT INTO team_messages(id,client_id,channel,author_id,author_name,author_role,content,created_at) VALUES(?,?,'medical','doctor','test','clinician','private','2026-10-11')").run(messageId,client.userId);
 f.sql.prepare('INSERT INTO message_links(message_id,document_id,video_id) VALUES(?,?,?)').run(messageId,docId,videoId);
 f.sql.prepare("INSERT INTO document_lifecycle(document_id,updated_at,last_action_id) VALUES(?,'2026-10-11','test')").run(docId);
 const keys=new Set([`videos/${docId}/attempt`,`videos/${videoId}/attempt`,`videos/${videoId}/old-attempt`,'videos/unrelated/keep']);
 let failure=false;const removed=[];const bucket={async delete(key){if(failure)throw Error('storage unavailable');keys.delete(key);removed.push(key);},async list({prefix}){return {objects:[...keys].filter(k=>k.startsWith(prefix)).map(key=>({key})),truncated:false};}};
 const journal={async record(){}};
 const store=accountDeletionStore(f.db,bucket,doctor.email,true,journal),payload={id,confirmed:true,confirmation:id,retentionReviewed:true,externalReviewed:true,retentionDecision:'no_hold'};
 return {...f,id,docId,videoId,messageId,keys,removed,bucket,store,payload,failFiles:value=>failure=value};
}
test('preview is admin-only and disabled-by-default execution changes nothing',async t=>{
 const f=await fixture(t);await assert.rejects(f.store.preview(stranger,f.id),e=>e.status===403);
 const store=accountDeletionStore(f.db,f.bucket,doctor.email);
 assert.equal((await store.preview(doctor,f.id)).enabled,false);
 await assert.rejects(store.execute(doctor,f.payload),e=>e.status===503);
 assert.equal(await deletionStatus(f.db,client.userId),null);assert.equal(f.keys.size,4);
});
test('unconfirmed, wrong-ID, unauthorised and retention-hold requests cannot start deletion',async t=>{
 const f=await fixture(t);await assert.rejects(f.store.execute(stranger,f.payload),e=>e.status===403);
 for(const override of [{confirmed:false},{retentionReviewed:false},{externalReviewed:false},{confirmation:crypto.randomUUID()},{retentionDecision:'required'}])await assert.rejects(f.store.execute(doctor,{...f.payload,...override}),e=>e.status===400);
 assert.equal(await deletionStatus(f.db,client.userId),null);assert.equal(f.removed.length,0);
});
test('purge covers every owned table, removes dependent records and only exact owned files',async t=>{
 const f=await fixture(t);
 // Seed each direct scope not already populated; defaults are left to the schema.
 for(const [table,col] of deletionScopes){if(f.sql.prepare(`SELECT COUNT(*) n FROM ${table} WHERE ${col}=?`).get(client.userId).n)continue;
  const info=f.sql.prepare(`PRAGMA table_info(${table})`).all();const columns=info.filter(c=>c.name===col||c.notnull&&c.dflt_value===null);
  const values=columns.map(c=>c.name===col?client.userId:table==='appearance_preferences'&&c.name==='mode'?'dark':table==='appearance_preferences'&&c.name==='palette'?'blue':table==='workspace_clients'&&c.name==='state'?'archived':table==='workspace_messages'&&c.name==='author_role'?'trainee':table==='activity_cardio_weekly_goals'&&c.name==='author_role'?'owner':/integer|real/i.test(c.type)?12:crypto.randomUUID());
  f.sql.prepare(`INSERT INTO ${table}(${columns.map(c=>c.name).join(',')}) VALUES(${columns.map(()=>'?').join(',')})`).run(...values);
 }
 const other=f.sql.prepare('SELECT * FROM training_access WHERE user_id=?').get(stranger.userId);
 const result=await f.store.execute(doctor,f.payload);assert.equal(result.state,'deleted');
 for(const [table,col] of deletionScopes)assert.equal(f.sql.prepare(`SELECT COUNT(*) n FROM ${table} WHERE ${col}=?`).get(client.userId).n,0,table);
 for(const table of ['message_links','document_lifecycle'])assert.equal(f.sql.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n,0,table);
 assert.deepEqual(f.sql.prepare('SELECT * FROM training_access WHERE user_id=?').get(stranger.userId),other);
 assert.deepEqual([...f.keys],['videos/unrelated/keep']);assert.equal((await deletionStatus(f.db,client.userId)).state,'deleted');
 const calls=f.removed.length;assert.equal((await f.store.execute(doctor,f.payload)).alreadyCompleted,true);assert.equal(f.removed.length,calls);
});
test('storage failure locks access but does not falsely complete or discard retry metadata',async t=>{
 const f=await fixture(t);f.failFiles(true);await assert.rejects(f.store.execute(doctor,f.payload));
 assert.equal((await deletionStatus(f.db,client.userId)).state,'deleting');
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM private_documents').get().n,1);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM user_consents WHERE user_id=?').get(client.userId).n,0);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM care_connections WHERE client_id=?').get(client.userId).n,0);
 assert.throws(()=>f.sql.prepare("INSERT INTO care_profiles(user_id,name,goal,experience,equipment,days,updated_at) VALUES(?,'x','x','x','x',3,'now')").run(client.userId),/write barrier/);
 f.failFiles(false);await f.store.execute(doctor,f.payload);assert.equal((await deletionStatus(f.db,client.userId)).state,'deleted');
});
test('database purge failure leaves resumable lock and rolls back all database removals',async t=>{
 const f=await fixture(t);f.sql.exec("CREATE TRIGGER fail_purge BEFORE DELETE ON care_profiles BEGIN SELECT RAISE(ABORT,'unavailable'); END");
 await assert.rejects(f.store.execute(doctor,f.payload));assert.equal((await deletionStatus(f.db,client.userId)).state,'deleting');
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM private_documents').get().n,1);
 f.sql.exec('DROP TRIGGER fail_purge');await f.store.execute(doctor,f.payload);assert.equal((await deletionStatus(f.db,client.userId)).state,'deleted');
});
test('deleted account cannot be recreated or receive late dependent writes',async t=>{
 const f=await fixture(t);await f.store.execute(doctor,f.payload);
 assert.throws(()=>f.sql.prepare("INSERT INTO training_access(user_id,mode,updated_at) VALUES(?,'self','now')").run(client.userId),/write barrier/);
 assert.throws(()=>f.sql.prepare('INSERT INTO message_links(message_id) VALUES(?)').run(f.messageId),/dependent write barrier/);
 await assert.rejects(requestAccount(f.db,client,{id:crypto.randomUUID(),kind:'deletion',confirmed:true}));
});
test('staff and administrator accounts are protected from trainee purge',async t=>{
 const f=await fixture(t),id=crypto.randomUUID();await requestAccount(f.db,doctor,{id,kind:'deletion',confirmed:true});
 await assert.rejects(f.store.preview(doctor,id),e=>e.status===403);
 f.sql.prepare("INSERT INTO care_staff(email,name,role,updated_at) VALUES(?,'test','coach','now')").run(client.email);
 await assert.rejects(f.store.preview(doctor,f.id),e=>e.status===403);
});
test('missing file binding or legacy unverified identity blocks before creating a lock',async t=>{
 const f=await fixture(t);const store=accountDeletionStore(f.db,null,doctor.email,true);
 await assert.rejects(store.execute(doctor,f.payload),e=>e.status===503);assert.equal(await deletionStatus(f.db,client.userId),null);
 f.sql.prepare('UPDATE account_requests SET requester_email=NULL WHERE id=?').run(f.id);
 await assert.rejects(f.store.execute(doctor,f.payload),e=>e.status===409);assert.equal(await deletionStatus(f.db,client.userId),null);
});
test('unexpected storage keys fail closed without deleting another asset',async t=>{
 const f=await fixture(t);f.sql.prepare('UPDATE private_documents SET object_key=? WHERE id=?').run('videos/unrelated/keep',f.docId);
 await assert.rejects(f.store.execute(doctor,f.payload),e=>e.status===409);assert.ok(f.keys.has('videos/unrelated/keep'));
});
test('ordinary dashboard completion cannot mark a deletion request handled',async t=>{
 const f=await fixture(t);await assert.rejects(dashboardStore(f.db,{adminEmails:doctor.email}).completeRequest(doctor,{id:f.id,confirmed:true}),e=>e.status===409);
 assert.equal(f.sql.prepare('SELECT state FROM account_requests WHERE id=?').get(f.id).state,'pending');
});
test('promotion to staff during lock acquisition prevents deletion',async t=>{
 const f=await fixture(t),prepare=f.db.prepare;
 f.db.prepare=query=>{if(query.startsWith('INSERT INTO account_deletions'))f.sql.prepare("INSERT INTO care_staff(email,name,role,updated_at) VALUES(?,'test','coach','now')").run(client.email);return prepare(query);};
 await assert.rejects(f.store.execute(doctor,f.payload),e=>e.status===409);
 assert.equal(await deletionStatus(f.db,client.userId),null);assert.equal(f.removed.length,0);
});
test('legacy pending request can refresh identity without changing its receipt',async t=>{
 const f=await fixture(t);f.sql.prepare('UPDATE account_requests SET requester_email=NULL WHERE id=?').run(f.id);
 const result=await requestAccount(f.db,client,{id:crypto.randomUUID(),kind:'deletion',confirmed:true});
 assert.equal(result.request.id,f.id);assert.equal(f.sql.prepare('SELECT requester_email FROM account_requests WHERE id=?').get(f.id).requester_email,client.email);
 await f.store.preview(doctor,f.id);
});
test('authentication blocks locked accounts except isolated receipt endpoint',()=>{
 const auth=fs.readFileSync(new URL('../app/chatgpt-auth.ts',import.meta.url),'utf8');
 assert.ok(auth.includes('!options.allowDeleted&&await deletionStatus'));
 const privacy=fs.readFileSync(new URL('../app/api/privacy/route.ts',import.meta.url),'utf8');
 assert.ok(privacy.includes('getChatGPTUser({allowDeleted:true})'));
 assert.ok(privacy.includes('if(deletion)'));
});
