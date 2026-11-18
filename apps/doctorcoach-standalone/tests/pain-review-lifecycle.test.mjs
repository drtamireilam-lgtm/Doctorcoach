import test from 'node:test';
import assert from 'node:assert/strict';
import {platform,client,doctor,stranger} from './platform-db.mjs';
import {onboardingStore} from '../lib/onboarding-store.ts';
import {accountDeletionStore} from '../lib/account-deletion.ts';
import {requestAccount} from '../lib/account-requests.ts';
const config={adminEmails:doctor.email,clinicianEmails:doctor.email};
function seed(f,owner,id){f.sql.prepare("INSERT INTO pain_modification_reviews(id,owner_id,coach_email,request_json,report_json,actor_id,created_at,updated_at) VALUES(?,?,?,'{}',?,?,?,?)").run(id,owner,doctor.email,JSON.stringify({id:'source',data:{notes:'private-location-'+owner}}),owner,'2026-11-16T10:00:00Z','2026-11-16T10:00:00Z');}
test('owner export includes only own review snapshots and audit, health revocation excludes them',async t=>{
 const f=platform(t);await f.connect();seed(f,client.userId,'own');seed(f,stranger.userId,'foreign');
 const store=onboardingStore(f.db,config),data=await store.export(client);
 assert.equal(data.painModificationReviews.length,1);assert.equal(data.painModificationReviews[0].id,'own');assert.equal(data.painModificationReviewEvents.length,1);
 assert.ok(!JSON.stringify(data.painModificationReviews).includes('private-location-stranger'));
 f.sql.prepare("UPDATE user_consents SET accepted=0 WHERE user_id=? AND consent_id='health'").run(client.userId);
 const revoked=await store.export(client);assert.deepEqual(revoked.painModificationReviews,[]);assert.deepEqual(revoked.painModificationReviewEvents,[]);
});
test('approved account purge removes private review copies and events while preserving another owner',async t=>{
 const f=platform(t);await f.connect();seed(f,client.userId,'own');seed(f,stranger.userId,'foreign');
 const id=crypto.randomUUID();await requestAccount(f.db,client,{id,kind:'deletion',confirmed:true});
 const bucket={async delete(){},async list(){return {objects:[],truncated:false};}},journal={async record(){}};
 const store=accountDeletionStore(f.db,bucket,doctor.email,true,journal);
 await store.execute(doctor,{id,confirmed:true,confirmation:id,retentionReviewed:true,externalReviewed:true,retentionDecision:'no_hold'});
 assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM pain_modification_reviews WHERE owner_id=?").get(client.userId).n,0);
 assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM pain_modification_review_events WHERE review_id='own'").get().n,0);
 assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM pain_modification_reviews WHERE owner_id=?").get(stranger.userId).n,1);
 assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM pain_modification_review_events WHERE review_id='foreign'").get().n,1);
});
