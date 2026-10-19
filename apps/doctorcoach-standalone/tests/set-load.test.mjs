import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {setEstimated1RM,nextSetLoad,previewNextSetLoad,automaticSetDraft} from '../lib/set-load.ts';import {platform,client} from './platform-db.mjs';import {defaultPrescription} from '../lib/training.ts';
const item=(rpe=8)=>({...defaultPrescription('goblet'),name:'בדיקה',sets:2,reps:5,weight:100,targetRpe:8,results:[{done:true,amount:5,weight:100,actualRpe:rpe},{done:false,amount:5,weight:100,actualRpe:null}]});
const session={before:0,after:null};
test('editing next reps or target updates the actual weight field from the previous completed set without equipment rounding',()=>{
 const i=item(6);i.results[0]={done:true,amount:8,weight:20,actualRpe:6};i.results[1]={done:false,amount:10,weight:20,actualRpe:null};
 const before=JSON.stringify(i),draft={...i.results[1],targetRpe:8};
 assert.equal(automaticSetDraft(i,1,session,draft).weight,20);
 assert.equal(automaticSetDraft(i,1,session,{...draft,amount:8}).weight,21);
 assert.equal(automaticSetDraft(i,1,session,{...draft,amount:8,targetRpe:9}).weight,21.5);
 i.results[0].actualRpe=9;
 assert.equal(automaticSetDraft(i,1,session,{...draft,amount:8}).weight,19.5);
 i.results[0].actualRpe=6;assert.equal(JSON.stringify(i),before);
});
test('automatic draft preserves manual/recorded execution, pain gates and disabled mode',()=>{
 const i=item(6),draft={...i.results[1],targetRpe:8,weight:77};
 for(const override of [{done:true},{actualRpe:8},{painDuring:1}])assert.equal(automaticSetDraft(i,1,session,{...draft,...override}).weight,77);
 assert.equal(automaticSetDraft(i,1,session,draft,false).weight,77);
 assert.equal(automaticSetDraft(i,1,{before:1,after:null},draft).weight,77);
 i.results[0].done=false;assert.equal(automaticSetDraft(i,1,session,draft).weight,77);
});
test('calculated automatic mode persists fractional next weight and never alters later sets or the saved plan',async t=>{
 const f=platform(t);await f.connect();await f.training.savePlan(client.userId,{...defaultPrescription('goblet'),sets:3,reps:5,weight:100,targetRpe:8});
 const start=await f.training.start(client.userId,{requestId:randomUUID(),before:0});
 const saved=await f.training.patch(client.userId,{id:start.id,version:start.version,action:'set',exerciseId:'goblet',setIndex:0,done:true,amount:5,weight:100,actualRpe:6,autoNextLoad:true,loadMode:'calculated',step:2.5});
 assert.equal(saved.items[0].results[1].weight,105.4);
 assert.equal(saved.items[0].results[1].done,false);
 assert.equal(saved.items[0].results[2].weight,100);
 assert.equal((await f.training.feed(client.userId)).active.items[0].results[1].weight,105.4);
 assert.equal((await f.training.getPlan(client.userId))[0].weight,100);
});
test('target 8 and actual 6 previews the fractional next load immediately without saving or changing a set',()=>{
 const i=item();i.results[0]={done:false,amount:5,weight:100,actualRpe:null};
 const before=JSON.stringify(i),draft={...i.results[0],actualRpe:6,targetRpe:8};
 const result=previewNextSetLoad(i,0,{...session,items:[i]},draft);
 assert.equal(result.calculatedWeight,105.4);assert.equal(result.relativePercent,5.4);
 assert.equal(result.weight,105);assert.equal(JSON.stringify(i),before);assert.equal(draft.done,false);
 assert.equal(previewNextSetLoad(i,0,session,{...draft,actualRpe:9}).calculatedWeight,97.3);
 assert.equal(previewNextSetLoad(i,0,session,{...draft,actualRpe:8}).calculatedWeight,100);
});
test('preview responds to next-set reps and target, supports canonical RIR and rejects pain in unsaved drafts',()=>{
 const i=item(6);i.effortScale='rir';i.targetRpes=[8,7];i.results[1].amount=6;
 const draft={...i.results[0],done:false};
 assert.equal(previewNextSetLoad(i,0,session,draft).calculatedWeight,100);
 i.targetRpes[1]=9;assert.equal(previewNextSetLoad(i,0,session,draft).calculatedWeight,105.4);
 assert.equal(previewNextSetLoad(i,0,{...session,items:[i]},{...draft,painDuring:2}).calculatedWeight,null);
 assert.equal(previewNextSetLoad(i,0,session,{...draft,actualRpe:null}).calculatedWeight,null);
 i.results[1].done=true;assert.equal(previewNextSetLoad(i,0,session,draft).calculatedWeight,null);
});
test('preview of first independent target matches the server target initialization after saving',async t=>{
 const f=platform(t);await f.connect();await f.training.savePlan(client.userId,{...defaultPrescription('goblet'),sets:2,reps:5,weight:100});
 const started=await f.training.start(client.userId,{requestId:randomUUID(),before:0});
 const draft={...started.items[0].results[0],done:false,amount:5,weight:100,actualRpe:6,targetRpe:8};
 const preview=previewNextSetLoad(started.items[0],0,started,draft);
 const saved=await f.training.patch(client.userId,{id:started.id,version:started.version,action:'set',exerciseId:'goblet',setIndex:0,...draft,done:true});
 assert.equal(preview.calculatedWeight,nextSetLoad(saved.items[0],0,saved).calculatedWeight);
 assert.equal(saved.items[0].results[1].weight,100);
});
test('RPE-adjusted estimate and next set direction, target, rounding and bounds',()=>{assert.equal(setEstimated1RM(item().results[0],'reps'),123.3);assert.equal(nextSetLoad(item(9),0,session).weight,97.5);assert.equal(nextSetLoad(item(7),0,session).weight,102.5);assert.equal(nextSetLoad(item(8),0,session).weight,100);const i=item(6);i.targetRpe=10;assert.ok(nextSetLoad(i,0,session,.25).weight<=105);assert.equal(nextSetLoad(item(9),0,session,5).weight,100);const j=item();j.results[1].amount=10;assert.ok(nextSetLoad(j,0,session,.25).weight>=95);});
test('no estimates or prescriptions from unsupported, incomplete, painful or already finished sets',()=>{for(const patch of [{weight:0},{weight:NaN},{amount:11},{actualRpe:5},{actualRpe:8.2}])assert.equal(setEstimated1RM({...item().results[0],...patch},'reps'),null);assert.equal(setEstimated1RM(item().results[0],'seconds'),null);assert.equal(nextSetLoad(item(),0,{before:1,after:null}).weight,null);assert.equal(nextSetLoad(item(),1,session).weight,null);assert.equal(nextSetLoad({...item(),targetRpe:null},0,session).weight,null);const i=item();i.results[1].done=true;assert.equal(nextSetLoad(i,0,session).weight,null);});
test('next load persists only the immediate unperformed set and cannot bypass version or ownership',async t=>{const f=platform(t);await f.connect();await f.training.savePlan(client.userId,{...defaultPrescription('goblet'),sets:3,reps:5,weight:100,targetRpe:8});const started=await f.training.start(client.userId,{requestId:randomUUID(),before:0});const saved=await f.training.patch(client.userId,{id:started.id,version:started.version,action:'set',exerciseId:'goblet',setIndex:0,done:true,amount:5,weight:100,actualRpe:9});const payload={id:saved.id,version:saved.version,action:'nextLoad',exerciseId:'goblet',setIndex:0,step:2.5,weight:999};const adjusted=await f.training.patch(client.userId,payload);assert.equal(adjusted.items[0].results[1].weight,97.5);assert.equal(adjusted.items[0].results[1].done,false);assert.equal(adjusted.items[0].results[0].weight,100);assert.equal(adjusted.items[0].results[2].weight,100);assert.equal((await f.training.getPlan(client.userId))[0].weight,100);assert.equal((await f.training.feed(client.userId)).active.items[0].results[1].weight,97.5);await assert.rejects(()=>f.training.patch(client.userId,payload),e=>e.status===409);await assert.rejects(()=>f.training.patch('doctor',payload));const completed=await f.training.patch(client.userId,{id:saved.id,version:adjusted.version,action:'set',exerciseId:'goblet',setIndex:1,done:true,amount:5,weight:97.5,actualRpe:8});await assert.rejects(()=>f.training.patch(client.userId,{...payload,version:completed.version}));});

test('calculated weight and relative change remain independent of equipment increments and application cap',()=>{
 const i=item(6);i.results[0].amount=6;i.results[1].amount=6;i.targetRpe=7;
 for(const step of [.25,1,2.5,5,3]){
 const suggestion=nextSetLoad(i,0,session,step);
 assert.equal(suggestion.calculatedWeight,102.6);
 assert.equal(suggestion.relativePercent,2.6);
 }
 assert.equal(nextSetLoad(i,0,session,5).weight,100);
 i.targetRpe=10;const higher=nextSetLoad(i,0,session,.25);
 assert.equal(higher.calculatedWeight,111.1);assert.equal(higher.relativePercent,11.1);assert.equal(higher.weight,105);
 i.results[0].done=false;assert.equal(nextSetLoad(i,0,session).calculatedWeight,null);
 i.results[0].done=true;assert.equal(nextSetLoad(i,0,{before:1,after:null}).relativePercent,null);
});
