import {verifySyntheticDietitian} from './platform-db.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,doctor,coach,client,stranger} from './platform-db.mjs';
import {wellnessStore} from '../lib/wellness-store.ts';
import {requireHealthConsent} from '../lib/consent-server.ts';
import {CONSENT_REVISION} from '../lib/intake.ts';
import {todayIsrael} from '../lib/wellness.ts';
import {currentWeek} from '../lib/care.ts';
const config={adminEmails:doctor.email,clinicianEmails:doctor.email};
const kinds=['assessment','plan','daily','weekly','weeklyReview','rehab','return','readiness','episode'];
function payload(kind){
 const data={assessment:{goal:'מטרה אישית',routine:'',preferences:'',allergies:'',history:'',shareTeam:false},plan:{mode:'flexible',principles:'עקרונות אישיים',trainingDay:'',restDay:''},daily:{weight:80,waist:null,hip:null,adherence:8,dayType:'training',note:''},weekly:{success:'דיווח שבועי',difficulty:'',question:''},weeklyReview:{response:'מענה אישי'},rehab:{region:'ברך',side:'ימין',motion:'כפיפת ברך',pain:2,rom:90,functionScore:6,response:'לפני אימון',note:''},return:{stage:'הערכה',goal:'יעד אישי',criteria:'בדיקת רופא',limits:'',milestones:'[]'},readiness:{sleep:8,energy:7,stress:2,note:''},episode:{label:'פציעה מתועדת',region:'ברך',side:'ימין',status:'active'}}[kind];
 return {id:randomUUID(),kind,day:['weekly','weeklyReview'].includes(kind)?currentWeek():todayIsrael(),version:0,data};
}
async function fixture(t,kind){
 const f=platform(t);await f.connect();const w=wellnessStore(f.db,config);
 const user=['return','episode'].includes(kind)?doctor:['plan','weeklyReview'].includes(kind)?coach:client;
 if(user===coach){await f.care.saveStaff(doctor,{email:coach.email,name:'דיאטן לבדיקה',role:'dietitian',active:true});verifySyntheticDietitian(f,coach.email);const invitation=await f.care.createInvite(doctor,{emails:[doctor.email,coach.email]});await f.care.acceptInvite(client,{code:invitation.code,consent:true});}
 if(kind==='weeklyReview')await w.save(client,client.userId,payload('weekly'));
 return {...f,w,user};
}
function beforeWrite(f,change){
 const prepare=f.db.prepare.bind(f.db);let fired=false;
 f.db.prepare=query=>{const stmt=prepare(query);if(!/^(INSERT INTO wellness_records|UPDATE wellness_records SET)/.test(query))return stmt;return {bind(...values){const bound=stmt.bind(...values);return {...bound,async first(){if(!fired){fired=true;change();}return bound.first();}};}};};
}
function consent(f,id,accepted,revision=CONSENT_REVISION,userId=client.userId){
 f.sql.prepare('INSERT INTO user_consents(id,user_id,consent_id,revision,accepted,created_at) VALUES(?,?,?,?,?,?)').run(randomUUID(),userId,id,revision,accepted,'2099-01-01');
}
test('consent withdrawn after initial API check blocks every wellness insert without persisting anything',async t=>{
 for(const kind of kinds)for(const id of ['terms','privacy','health','team']){
 const f=await fixture(t,kind),p=payload(kind);await requireHealthConsent(f.db,client.userId);
 beforeWrite(f,()=>consent(f,id,0));
 await assert.rejects(()=>f.w.save(f.user,client.userId,p),err=>err.status===403);
 assert.equal(f.sql.prepare('SELECT id FROM wellness_records WHERE id=?').get(p.id),undefined,kind+' '+id);
 assert.equal(f.sql.prepare('SELECT COUNT(*) AS total FROM return_plan_revisions WHERE record_id=?').get(p.id).total,0);
 }
});
test('consent loss during updates and identical retries preserves the exact row and revision history',async t=>{
 for(const kind of kinds)for(const retry of [false,true]){
 const f=await fixture(t,kind),p=payload(kind);await f.w.save(f.user,client.userId,p);
 const before=f.sql.prepare('SELECT * FROM wellness_records WHERE id=?').get(p.id),history=f.sql.prepare('SELECT * FROM return_plan_revisions WHERE record_id=?').all(p.id);
 beforeWrite(f,()=>consent(f,'health',0));
 const update=retry?p:{...p,version:1,data:{...p.data,...(kind==='daily'?{adherence:9}:kind==='readiness'?{sleep:7}:kind==='rehab'?{pain:3}:kind==='episode'?{label:'פציעה מעודכנת'}:kind==='weekly'?{success:'שבוע מעודכן'}:kind==='weeklyReview'?{response:'מענה מעודכן'}:kind==='plan'?{principles:'עקרונות מעודכנים'}:{goal:'יעד מעודכן'})}};
 await assert.rejects(()=>f.w.save(f.user,client.userId,update),err=>err.status===403);
 assert.deepEqual(f.sql.prepare('SELECT * FROM wellness_records WHERE id=?').get(p.id),before);
 assert.deepEqual(f.sql.prepare('SELECT * FROM return_plan_revisions WHERE record_id=?').all(p.id),history);
 }
});
test('latest consent revision, missing consent and same-time withdrawal cannot fall back to an older acceptance',async t=>{
 for(const change of [
 f=>consent(f,'health',1,'old-revision'),
 f=>f.sql.prepare("DELETE FROM user_consents WHERE user_id=? AND consent_id='health'").run(client.userId),
 f=>{consent(f,'health',1);consent(f,'health',0);},
 f=>{consent(f,'health',0);consent(f,'health',1,CONSENT_REVISION,stranger.userId);},
 ]){
 const f=await fixture(t,'readiness'),p=payload('readiness');beforeWrite(f,()=>change(f));
 await assert.rejects(()=>f.w.save(client,client.userId,p),err=>err.status===403);
 assert.equal(f.sql.prepare('SELECT id FROM wellness_records WHERE id=?').get(p.id),undefined);
 }
});
test('missing consent is rejected inside store; renewed latest consent restores writes and preserves reads',async t=>{
 const f=await fixture(t,'readiness'),p=payload('readiness');await f.w.save(client,client.userId,p);
 consent(f,'health',0);
 await assert.rejects(()=>f.w.save(client,client.userId,payload('daily')),err=>err.status===403);
 assert.equal((await f.w.bundle(client,client.userId)).records.find(r=>r.id===p.id).version,1);
 consent(f,'health',1);await f.w.save(client,client.userId,{...p,version:1,data:{...p.data,sleep:7}});
 assert.equal((await f.w.bundle(client,client.userId)).records.find(r=>r.id===p.id).version,2);
});
