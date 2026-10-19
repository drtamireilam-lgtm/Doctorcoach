import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,coach,client} from './platform-db.mjs';
import {defaultPrescription,parsePlanItem} from '../lib/training.ts';
import {prepareProgramReview} from '../lib/program-review.ts';
import {revisionDraft} from '../lib/program-revisions.ts';
import {progressionProposal} from '../lib/program-progression.ts';
const tempo={eccentric:3,bottom:0,concentric:2,top:0};
const item=()=>({...defaultPrescription('goblet'),tempo:{...tempo},notes:'שמור על הגב יציב',dayId:'2'});

test('tempo is optional, validated, preserves zero pauses and can be removed',()=>{
 assert.equal(parsePlanItem(defaultPrescription('goblet')).tempo,undefined);
 assert.deepEqual(parsePlanItem(item()).tempo,tempo);
 assert.deepEqual(parsePlanItem({exerciseId:'goblet',weight:20},item()).tempo,tempo);
 assert.equal(parsePlanItem({exerciseId:'goblet',tempo:null},item()).tempo,null);
 for(const bad of [ {},{...tempo,eccentric:-1},{...tempo,top:61},{...tempo,concentric:NaN},{...tempo,bottom:'0'},{eccentric:0,bottom:0,concentric:0,top:0} ])assert.throws(()=>parsePlanItem({...item(),tempo:bad}));
 assert.throws(()=>parsePlanItem({...item(),unit:'seconds'}));
 assert.equal(parsePlanItem({...item(),unit:'seconds',tempo:null}).tempo,null);
 const fractional={...tempo,eccentric:2.5};assert.deepEqual(parsePlanItem({...item(),tempo:fractional}).tempo,fractional);
});
test('review and revision copy tempo and personal exercise notes without mutating original',()=>{
 const p={id:randomUUID(),title:'תוכנית בדיקה',items:[item()]};
 const review=prepareProgramReview(p.title,p.items),revision=revisionDraft(p);
 review.items[0].tempo.eccentric=5;revision.items[0].tempo.top=1;
 assert.deepEqual(p.items[0].tempo,tempo);
 assert.equal(review.items[0].notes,p.items[0].notes);
});
test('coach assignment, trainee plan and completed workout retain exercise-specific tempo and notes',async t=>{
 const f=platform(t);await f.connect();
 const p={id:randomUUID(),title:'תוכנית טמפו',items:[item()]};await f.care.assign(coach,client.userId,p);
 const saved=await f.training.getPlan(client.userId);
 assert.deepEqual(saved[0].tempo,tempo);assert.equal(saved[0].notes,item().notes);
 let session=await f.training.start(client.userId,{requestId:randomUUID(),before:0,dayId:'2'});
 assert.deepEqual(session.items[0].tempo,tempo);assert.equal(session.items[0].notes,item().notes);
 session=await f.training.patch(client.userId,{id:session.id,version:session.version,action:'set',exerciseId:'goblet',setIndex:0,amount:10,weight:20,done:true,actualRpe:8});
 session=await f.training.patch(client.userId,{id:session.id,version:session.version,action:'finish',after:0});
 const next=revisionDraft(p);next.items[0].tempo.eccentric=5;next.items[0].notes='הנחיה מעודכנת';await f.care.assign(coach,client.userId,{...next,id:randomUUID()});
 const bundle=await f.care.bundle(client,client.userId);
 assert.deepEqual(bundle.training.history[0].items[0].tempo,tempo);
 assert.equal(bundle.training.history[0].items[0].notes,item().notes);
});
test('independent plan persistence preserves tempo on patch and removes it explicitly',async t=>{
 const f=platform(t);await f.connect();
 await f.training.savePlan(client.userId,item());
 assert.deepEqual((await f.training.getPlan(client.userId))[0].tempo,tempo);
 await f.training.savePlan(client.userId,{exerciseId:'goblet',weight:30});
 assert.deepEqual((await f.training.getPlan(client.userId))[0].tempo,tempo);
 await f.training.savePlan(client.userId,{exerciseId:'goblet',tempo:null});
 assert.equal((await f.training.getPlan(client.userId))[0].tempo,undefined);
});
test('a coach changing tempo must reconsider the previous workout load suggestion',()=>{
 const source={...item(),targetRpe:8,results:[{done:true,amount:10,weight:20,actualRpe:8},{done:true,amount:10,weight:20,actualRpe:8}]};
 const feed={active:null,history:[{id:'finished',programId:'program',status:'completed',before:0,after:0,items:[source],startedAt:'2026-01-01',finishedAt:'2026-01-01'}]};
 assert.equal(progressionProposal(source,'program',feed).weight,20);
 assert.equal(progressionProposal({...source,tempo:{...tempo,eccentric:5}},'program',feed).weight,null);
});
