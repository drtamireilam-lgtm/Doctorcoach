import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {progressionProposal} from '../lib/program-progression.ts';
import {defaultPrescription} from '../lib/training.ts';
import {platform,client,coach} from './platform-db.mjs';
const item=()=>({...defaultPrescription('goblet'),dayId:'1',sets:2,reps:5,weight:100,targetRpe:8});
const session=(patch={})=>({id:'s',programId:'p',status:'completed',startedAt:'2026-10-01T10:00:00Z',finishedAt:'2026-10-01T11:00:00Z',before:0,after:0,items:[{...item(),name:'test',results:[0,1].map(()=>({done:true,weight:100,amount:5,actualRpe:7}))}],...patch});
const feed=(history,active=null)=>({history,active,stats:{total:history.length,week:history.length,sets:4}});
test('proposal uses existing next-workout rule without changing plan or history',()=>{
 const i=item(),s=session(),before=JSON.stringify({i,s});
 assert.equal(progressionProposal(i,'p',feed([s])).weight,102.5);
 s.items[0].results.forEach(r=>r.actualRpe=9);assert.equal(progressionProposal(i,'p',feed([s])).weight,97.5);
 s.items[0].results.forEach(r=>r.actualRpe=7);assert.equal(JSON.stringify({i,s}),before);
});
test('same exercise on a different day or an old program never supplies the proposal',()=>{
 const old=session({programId:'old'}),other=session();other.items[0].dayId='2';
 assert.equal(progressionProposal(item(),'p',feed([old,other])).weight,null);
 assert.equal(progressionProposal(item(),'p',feed([session()],session())).weight,null);
});
test('latest matching day takes precedence even when incomplete or substituted',()=>{
 const latest=session({id:'latest',finishedAt:'2026-10-02T11:00:00Z'});latest.items[0].results[1].done=false;
 assert.equal(progressionProposal(item(),'p',feed([session(),latest])).weight,null);
 latest.items[0].exerciseId='bench';latest.items[0].swappedFrom='goblet';
 assert.equal(progressionProposal(item(),'p',feed([session(),latest])).weight,null);
});
test('pain at every timing and changed prescriptions suppress suggestions',()=>{
 for(const patch of [{before:2},{after:1},{followup:{pain:3}}])assert.equal(progressionProposal(item(),'p',feed([session(patch)])).weight,null);
 const s=session();s.items[0].results[0].painDuring=2;assert.equal(progressionProposal(item(),'p',feed([s])).weight,null);
 for(const patch of [{sets:3},{reps:8},{targetRpe:9},{unit:'seconds'}])assert.equal(progressionProposal({...item(),...patch},'p',feed([session()])).weight,null);
});
test('RIR is compared canonically and changing display scale keeps the same recommendation',()=>{
 assert.equal(progressionProposal({...item(),effortScale:'rir'},'p',feed([session()])).weight,102.5);
 const s=session();s.items[0].results[0].weight=90;assert.equal(progressionProposal(item(),'p',feed([s])).weight,null);
});
test('approved revision carries proposed load to the next workout and preserves prior snapshots',async t=>{
 const f=platform(t);await f.connect();const p={id:randomUUID(),title:'תוכנית מקור',items:[item()]};await f.care.assign(coach,client.userId,p);
 let s=await f.training.start(client.userId,{requestId:randomUUID(),before:0});
 for(const setIndex of [0,1])s=await f.training.patch(client.userId,{action:'set',id:s.id,version:s.version,exerciseId:'goblet',setIndex,done:true,amount:5,weight:100,actualRpe:7});
 s=await f.training.patch(client.userId,{action:'finish',id:s.id,version:s.version,after:0});
 const proposal=progressionProposal(p.items[0],p.id,await f.training.feed(client.userId));assert.equal(proposal.weight,102.5);
 const revision={id:randomUUID(),revisionOf:p.id,title:'התקדמות מאושרת',items:[{...p.items[0],weight:proposal.weight}]};
 assert.equal((await f.training.getPlan(client.userId))[0].weight,100);
 await assert.rejects(()=>f.care.assign(client,client.userId,revision));
 await f.care.assign(coach,client.userId,revision);
 const next=await f.training.start(client.userId,{requestId:randomUUID(),before:0});
 assert.equal(next.programId,revision.id);assert.equal(next.items[0].results[0].weight,102.5);
 assert.equal((await f.training.feed(client.userId)).history[0].items[0].results[0].weight,100);
});
