import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,doctor,coach,client} from './platform-db.mjs';
import {wellnessStore} from '../lib/wellness-store.ts';
import {todayIsrael} from '../lib/wellness.ts';
import {currentWeek} from '../lib/care.ts';
const config={adminEmails:doctor.email,clinicianEmails:doctor.email};
const payload=kind=>({id:randomUUID(),kind,day:kind==='weeklyReview'?currentWeek():todayIsrael(),version:0,data:kind==='episode'?{label:'פציעה מתועדת',region:'ברך',side:'ימין',status:'active'}:kind==='return'?{stage:'הערכה',goal:'יעד אישי',criteria:'בדיקת רופא',limits:'',milestones:'[]'}:kind==='plan'?{mode:'flexible',principles:'עקרונות אישיים',trainingDay:'',restDay:''}:{response:'מענה אישי לדיווח'}});
async function fixture(t,kind){
 const f=platform(t);await f.connect();
 const w=wellnessStore(f.db,config),user=['plan','weeklyReview'].includes(kind)?coach:doctor;
 if(user===coach){
 await f.care.saveStaff(doctor,{email:coach.email,name:'דיאטן לבדיקה',role:'dietitian',active:true});
 const invite=await f.care.createInvite(doctor,{emails:[doctor.email,coach.email]});await f.care.acceptInvite(client,{code:invite.code,consent:true});
 }
 if(kind==='weeklyReview')await w.save(client,client.userId,{id:randomUUID(),kind:'weekly',day:currentWeek(),version:0,data:{success:'דיווח שבועי',difficulty:'',question:''}});
 return {...f,w,user};
}
function beforeWrite(f,change){
 const prepare=f.db.prepare.bind(f.db);let fired=false;
 f.db.prepare=query=>{const stmt=prepare(query);if(!/^(INSERT INTO wellness_records|UPDATE wellness_records SET)/.test(query))return stmt;
 return {bind(...values){const bound=stmt.bind(...values);return {...bound,async first(){if(!fired){fired=true;await change();}return bound.first();}};}};
 };
}
const revoke=f=>f.sql.prepare('UPDATE care_connections SET active=0 WHERE client_id=? AND staff_email=?').run(client.userId,f.user.email);
const scope=f=>f.sql.prepare("UPDATE care_connections SET scope='coordinator' WHERE client_id=? AND staff_email=?").run(client.userId,f.user.email);
const permission=f=>f.sql.prepare('UPDATE care_connections SET medical_access=0,nutrition_access=0 WHERE client_id=? AND staff_email=?').run(client.userId,f.user.email);
const role=f=>f.sql.prepare("INSERT INTO care_staff(email,name,role,active,updated_at) VALUES(?,'צוות','coach',1,?) ON CONFLICT(email) DO UPDATE SET role='coach'").run(f.user.email,new Date().toISOString());
const disable=f=>f.sql.prepare("INSERT INTO care_staff(email,name,role,active,updated_at) VALUES(?,'צוות','clinician',0,?) ON CONFLICT(email) DO UPDATE SET active=0").run(f.user.email,new Date().toISOString());
test('revocation, scope, permission, role and active-state changes cannot insert professional wellness records',async t=>{
 for(const kind of ['episode','return','plan','weeklyReview'])for(const change of [revoke,scope,permission,role,disable]){
 const f=await fixture(t,kind),p=payload(kind);beforeWrite(f,()=>change(f));
 await assert.rejects(()=>f.w.save(f.user,client.userId,p),err=>err.status===403);
 assert.equal(f.sql.prepare('SELECT id FROM wellness_records WHERE id=?').get(p.id),undefined,kind+' '+change.name);
 assert.equal(f.sql.prepare('SELECT COUNT(*) AS count FROM return_plan_revisions WHERE record_id=?').get(p.id).count,0);
 }
});
test('revoked professional updates preserve current version and return history atomically',async t=>{
 for(const kind of ['episode','return','plan','weeklyReview'])for(const change of [revoke,scope,permission,role,disable]){
 const f=await fixture(t,kind),p=payload(kind);await f.w.save(f.user,client.userId,p);
 const before=f.sql.prepare('SELECT * FROM wellness_records WHERE id=?').get(p.id);
 const history=f.sql.prepare('SELECT * FROM return_plan_revisions WHERE record_id=?').all(p.id);
 beforeWrite(f,()=>change(f));
 const data={...p.data,...(kind==='return'?{goal:'יעד מעודכן'}:kind==='episode'?{label:'פציעה מעודכנת'}:kind==='plan'?{principles:'תוכנית מעודכנת'}:{response:'מענה מעודכן'})};
 await assert.rejects(()=>f.w.save(f.user,client.userId,{...p,version:1,data}),err=>err.status===403);
 assert.deepEqual(f.sql.prepare('SELECT * FROM wellness_records WHERE id=?').get(p.id),before,kind+' '+change.name);
 assert.deepEqual(f.sql.prepare('SELECT * FROM return_plan_revisions WHERE record_id=?').all(p.id),history);
 }
});
test('unchanged authorization allows retries; stale writes remain conflicts; owner reports do not require staff',async t=>{
 for(const kind of ['episode','return','plan','weeklyReview']){
 const f=await fixture(t,kind),p=payload(kind);await f.w.save(f.user,client.userId,p);
 await f.w.save(f.user,client.userId,p);
 assert.equal(f.sql.prepare('SELECT version FROM wellness_records WHERE id=?').get(p.id).version,1);
 const key=kind==='return'?'goal':kind==='episode'?'label':kind==='plan'?'principles':'response';
 await f.w.save(f.user,client.userId,{...p,version:1,data:{...p.data,[key]:'עדכון חדש'}});
 await assert.rejects(()=>f.w.save(f.user,client.userId,{...p,version:1,data:{...p.data,[key]:'עדכון מתחרה'}}),err=>err.status===409);
 revoke(f);
 await f.w.save(client,client.userId,{id:randomUUID(),kind:'readiness',version:0,day:todayIsrael(),data:{sleep:8,energy:7,stress:2,note:''}});
 }
});
