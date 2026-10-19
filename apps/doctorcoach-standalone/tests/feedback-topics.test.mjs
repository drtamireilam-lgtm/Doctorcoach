import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,doctor,client,stranger} from './platform-db.mjs';
import {communityStore} from '../lib/community-store.ts';
import {feedbackSection,feedbackRegion} from '../lib/feedback-topics.ts';
const request=(extra={})=>({id:randomUUID(),context:'תרגיל: פשיטת שורש כף היד',category:'בקשה לתוכן חדש',content:'אשמח לסרטון עם דגשים על אחיזה',section:'exercises',bodyRegion:'wrist',...extra});
test('structured requests persist and support intersecting server filters without crossing ownership',async t=>{
 const f=platform(t),s=communityStore(f.db,doctor.email);await s.saveFeedback(client,request());await s.saveFeedback(stranger,request({section:'anatomy',bodyRegion:'shoulder'}));
 let d=await s.feedback(doctor,true,{section:'exercises',bodyRegion:'wrist',state:'new'});assert.equal(d.items.length,1);assert.equal(d.items[0].bodyRegion,'wrist');
 assert.equal((await s.feedback(client,false,{section:'anatomy'})).items.length,0);await assert.rejects(()=>s.feedback(client,true),e=>e.status===403);
 await s.saveFeedback(doctor,{action:'review',id:d.items[0].id,version:1,state:'reviewing',response:'נוסיף סרטון'});
 assert.equal((await s.feedback(doctor,true,{state:'new',section:'exercises'})).items.length,0);d=await s.feedback(doctor,true,{state:'reviewing'});assert.equal(d.items[0].response,'נוסיף סרטון');
});
test('exact retry keeps one request; changed classification on the same id conflicts',async t=>{
 const f=platform(t),s=communityStore(f.db,doctor.email),p=request();await s.saveFeedback(client,p);await s.saveFeedback(client,p);assert.equal((await s.feedback(client)).items.length,1);
 await assert.rejects(()=>s.saveFeedback(client,{...p,bodyRegion:'shoulder'}),e=>e.status===409);await assert.rejects(()=>s.saveFeedback(stranger,p),e=>e.status===403);
});
test('invalid topics and filters are denied; previous clients remain compatible',async t=>{
 const f=platform(t),s=communityStore(f.db,doctor.email);
 for(const extra of [{section:'medical'},{bodyRegion:'unknown'}])await assert.rejects(()=>s.saveFeedback(client,request(extra)));
 await assert.rejects(()=>s.feedback(doctor,true,{section:'unknown'}));const p=request();delete p.section;delete p.bodyRegion;await s.saveFeedback(client,p);const item=(await s.feedback(client)).items[0];assert.equal(item.section,'exercises');assert.equal(item.bodyRegion,'wrist');
 assert.equal(feedbackSection('פציעה / שיקום: כאב כתף'),'rehab');assert.equal(feedbackSection('שריר: Deltoid'),'anatomy');assert.equal(feedbackRegion('כאב מרפק'),'elbow');assert.equal(feedbackRegion('רגליים · שוקיים'),'lower_leg');
});
