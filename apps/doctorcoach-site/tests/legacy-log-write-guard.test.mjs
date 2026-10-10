import test from 'node:test';
import assert from 'node:assert/strict';
import {platform,client,stranger} from './platform-db.mjs';
import {legacyLogsStore} from '../lib/legacy-logs-store.ts';
import {CONSENT_REVISION} from '../lib/intake.ts';
async function fixture(t){const f=platform(t);await f.connect();f.sql.prepare("INSERT INTO program_items(owner_id,exercise_id) VALUES(?,'goblet')").run(client.userId);return {...f,store:legacyLogsStore(f.db)};}
function race(f,change){const prepare=f.db.prepare.bind(f.db);let fired=false;f.db.prepare=q=>{if(q.startsWith('INSERT INTO workout_logs')&&!fired){fired=true;change();}return prepare(q);};}
for(const [name,change,status] of [
 ['self entitlement expired',f=>f.sql.prepare("UPDATE training_access SET self_until='2020-01-01' WHERE user_id=?").run(client.userId),403],
 ['mode changed',f=>f.sql.prepare("UPDATE training_access SET mode='coached' WHERE user_id=?").run(client.userId),403],
 ['intake incomplete',f=>f.sql.prepare('UPDATE user_intakes SET completed=0 WHERE user_id=?').run(client.userId),403],
 ['medical review opened',f=>f.sql.prepare("INSERT INTO medical_reviews(id,client_id,flags_json,urgency,state,created_at,updated_at) VALUES('new',?,'[]','routine','pending','2026-10-09','2026-10-09')").run(client.userId),403],
 ['plan removed',f=>f.sql.prepare('DELETE FROM program_items WHERE owner_id=?').run(client.userId),400],
])test('legacy log rejects '+name+' at persistence',async t=>{const f=await fixture(t);race(f,()=>change(f));await assert.rejects(()=>f.store.save(client.userId,{before:1,after:2}),e=>e.status===status);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM workout_logs').get().n,0);});
for(const consent of ['terms','privacy','health','team'])test('legacy log rejects '+consent+' withdrawal at persistence',async t=>{const f=await fixture(t);race(f,()=>f.sql.prepare('INSERT INTO user_consents(id,user_id,consent_id,revision,accepted,created_at) VALUES(?,?,?,?,0,?)').run('withdraw',client.userId,consent,CONSENT_REVISION,'2026-10-09'));await assert.rejects(()=>f.store.save(client.userId,{before:1,after:2}),e=>e.status===403);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM workout_logs').get().n,0);});
test('legacy count reflects current owner plan and history remains after access loss',async t=>{const f=await fixture(t);race(f,()=>{f.sql.prepare("INSERT INTO program_items(owner_id,exercise_id) VALUES(?,'other')").run(client.userId);f.sql.prepare("INSERT INTO program_items(owner_id,exercise_id) VALUES(?,'other')").run(stranger.userId);});const log=await f.store.save(client.userId,{before:0,after:10});assert.equal(log.exerciseCount,2);assert.equal(log.ownerId,client.userId);f.sql.exec('UPDATE user_consents SET accepted=0; UPDATE training_access SET self_until=NULL');assert.equal((await f.store.list(client.userId)).length,1);assert.deepEqual(await f.store.list(stranger.userId),[]);});
