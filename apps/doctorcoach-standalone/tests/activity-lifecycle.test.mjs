import test from 'node:test';
import assert from 'node:assert/strict';
import {platform,client,stranger,doctor} from './platform-db.mjs';
import {onboardingStore} from '../lib/onboarding-store.ts';
import {activityStore} from '../lib/activity-store.ts';
import {deletionScopes,accountDeletionStore} from '../lib/account-deletion.ts';
import {requestAccount} from '../lib/account-requests.ts';

test('account data export includes owned source history, goals and sharing without another owner',async t=>{
 const f=platform(t);await f.connect();const activity=activityStore(f.db);
 const own=await activity.mutate(client,{action:'connect',accountScope:client.userId,consent:true,platform:'healthkit',timezone:'UTC'});
 const other=await activity.mutate(stranger,{action:'connect',accountScope:stranger.userId,consent:true,platform:'health_connect',timezone:'UTC'});
 await activity.mutate(client,{action:'goal',accountScope:client.userId,dailyTarget:2500,weeklyTarget:null,version:0});
 const exported=await onboardingStore(f.db,{adminEmails:doctor.email,clinicianEmails:doctor.email}).export(client);
 assert.equal(exported.activityConnections[0].id,own.connection.id);
 assert.equal(exported.activityGoals[0].daily_target,2500);
 assert.equal(JSON.stringify(exported).includes(other.connection.id),false);
 assert.deepEqual(exported.activityDays,[]);assert.deepEqual(exported.activityShares,[]);
});
test('account purge covers activity snapshots, source connections, goal and sharing history',async t=>{
 const f=platform(t);await f.connect();const activity=activityStore(f.db);
 await activity.mutate(client,{action:'connect',accountScope:client.userId,consent:true,platform:'healthkit',timezone:'UTC'});
 await activity.mutate(stranger,{action:'connect',accountScope:stranger.userId,consent:true,platform:'health_connect',timezone:'UTC'});
 const id=crypto.randomUUID();await requestAccount(f.db,client,{id,kind:'deletion',confirmed:true});
 const bucket={async delete(){},async list(){return {objects:[],truncated:false};}},journal={async record(){}};
 const store=accountDeletionStore(f.db,bucket,doctor.email,true,journal);
 await store.execute(doctor,{id,confirmed:true,confirmation:id,retentionReviewed:true,externalReviewed:true,retentionDecision:'no_hold'});
 for(const table of ['activity_step_days','activity_connections','activity_step_goals','activity_shares']){
  assert.ok(deletionScopes.some(([name,column])=>name===table&&column==='owner_id'));
  assert.equal(f.sql.prepare(`SELECT COUNT(*) n FROM ${table} WHERE owner_id=?`).get(client.userId).n,0);
 }
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM activity_connections WHERE owner_id=?').get(stranger.userId).n,1);
});
