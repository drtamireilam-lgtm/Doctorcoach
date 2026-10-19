import {verifySyntheticDietitian} from './platform-db.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,doctor,coach,client,stranger} from './platform-db.mjs';
import {wellnessStore} from '../lib/wellness-store.ts';
import {communityStore} from '../lib/community-store.ts';
import {estimated1RM,nextLoad,parseRpe} from '../lib/training.ts';
import {todayIsrael} from '../lib/wellness.ts';
const dietitian={userId:'dietitian',email:'dietitian@example.test'};
const config={adminEmails:doctor.email,clinicianEmails:doctor.email};
const record=(kind,data,other={})=>({kind,data,id:randomUUID(),day:todayIsrael(),version:0,...other});
const daily={weight:80,waist:90,hip:null,adherence:8,dayType:'training',note:'private nutrition detail'};
const assessment={goal:'מטרה לבדיקה',routine:'private assessment',preferences:'',allergies:'private allergy',history:'',shareTeam:false};
async function fixture(t){const f=platform(t);await f.connect();await f.care.saveStaff(doctor,{...dietitian,name:'דיאטן בדיקה',role:'dietitian',active:true});verifySyntheticDietitian(f,dietitian.email);const invitation=await f.care.createInvite(doctor,{emails:[doctor.email,dietitian.email]});await f.care.acceptInvite(client,{code:invitation.code,consent:true});return {...f,wellness:wellnessStore(f.db,config),community:communityStore(f.db,doctor.email)};}
test('nutrition is private to trainee and explicitly consented dietitian; shared summary is minimal and revocable',async t=>{
 const f=await fixture(t),p=record('assessment',assessment);await f.wellness.save(client,client.userId,p);await f.wellness.save(client,client.userId,record('daily',daily));
 for(const viewer of [coach,doctor]){const b=await f.wellness.bundle(viewer,client.userId);assert.equal(b.summary,null);assert.equal(b.records.length,0);assert.equal(b.canNutrition,false);}
 assert.equal((await f.wellness.bundle(dietitian,client.userId)).records.length,2);
 await assert.rejects(()=>f.wellness.bundle(stranger,client.userId),e=>e.status===403);
 await f.wellness.save(client,client.userId,{...p,version:1,data:{...assessment,shareTeam:true}});
 const shared=await f.wellness.bundle(coach,client.userId);assert.equal(shared.summary.weight,80);assert.equal(shared.records.length,0);assert.equal(JSON.stringify(shared).includes('private'),false);
 await f.wellness.save(client,client.userId,{...p,version:2,data:assessment});assert.equal((await f.wellness.bundle(coach,client.userId)).summary,null);
 const link=(await f.care.bundle(client,client.userId)).connections.find(c=>c.role==='dietitian');await f.care.revoke(client,{id:link.id});await assert.rejects(()=>f.wellness.bundle(dietitian,client.userId),e=>e.status===403);
});
test('promoting a coach to dietitian does not expand a prior grant',async t=>{
 const f=await fixture(t);await f.care.saveStaff(doctor,{...coach,name:'אותו חשבון',role:'dietitian',active:true});assert.equal((await f.wellness.bundle(coach,client.userId)).canNutrition,false);
});
test('dietitian plans and notes are role-scoped; trainee measurements use optimistic concurrency',async t=>{
 const f=await fixture(t),p=record('daily',daily);await f.wellness.save(client,client.userId,p);await f.wellness.save(client,client.userId,{...p,version:1,data:{...daily,weight:79}});
 await assert.rejects(()=>f.wellness.save(client,client.userId,{...p,version:1,data:{...daily,weight:70}}),e=>e.status===409);
 await assert.rejects(()=>f.wellness.save(coach,client.userId,record('daily',daily)),e=>e.status===403);
 await assert.rejects(()=>f.wellness.save(client,client.userId,record('daily',{...daily,weight:-1})),e=>e.status===400);
 const plan=record('plan',{mode:'flexible',principles:'עקרונות לבדיקה',trainingDay:'',restDay:''});await f.wellness.save(dietitian,client.userId,plan);assert.equal((await f.wellness.bundle(client,client.userId)).records.some(r=>r.kind==='plan'),true);
 for(const u of [client,coach,doctor])await assert.rejects(()=>f.wellness.save(u,client.userId,record('plan',plan.data)),e=>e.status===403);
 await f.care.addNote(dietitian,client.userId,{id:randomUUID(),kind:'nutrition',content:'private dietitian note',shared:false});
 assert.equal((await f.care.bundle(coach,client.userId)).notes.some(n=>n.kind==='nutrition'),false);assert.equal((await f.care.bundle(doctor,client.userId)).notes.some(n=>n.kind==='nutrition'),false);assert.equal((await f.care.bundle(client,client.userId)).notes.length,0);
 await assert.rejects(()=>f.care.addNote(coach,client.userId,{id:randomUUID(),kind:'nutrition',content:'wrong role',shared:true}),e=>e.status===403);
 await assert.rejects(()=>f.care.addNote(dietitian,client.userId,{id:randomUUID(),kind:'nutrition',content:'wrong mention',shared:true,mentionEmail:coach.email}));
});
test('return-to-training plans require medical consent; rehab rejects missing motion and invalid ROM',async t=>{
 const f=await fixture(t);const plan=record('return',{stage:'הערכה',goal:'חזרה לאימון',criteria:'בדיקה אישית',limits:''});await f.wellness.save(doctor,client.userId,plan);await assert.rejects(()=>f.wellness.save(coach,client.userId,record('return',plan.data)),e=>e.status===403);
 const data={region:'ברך',side:'ימין',motion:'כפיפת ברך',pain:2,rom:110,functionScore:8,response:'אחרי אימון',note:''};await f.wellness.save(client,client.userId,record('rehab',data));assert.equal((await f.wellness.bundle(coach,client.userId)).records.some(r=>r.kind==='rehab'),true);
 await assert.rejects(()=>f.wellness.save(client,client.userId,record('rehab',{...data,rom:400})));await assert.rejects(()=>f.wellness.save(client,client.userId,record('rehab',{...data,motion:''})));
});
test('feedback ownership and review are enforced; public stories require separate consent and staff approval',async t=>{
 const f=await fixture(t),id=randomUUID();await f.community.saveFeedback(client,{id,context:'תרגיל לבדיקה',category:'בקשה להסבר',content:'בקשה להסבר נוסף'});
 assert.equal((await f.community.feedback(stranger)).items.length,0);await assert.rejects(()=>f.community.feedback(coach,true),e=>e.status===403);
 await f.community.saveFeedback(doctor,{action:'review',id,version:1,state:'resolved',response:'מענה לבדיקה'});assert.equal((await f.community.feedback(client)).items[0].response,'מענה לבדיקה');
 const story={id:randomUUID(),version:0,displayName:'בדיקת מערכת',content:'סיפור בדיקה פרטי ללא פרטים אישיים',consent:false};await f.community.saveStory(client,story);assert.equal((await f.community.stories(null)).items.length,0);
 await assert.rejects(()=>f.community.saveStory(doctor,{action:'publish',id:story.id,version:1,published:true}),e=>e.status===409);
 await f.community.saveStory(client,{...story,version:1,consent:true});assert.equal((await f.community.stories(null)).items.length,0);
 await f.community.saveStory(doctor,{action:'publish',id:story.id,version:2,published:true});const published=(await f.community.stories(null)).items;assert.equal(published.length,1);assert.equal('ownerId' in published[0],false);
 await f.community.saveStory(client,{action:'revoke',id:story.id,version:3});assert.equal((await f.community.stories(null)).items.length,0);
 await assert.rejects(()=>f.community.saveStory(doctor,{action:'publish',id:story.id,version:3,published:true}),e=>e.status===409);
});
test('RPE survives refresh, completed sets cannot be swapped, and set videos cannot attach to another account',async t=>{
 const f=await fixture(t);await f.training.savePlan(client.userId,{exerciseId:'barbell-bench',sets:2,reps:5,targetRpe:8,weight:0,notes:''});let s=await f.training.start(client.userId,{requestId:randomUUID(),before:0});assert.equal(s.items[0].targetRpe,8);
 s=await f.training.patch(client.userId,{id:s.id,version:s.version,action:'swap',exerciseId:'barbell-bench',replacementId:'bench',confirmed:true});assert.equal(s.items[0].exerciseId,'bench');assert.equal((await f.training.getPlan(client.userId))[0].exerciseId,'barbell-bench');
 s=await f.training.patch(client.userId,{id:s.id,version:s.version,action:'set',exerciseId:'bench',setIndex:0,done:true,amount:5,weight:50,actualRpe:8.5});assert.equal((await f.training.feed(client.userId)).active.items[0].results[0].actualRpe,8.5);
 await assert.rejects(()=>f.training.patch(client.userId,{id:s.id,version:s.version,action:'swap',exerciseId:'bench',replacementId:'barbell-bench',confirmed:true}));
 const video={id:randomUUID(),kind:'review',exerciseId:'bench',sessionId:s.id,setIndex:0,mime:'video/mp4',bytes:100,caption:'סרטון סט לבדיקה'};await f.media.initialize(client,video);await f.media.ready(client,video.id);assert.equal((await f.media.list(client,'review'))[0].setIndex,0);
 await assert.rejects(()=>f.media.initialize(client,{...video,id:randomUUID(),sessionId:randomUUID()}));
});
test('estimates exclude unloaded, timed, high-repetition or pain-affected suggestions',()=>{
 assert.equal(estimated1RM(100,1),100);assert.equal(estimated1RM(60,5),70);assert.equal(estimated1RM(0,5),null);assert.equal(estimated1RM(40,20),null);assert.throws(()=>parseRpe(10.5));assert.throws(()=>parseRpe(8.2));
 const item={unit:'reps',sets:2,reps:5,targetRpe:8,results:[{done:true,amount:5,weight:50,actualRpe:7},{done:true,amount:5,weight:50,actualRpe:7}]};assert.equal(nextLoad(item,{before:0,after:0}).weight,51.25);assert.equal(nextLoad(item,{before:0,after:2}).weight,null);assert.equal(nextLoad({...item,unit:'seconds'},{before:0,after:0}).weight,null);
});
