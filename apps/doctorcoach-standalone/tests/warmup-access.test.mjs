import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,client,coach} from './platform-db.mjs';
import {defaultPrescription} from '../lib/training.ts';
import {programTemplateStore} from '../lib/program-template-store.ts';
const prescription={...defaultPrescription('goblet'),warmupSets:[{amount:5,weight:10}],side:'left'};
const patch=s=>({id:s.id,version:s.version,action:'warmupSet',exerciseId:'goblet',occurrenceId:s.items[0].occurrenceId,setIndex:0,done:true,amount:5,weight:12});
for(const [name,change] of [
 ['consent',f=>f.sql.exec("UPDATE user_consents SET accepted=0 WHERE user_id='client' AND consent_id='health'")],
 ['subscription',f=>f.sql.exec("UPDATE training_access SET self_until='2020-01-01' WHERE user_id='client'")],
 ['medical readiness',f=>f.sql.exec("UPDATE user_intakes SET completed=0 WHERE user_id='client'")],
])test(`warmup write rejects a ${name} revocation between validation and SQL mutation`,async t=>{
 const f=platform(t);await f.connect();await f.training.savePlan(client.userId,prescription);const s=await f.training.start(client.userId,{requestId:randomUUID(),before:0});
 const base=f.db.prepare.bind(f.db);let changed=false;
 f.db.prepare=q=>{if(q.startsWith('UPDATE training_sessions SET items_json')&&!changed){changed=true;change(f);}return base(q);};
 await assert.rejects(()=>f.training.patch(client.userId,patch(s)),e=>e.status===403);
 assert.equal(changed,true);const persisted=JSON.parse(f.sql.prepare('SELECT items_json FROM training_sessions WHERE id=?').get(s.id).items_json);assert.equal(persisted[0].warmupResults[0].done,false);assert.equal(persisted[0].warmupResults[0].weight,10);assert.equal(f.sql.prepare('SELECT version FROM training_sessions WHERE id=?').get(s.id).version,s.version);
});

test('coached assignment and private template loading preserve warmups and side; connection race blocks warmup mutation',async t=>{
 const f=platform(t);await f.connect();
 const id=randomUUID();await f.care.assign(coach,client.userId,{id,title:'Warmup plan',items:[prescription]});
 const plan=await f.training.getPlan(client.userId);assert.deepEqual(plan[0].warmupSets,prescription.warmupSets);assert.equal(plan[0].side,'left');
 const templates=programTemplateStore(f.db);const tid=randomUUID();await templates.write(coach,{clientId:client.userId},{action:'create',id:tid,title:'Warmup template',items:plan,confirmed:true,keepWeights:true});
 const loaded=await templates.write(coach,{clientId:client.userId},{action:'load',id:tid,version:1});assert.deepEqual(loaded.draft.items[0].warmupSets,prescription.warmupSets);assert.equal(loaded.draft.items[0].side,'left');
 const s=await f.training.start(client.userId,{requestId:randomUUID(),before:0});assert.equal(s.planMode,'coached');assert.deepEqual(s.items[0].warmupResults,[{done:false,amount:5,weight:10}]);
 const base=f.db.prepare.bind(f.db);let changed=false;f.db.prepare=q=>{if(q.startsWith('UPDATE training_sessions SET items_json')&&!changed){changed=true;f.sql.exec("UPDATE care_connections SET active=0 WHERE staff_email='coach@example.test'");}return base(q);};
 await assert.rejects(()=>f.training.patch(client.userId,patch(s)),e=>e.status===403);assert.equal(changed,true);assert.equal((await f.training.feed(client.userId)).active.items[0].warmupResults[0].done,false);
});
