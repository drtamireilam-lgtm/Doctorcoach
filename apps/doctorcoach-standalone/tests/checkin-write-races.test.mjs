import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,doctor,coach,client,stranger} from './platform-db.mjs';
import {CONSENT_REVISION} from '../lib/intake.ts';
const report=()=>({id:randomUUID(),sessions:3,pain:2,functionScore:7,effort:8,content:'דיווח שבועי'});
async function fixture(t){const f=platform(t);await f.connect();return f;}
function beforeWrite(f,prefix,change){
 const prepare=f.db.prepare.bind(f.db);let fired=false;
 f.db.prepare=query=>{const stmt=prepare(query);if(!query.startsWith(prefix))return stmt;return {bind(...values){const bound=stmt.bind(...values);return {...bound,async first(){if(!fired){fired=true;await change();}return bound.first();}};}};};
}
const withdraw=(f,id='health')=>f.sql.prepare('INSERT INTO user_consents(id,user_id,consent_id,revision,accepted,created_at) VALUES(?,?,?,?,0,?)').run(randomUUID(),client.userId,id,CONSENT_REVISION,'2099-01-01');
test('weekly report writes reject concurrent consent withdrawal and missing profile without creating records',async t=>{
 for(const id of ['terms','privacy','health','team','profile']){
 const f=await fixture(t),p=report();
 beforeWrite(f,'INSERT INTO care_checkins',()=>id==='profile'?f.sql.prepare('DELETE FROM care_profiles WHERE user_id=?').run(client.userId):withdraw(f,id));
 await assert.rejects(()=>f.care.checkin(client,p),e=>e.status===403);
 assert.equal(f.sql.prepare('SELECT id FROM care_checkins WHERE id=?').get(p.id),undefined);
 }
});
test('staff replies remain unchanged after concurrent connection, scope, role, active state or consent loss',async t=>{
 for(const change of [
 f=>f.sql.prepare('UPDATE care_connections SET active=0 WHERE client_id=? AND staff_email=?').run(client.userId,coach.email),
 f=>f.sql.prepare("UPDATE care_connections SET scope='coordinator' WHERE client_id=? AND staff_email=?").run(client.userId,coach.email),
 f=>f.sql.prepare("UPDATE care_staff SET role='clinician' WHERE email=?").run(coach.email),
 f=>f.sql.prepare('UPDATE care_staff SET active=0 WHERE email=?').run(coach.email),
 f=>withdraw(f),
 ]){
 const f=await fixture(t),p=report();await f.care.checkin(client,p);
 const previous=f.sql.prepare('SELECT * FROM care_checkins WHERE id=?').get(p.id);
 beforeWrite(f,'UPDATE care_checkins',()=>change(f));
 await assert.rejects(()=>f.care.reviewCheckin(coach,client.userId,{id:p.id,response:'מענה מקצועי'}),e=>e.status===403);
 assert.deepEqual(f.sql.prepare('SELECT * FROM care_checkins WHERE id=?').get(p.id),previous);
 }
});
test('exact report retries succeed but changed fields, another ID or missing consent cannot masquerade as retry',async t=>{
 const f=await fixture(t),p=report();await f.care.checkin(client,p);await f.care.checkin(client,p);
 for(const patch of [{sessions:4},{pain:3},{functionScore:8},{effort:9},{content:'תוכן שונה'},{id:randomUUID()}])await assert.rejects(()=>f.care.checkin(client,{...p,...patch}),e=>e.status===409);
 beforeWrite(f,'INSERT INTO care_checkins',()=>withdraw(f));
 await assert.rejects(()=>f.care.checkin(client,p),e=>e.status===403);
 assert.equal(f.sql.prepare('SELECT content FROM care_checkins WHERE id=?').get(p.id).content,p.content);
});
test('a competing authorized reply wins once; old writes cannot overwrite it; unrelated staff are denied',async t=>{
 const f=await fixture(t),p=report();await f.care.checkin(client,p);
 await assert.rejects(()=>f.care.reviewCheckin(stranger,client.userId,{id:p.id,response:'מענה אחר'}),e=>e.status===403);
 beforeWrite(f,'UPDATE care_checkins',()=>f.care.reviewCheckin(doctor,client.userId,{id:p.id,response:'המענה שנשמר ראשון'}));
 await assert.rejects(()=>f.care.reviewCheckin(coach,client.userId,{id:p.id,response:'מענה מתחרה'}),e=>e.status===409);
 const stored=f.sql.prepare('SELECT * FROM care_checkins WHERE id=?').get(p.id);
 assert.equal(stored.response,'המענה שנשמר ראשון');assert.equal(stored.reviewer,'ד״ר תמיר עילם');
 assert.equal((await f.care.bundle(client,client.userId)).checkins[0].response,stored.response);
});
