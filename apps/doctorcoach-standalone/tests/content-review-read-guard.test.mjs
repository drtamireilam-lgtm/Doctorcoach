import test from 'node:test';
import assert from 'node:assert/strict';
import {platform,doctor} from './platform-db.mjs';
import {contentReviewStore} from '../lib/content-review-store.ts';
const clinician={userId:'clinician',email:'clinician@example.test'};
async function fixture(t){const f=platform(t);await f.care.saveStaff(doctor,{...clinician,name:'Clinician',role:'clinician',active:true});return {...f,store:contentReviewStore(f.db,{clinicianEmails:doctor.email})};}
function race(f,change){const prepare=f.db.prepare.bind(f.db);let fired=false;f.db.prepare=q=>{const s=prepare(q);if(!q.includes('FROM content_reviews'))return s;const wrap=b=>({...b,bind(...args){return wrap(b.bind(...args));},async all(){const r=await b.all();if(!fired){fired=true;change();}return r;}});return wrap(s);};}
for(const viewer of [doctor,clinician])for(const [name,change] of [
 ['disablement',(f,u)=>f.sql.prepare("INSERT INTO care_staff(email,name,role,active,updated_at) VALUES(?,'Disabled','clinician',0,'2026-01-01') ON CONFLICT(email) DO UPDATE SET active=0").run(u.email)],
 ['role change',(f,u)=>f.sql.prepare("INSERT INTO care_staff(email,name,role,active,updated_at) VALUES(?,'Changed','coach',1,'2026-01-01') ON CONFLICT(email) DO UPDATE SET role='coach'").run(u.email)],
])test('clinical catalog read rejects '+viewer.userId+' '+name+' after records fetched',async t=>{const f=await fixture(t);race(f,()=>change(f,viewer));await assert.rejects(()=>f.store.list(viewer),e=>e.status===403);});
test('valid clinician and configured fallback retain catalog hashes and pending states',async t=>{const f=await fixture(t);const a=await f.store.list(doctor),b=await f.store.list(clinician);assert.ok(a.items.length>0);assert.deepEqual(a,b);assert.ok(a.items.every(i=>i.contentHash.length===64&&i.state==='pending'));});
