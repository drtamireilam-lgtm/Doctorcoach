import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,client} from './platform-db.mjs';
import {defaultPrescription} from '../lib/training.ts';
import {CONSENT_REVISION} from '../lib/intake.ts';
async function fixture(t){const f=platform(t);await f.connect();await f.training.savePlan(client.userId,defaultPrescription('goblet'));return f;}
function withdraw(f,id,revision=CONSENT_REVISION,accepted=0){f.sql.prepare('INSERT INTO user_consents(id,user_id,consent_id,revision,accepted,created_at) VALUES(?,?,?,?,?,?)').run(randomUUID(),client.userId,id,revision,accepted,'2026-10-09');}
function race(f,operation,change){let fired=false;if(operation==='template'){const batch=f.db.batch.bind(f.db);f.db.batch=async statements=>{if(!fired){fired=true;change();}return batch(statements);};}else{const prepare=f.db.prepare.bind(f.db);f.db.prepare=q=>{if(!fired&&q.startsWith('INSERT INTO program_items')){fired=true;change();}return prepare(q);};}}
for(const operation of ['save','template'])for(const consent of ['terms','privacy','health','team'])test(operation+' plan rejects '+consent+' withdrawal at persistence',async t=>{const f=await fixture(t);const before=f.sql.prepare('SELECT * FROM program_items').all();race(f,operation,()=>withdraw(f,consent));await assert.rejects(()=>operation==='save'?f.training.savePlan(client.userId,{...defaultPrescription('goblet'),weight:80}):f.training.addTemplate(client.userId,{templateId:'lower'}),e=>e.status===403);assert.deepEqual(f.sql.prepare('SELECT * FROM program_items').all(),before);});
test('old-revision accepted consent blocks program additions before persistence',async t=>{const f=await fixture(t);withdraw(f,'health','old',1);await assert.rejects(()=>f.training.savePlan(client.userId,defaultPrescription('bench')),e=>e.status===403);await assert.rejects(()=>f.training.addTemplate(client.userId,{templateId:'lower'}),e=>e.status===403);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM program_items').get().n,1);});
test('owner can read and remove an existing exercise after consent withdrawal',async t=>{const f=await fixture(t);withdraw(f,'health');assert.equal((await f.training.getPlan(client.userId)).length,1);await f.training.removePlan(client.userId,{exerciseId:'goblet'});assert.deepEqual(await f.training.getPlan(client.userId),[]);});
