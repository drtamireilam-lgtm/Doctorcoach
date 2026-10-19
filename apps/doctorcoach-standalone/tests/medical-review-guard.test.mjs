import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,doctor,client} from './platform-db.mjs';
import {onboardingStore} from '../lib/onboarding-store.ts';
import {CONSENT_REVISION} from '../lib/intake.ts';
async function fixture(t){
 const f=platform(t);await f.connect();const id=randomUUID();
 f.sql.prepare("INSERT INTO medical_reviews(id,client_id,flags_json,urgency,created_at,updated_at) VALUES(?,'client','[\"chest_breathing\"]','emergency','2026-01-01','2026-01-01')").run(id);
 return {...f,id,store:onboardingStore(f.db,{clinicianEmails:doctor.email}),payload:{id,version:1,state:'cleared',response:'נבדק וניתנו הנחיות אישיות'}};
}
function race(f,change){const batch=f.db.batch.bind(f.db);let fired=false;f.db.batch=async statements=>{if(!fired){fired=true;change();}return batch(statements);};}
function unchanged(f){const row=f.sql.prepare('SELECT state,version,response FROM medical_reviews WHERE id=?').get(f.id);assert.equal(row.state,'pending');assert.equal(row.version,1);assert.equal(row.response,'');assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM audit_events WHERE action LIKE 'medical_review_%'").get().n,0);}
for(const [name,change] of [
 ['connection revoked',f=>f.sql.prepare('UPDATE care_connections SET active=0 WHERE staff_email=?').run(doctor.email)],
 ['medical grant withdrawn',f=>f.sql.prepare('UPDATE care_connections SET medical_access=0 WHERE staff_email=?').run(doctor.email)],
 ['scope changed',f=>f.sql.prepare("UPDATE care_connections SET scope='coordinator' WHERE staff_email=?").run(doctor.email)],
 ['clinician disabled',f=>f.sql.prepare("INSERT INTO care_staff(email,name,role,active,updated_at) VALUES(?,'Doctor','clinician',0,'2026-01-01')").run(doctor.email)],
 ['clinician role changed',f=>f.sql.prepare("INSERT INTO care_staff(email,name,role,active,updated_at) VALUES(?,'Doctor','coach',1,'2026-01-01')").run(doctor.email)],
 ['health consent withdrawn',f=>f.sql.prepare("INSERT INTO user_consents(id,user_id,consent_id,revision,accepted,created_at) VALUES(?,'client','health',?,0,'2026-01-01')").run(randomUUID(),CONSENT_REVISION)],
 ['consent revision changed',f=>f.sql.prepare("INSERT INTO user_consents(id,user_id,consent_id,revision,accepted,created_at) VALUES(?,'client','team','old',1,'2027-01-01')").run(randomUUID())],
])test('medical decision rejects concurrent '+name,async t=>{const f=await fixture(t);race(f,()=>change(f));await assert.rejects(()=>f.store.review(doctor,f.payload),e=>e.status===403);unchanged(f);assert.equal((await f.store.get(client)).trainingBlocked,true);});
test('medical decision and audit roll back together if audit fails',async t=>{const f=await fixture(t);f.sql.exec("CREATE TRIGGER test_audit_failure BEFORE INSERT ON audit_events WHEN NEW.action='medical_review_cleared' BEGIN SELECT RAISE(ABORT,'audit unavailable'); END");await assert.rejects(()=>f.store.review(doctor,f.payload));unchanged(f);assert.equal((await f.store.get(client)).trainingBlocked,true);});
test('medical decision rolls back its audit if update fails',async t=>{const f=await fixture(t);f.sql.exec("CREATE TRIGGER test_review_failure BEFORE UPDATE ON medical_reviews BEGIN SELECT RAISE(ABORT,'review unavailable'); END");await assert.rejects(()=>f.store.review(doctor,f.payload));unchanged(f);});
test('new medical information prevents stale clearance and creates no audit',async t=>{const f=await fixture(t);race(f,()=>f.sql.prepare("UPDATE medical_reviews SET version=version+1,flags_json='[\"new flag\"]' WHERE id=?").run(f.id));await assert.rejects(()=>f.store.review(doctor,f.payload),e=>e.status===409);assert.equal((await f.store.get(client)).trainingBlocked,true);assert.equal(f.sql.prepare('SELECT flags_json FROM medical_reviews WHERE id=?').get(f.id).flags_json,'["new flag"]');assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM audit_events WHERE action LIKE 'medical_review_%'").get().n,0);});
test('clinician review advances version, audits once and requires explicit clearance',async t=>{const f=await fixture(t);await f.store.review(doctor,{...f.payload,state:'in_review'});assert.equal((await f.store.get(client)).trainingBlocked,true);await assert.rejects(()=>f.store.review(doctor,f.payload),e=>e.status===409);await f.store.review(doctor,{...f.payload,version:2});assert.equal((await f.store.get(client)).trainingBlocked,false);const audits=f.sql.prepare("SELECT actor_id,subject_id,action FROM audit_events WHERE action LIKE 'medical_review_%' ORDER BY rowid").all();assert.deepEqual(audits.map(a=>a.action),['medical_review_in_review','medical_review_cleared']);assert.ok(audits.every(a=>a.actor_id===doctor.userId&&a.subject_id===client.userId));});
