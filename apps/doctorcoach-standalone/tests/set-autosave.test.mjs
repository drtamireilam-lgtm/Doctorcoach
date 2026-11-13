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
