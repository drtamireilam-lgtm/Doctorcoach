import test from 'node:test';
import assert from 'node:assert/strict';
import {platform,client} from './platform-db.mjs';
import {defaultPrescription} from '../lib/training.ts';
async function fixture(t){const f=platform(t);await f.connect();await f.training.savePlan(client.userId,defaultPrescription('goblet'));return f;}
function race(f,operation,change){let fired=false;if(operation==='template'){const batch=f.db.batch.bind(f.db);f.db.batch=async statements=>{if(!fired){fired=true;change();}return batch(statements);};}else{const prepare=f.db.prepare.bind(f.db);f.db.prepare=q=>{if(!fired&&q.startsWith(operation==='remove'?'DELETE FROM program_items':'INSERT INTO program_items')){fired=true;change();}return prepare(q);};}}
const changes=[
 ['expired',f=>f.sql.prepare("UPDATE training_access SET self_until='2020-01-01' WHERE user_id=?").run(client.userId)],
 ['coached',f=>f.sql.prepare("UPDATE training_access SET mode='coached' WHERE user_id=?").run(client.userId)],
 ['intake',f=>f.sql.prepare('UPDATE user_intakes SET completed=0 WHERE user_id=?').run(client.userId)],
 ['medical',f=>f.sql.prepare("INSERT INTO medical_reviews(id,client_id,flags_json,urgency,state,created_at,updated_at) VALUES('new',?,'[]','routine','pending','2026-10-09','2026-10-09')").run(client.userId)],
];
for(const operation of ['save','template','remove'])for(const [name,change] of changes.filter(([name])=>operation!=='remove'||['expired','coached'].includes(name)))test(operation+' plan mutation rejects '+name+' at persistence',async t=>{const f=await fixture(t);const before=f.sql.prepare('SELECT * FROM program_items').all();race(f,operation,()=>change(f));await assert.rejects(()=>operation==='save'?f.training.savePlan(client.userId,{...defaultPrescription('goblet'),weight:40}):operation==='template'?f.training.addTemplate(client.userId,{templateId:'lower'}):f.training.removePlan(client.userId,{exerciseId:'goblet'}),e=>e.status===403);assert.deepEqual(f.sql.prepare('SELECT * FROM program_items').all(),before);});
test('plan removal stays possible under medical block and is an owner-scoped no-op for missing item',async t=>{const f=await fixture(t);changes.find(([n])=>n==='medical')[1](f);await f.training.removePlan(client.userId,{exerciseId:'goblet'});assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM program_items').get().n,0);await f.training.removePlan(client.userId,{exerciseId:'goblet'});});
