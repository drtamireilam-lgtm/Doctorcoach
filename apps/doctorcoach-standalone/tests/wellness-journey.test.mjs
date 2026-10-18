import {verifySyntheticDietitian} from './platform-db.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,doctor,coach,client,stranger} from './platform-db.mjs';
import {onboardingStore} from '../lib/onboarding-store.ts';
import {wellnessStore} from '../lib/wellness-store.ts';
import {consents,CONSENT_REVISION} from '../lib/intake.ts';
import {todayIsrael} from '../lib/wellness.ts';
import {readMilestones} from '../lib/rehab-journey.ts';
import {progressTimeline} from '../lib/progress-timeline.ts';
import {currentWeek} from '../lib/care.ts';
const diet={userId:'diet',email:'diet@example.test'},coord={userId:'coord',email:'coord@example.test'};
const config={adminEmails:doctor.email,clinicianEmails:doctor.email};
const record=(kind,data)=>({id:randomUUID(),kind,version:0,day:todayIsrael(),data});
async function fresh(t){const f=platform(t);for(const [u,role] of [[coach,'coach'],[diet,'dietitian'],[coord,'coordinator']])await f.care.saveStaff(doctor,{...u,name:u.userId+' synthetic',role,active:true});verifySyntheticDietitian(f,diet.email);const onboard=onboardingStore(f.db,config);await onboard.save(client,{version:0,complete:true,consentRevision:CONSENT_REVISION,consents:Object.fromEntries(consents.map(c=>[c.id,c.required])),teamEmails:[doctor.email,coach.email,diet.email,coord.email],teamGrants:[{email:doctor.email,role:'clinician'},{email:coach.email,role:'coach'},{email:diet.email,role:'dietitian'},{email:coord.email,role:'coordinator'}],answers:{name:'Synthetic trainee',phone:'0500000000',current_injury:'no',red_flags:['none'],age:35,medical_history:['אין מחלות רקע משמעותיות'],training_frequency:'3–4',training_style:['Powerlifting'],specific_goals:['העלאת כוח']}});return {...f,onboard,w:wellnessStore(f.db,config)};}
test('nutrition journey spans private assessment, dietitian plan/review, sharing and revocation without clinical leakage',async t=>{
 const f=await fresh(t),assessment=record('assessment',{goal:'Synthetic goal',routine:'Private nutrition routine',allergies:'Private allergies',shareTeam:false});
 await f.w.save(client,client.userId,assessment);
 const plan=record('plan',{mode:'macros',principles:'Synthetic nutrition principles',calories:2200,protein:140,carbs:260,fat:65,trainingDay:'Training plan',restDay:'Rest plan'});
 for(const u of [client,coach,doctor])await assert.rejects(()=>f.w.save(u,client.userId,plan),e=>e.status===403);
 await f.w.save(diet,client.userId,plan);
 await f.w.save(client,client.userId,record('daily',{weight:80,waist:90,adherence:8,dayType:'training',note:'Private diary'}));
 await f.w.save(client,client.userId,{...record('weekly',{success:'Synthetic weekly success',difficulty:'Private difficulty',question:'Private question'}),day:currentWeek()});
 await f.w.save(diet,client.userId,{...record('weeklyReview',{response:'Synthetic dietitian response'}),day:currentWeek()});
 await f.care.addNote(diet,client.userId,{id:randomUUID(),kind:'nutrition',content:'Private dietitian note',shared:false});
 const dietView=await f.w.bundle(diet,client.userId);assert.ok(['assessment','plan','daily','weekly','weeklyReview'].every(kind=>dietView.records.some(r=>r.kind===kind)));assert.equal(dietView.canPlan,true);
 for(const u of [coach,doctor]){const b=await f.w.bundle(u,client.userId);assert.equal(b.summary,null);assert.equal(b.records.length,0);assert.ok(!JSON.stringify(await f.care.bundle(u,client.userId)).includes('Private dietitian note'));}
 await f.w.save(client,client.userId,{...assessment,version:1,data:{...assessment.data,shareTeam:true}});
 const shared=await f.w.bundle(coach,client.userId);assert.equal(shared.summary.weight,80);assert.equal(shared.records.length,0);assert.ok(!JSON.stringify(shared).includes('Private'));
 await f.w.save(client,client.userId,{...assessment,version:2});assert.equal((await f.w.bundle(coach,client.userId)).summary,null);
 const own=await f.care.bundle(client,client.userId);await f.care.revoke(client,{id:own.connections.find(c=>c.role==='dietitian').id});await assert.rejects(()=>f.w.bundle(diet,client.userId),e=>e.status===403);
 assert.ok((await f.w.bundle(client,client.userId)).records.some(r=>r.id===plan.id));await assert.rejects(()=>f.w.bundle(coord,client.userId),e=>e.status===403);await assert.rejects(()=>f.w.bundle(stranger,client.userId),e=>e.status===403);
 assert.ok((await f.onboard.export(client)).wellness.some(r=>r.id===plan.id));
});
test('rehabilitation journey keeps clinician milestones, linked pain/ROM, revision history and closed-episode restrictions',async t=>{
 const f=await fresh(t),episode=record('episode',{label:'Synthetic knee episode',region:'ברך',side:'ימין',status:'active'});
 for(const u of [client,coach,diet])await assert.rejects(()=>f.w.save(u,client.userId,episode),e=>e.status===403);
 await f.w.save(doctor,client.userId,episode);
 const milestone={id:'clinical-check',stage:'הערכה',label:'Synthetic milestone',criteria:'Explicit clinician confirmation',status:'pending'};
 const plan=record('return',{episodeId:episode.id,stage:'הערכה',goal:'Synthetic return goal',criteria:'Team-defined criteria',limits:'Team-defined limits',milestones:JSON.stringify([milestone])});await f.w.save(doctor,client.userId,plan);
 const measurement=record('rehab',{episodeId:episode.id,region:'ברך',side:'ימין',motion:'כיפוף ברך',pain:3,rom:110,functionScore:6,response:'אחרי אימון',note:'Synthetic measurement'});await f.w.save(client,client.userId,measurement);
 const before=await f.w.bundle(client,client.userId);assert.equal(readMilestones(before.records.find(r=>r.id===plan.id).data.milestones)[0].status,'pending');
 await f.w.save(doctor,client.userId,{...plan,version:1,data:{...plan.data,stage:'פעילות מותאמת',milestones:JSON.stringify([{...milestone,status:'met'}])}});
 await assert.rejects(()=>f.w.save(doctor,client.userId,{...plan,version:1}),e=>e.status===409);
 const b=await f.w.bundle(client,client.userId);assert.equal(b.returnHistoryTotals[episode.id],2);assert.equal(readMilestones(b.records.find(r=>r.id===plan.id).data.milestones)[0].status,'met');assert.equal(b.records.find(r=>r.id===measurement.id).data.rom,110);
 assert.ok(progressTimeline(await f.training.feed(client.userId),b.records).some(e=>e.category==='recovery'));
 for(const u of [coach,diet]){const view=await f.w.bundle(u,client.userId);assert.equal(view.canReturn,false);assert.ok(view.records.some(r=>r.id===measurement.id));}
 await f.w.save(doctor,client.userId,{...episode,version:1,data:{...episode.data,status:'closed'}});await assert.rejects(()=>f.w.save(client,client.userId,{...measurement,id:randomUUID()}),e=>e.status===409);
 const own=await f.care.bundle(client,client.userId);await f.care.revoke(client,{id:own.connections.find(c=>c.role==='clinician').id});await assert.rejects(()=>f.w.bundle(doctor,client.userId),e=>e.status===403);
 assert.equal((await f.w.bundle(client,client.userId)).returnHistoryTotals[episode.id],2);await assert.rejects(()=>f.w.bundle(coord,client.userId),e=>e.status===403);assert.ok((await f.onboard.export(client)).wellness.some(r=>r.id===measurement.id));
});
