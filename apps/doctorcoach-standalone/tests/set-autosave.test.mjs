import test from 'node:test';
import assert from 'node:assert/strict';
import { setAutosaveAction } from '../lib/set-autosave.ts';
import { defaultPrescription } from '../lib/training.ts';
import { platform, client } from './platform-db.mjs';

const item = () => ({...defaultPrescription('goblet'), occurrenceId:'first', name:'test', results:[{done:false,amount:8,weight:20,actualRpe:null}]});
test('autosave preserves completion and user decimal weight without changing next-set guidance', () => {
  const i = item();
  const action = setAutosaveAction(i,0,{...i.results[0],done:true,weight:33.125,actualRpe:7,targetRpe:8});
  assert.equal(action.done,false);
  assert.equal(action.weight,33.125);
  assert.equal(action.autoNextLoad,false);
  assert.equal(setAutosaveAction(i,0,{...i.results[0],weight:NaN,targetRpe:8}),null);
  assert.equal(setAutosaveAction(i,0,{...i.results[0],amount:0,targetRpe:8}),null);
  assert.equal(setAutosaveAction(i,0,{...i.results[0],targetRpe:11}),null);
});
test('versioned autosave survives reload without marking a set done and rejects stale edits', async t => {
  const f = platform(t); await f.connect();
  await f.training.savePlan(client.userId, defaultPrescription('goblet'));
  const session = await f.training.start(client.userId,{requestId:crypto.randomUUID(),before:0});
  const i = session.items[0];
  const action = setAutosaveAction(i,0,{...i.results[0],weight:33.125,amount:8,actualRpe:7,targetRpe:8});
  const saved = await f.training.patch(client.userId,{...action,id:session.id,version:session.version});
  assert.equal(saved.items[0].results[0].done,false);
  assert.equal(saved.completedSets,0);
  assert.equal((await f.training.feed(client.userId)).active.items[0].results[0].weight,33.125);
  await assert.rejects(() => f.training.patch(client.userId,{...action,id:session.id,version:session.version}),e=>e.status===409);
});
test('actual RPE entered after completing 50kg x10 refreshes next target7 load without marking next done', async t=>{
 const f=platform(t);await f.connect();await f.training.savePlan(client.userId,{...defaultPrescription('bench'),sets:2,reps:10,weight:50,targetRpe:8,targetRpes:[8,7]});let s=await f.training.start(client.userId,{requestId:crypto.randomUUID(),before:0});s=await f.training.patch(client.userId,{id:s.id,version:s.version,action:'set',exerciseId:'bench',setIndex:0,done:true,amount:10,weight:50,actualRpe:null});const row=s.items[0],draft={...row.results[0],actualRpe:8,targetRpe:8};const action=setAutosaveAction(row,0,draft,{enabled:true,step:0});assert.equal(action.autoNextLoad,true);s=await f.training.patch(client.userId,{...action,id:s.id,version:s.version});assert.ok(Math.abs(s.items[0].results[1].weight-48.8372)<.0001);assert.equal(s.items[0].results[1].amount,10);assert.equal(s.items[0].results[1].actualRpe,null);assert.equal(s.items[0].results[1].done,false);assert.equal(s.items[0].targetRpes[1],7);
});
