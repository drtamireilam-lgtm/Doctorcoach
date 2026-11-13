import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRestSeconds} from '../lib/rest-prescription.ts';
import {defaultPrescription,parsePlanItem} from '../lib/training.ts';
import {reorderProgramOccurrence} from '../lib/program-copy.ts';
import {detectImportColumns,extractImportRows,finalizeImport} from '../lib/program-import.ts';
import {platform,client,coach} from './platform-db.mjs';
import {templateItems} from '../lib/program-templates.ts';
import {coachDraftStore} from '../lib/coach-drafts.ts';
import {randomUUID} from 'node:crypto';
test('rest accepts explicit units and clock notation without guessing ambiguous instructions',()=>{
 for(const [raw,value] of [['',null],['0',0],['90',90],['90 seconds',90],['90 שניות',90],['1.5 min',90],['1:30',90]])assert.equal(parseRestSeconds(raw),value);
 for(const raw of ['60-90','as needed','-5','1:70','1801','Infinity','1.1 seconds'])assert.throws(()=>parseRestSeconds(raw));
});
test('rest is optional, validates numeric API input, and supports explicit clearing',()=>{
 const base=defaultPrescription('goblet');assert.equal(parsePlanItem(base).restSeconds,undefined);
 assert.equal(parsePlanItem({...base,restSeconds:0}).restSeconds,0);
 assert.equal(parsePlanItem({exerciseId:'goblet'},{...base,restSeconds:90}).restSeconds,90);
 assert.equal(parsePlanItem({...base,restSeconds:null},{...base,restSeconds:90}).restSeconds,null);
 for(const restSeconds of [-1,1801,1.5,'90',NaN])assert.throws(()=>parsePlanItem({...base,restSeconds}));
});
test('import maps Hebrew rest and retains raw provenance after manual correction',()=>{
 const cell=value=>({value,formula:false}),sheet={name:'A',rows:[['exercise','sets','reps','מנוחה'],['Goblet squat','3','8','60-90']].map(row=>row.map(cell))};
 const d=detectImportColumns(sheet);assert.equal(d.mapping.rest,3);
 const rows=extractImportRows(sheet,d.header,d.mapping);assert.throws(()=>finalizeImport(rows));
 const fixed=rows.map(row=>({...row,rest:'1:30'}));const imported=finalizeImport(fixed);assert.equal(imported[0].restSeconds,90);assert.equal(imported[0].importSource.raw.rest,'60-90');
});
test('rest survives independent persistence and a new session snapshots the original dose',async t=>{
 const f=platform(t);await f.connect();await f.training.savePlan(client.userId,{...defaultPrescription('goblet'),restSeconds:90});
 assert.equal((await f.training.getPlan(client.userId))[0].restSeconds,90);
 const session=await f.training.start(client.userId,{requestId:randomUUID(),before:0});
 await f.training.savePlan(client.userId,{...defaultPrescription('goblet'),restSeconds:120});
 assert.equal((await f.training.feed(client.userId)).active.items[0].prescription.restSeconds,90);assert.equal(session.items[0].restSeconds,90);
});
test('drag ordering uses occurrence identity and cannot cross a day or section',()=>{
 const item=(id,dayId='1',workoutSection='main')=>({...defaultPrescription('goblet'),occurrenceId:id,dayId,workoutSection});
 const items=[item('a'),item('other','2'),item('b'),item('warm','1','warmup'),item('c')];
 assert.deepEqual(reorderProgramOccurrence(items,'c','a').map(i=>i.occurrenceId),['c','other','a','warm','b']);
 assert.deepEqual(items.map(i=>i.occurrenceId),['a','other','b','warm','c']);
 for(const target of ['other','warm','missing'])assert.equal(reorderProgramOccurrence(items,'a',target),items);
});

test('explicit minute headers convert bare quantities and preserve raw values',()=>{for(const header of ['Rest (minutes)','Rest (min)','מנוחה (דקות)']){const cell=value=>({value,formula:false}),sheet={name:'A',rows:[['Exercise','Sets','Reps',header],['Goblet squat','3','8','2']].map(r=>r.map(cell))},d=detectImportColumns(sheet),items=finalizeImport(extractImportRows(sheet,d.header,d.mapping));assert.equal(items[0].restSeconds,120,header);assert.equal(items[0].importSource.raw.rest,'2');}});

test('coach rest persists in private drafts and assignment; edits leave original sessions intact',async t=>{
 const f=platform(t);await f.connect();const drafts=coachDraftStore(f.db,f.care),items=[{...defaultPrescription('goblet'),restSeconds:90}];
 await drafts.save(coach,client.userId,{action:'save',version:0,requestId:randomUUID(),title:'Rest',items,revisionOf:null});
 const draft=(await drafts.get(coach,client.userId)).draft;assert.equal(draft.items[0].restSeconds,90);
 await f.care.assign(coach,client.userId,{id:randomUUID(),title:'Rest',items:draft.items});
 const started=await f.training.start(client.userId,{requestId:randomUUID(),dayId:'1',before:0});assert.equal(started.items[0].prescription.restSeconds,90);
 draft.items[0].restSeconds=120;await drafts.save(coach,client.userId,{action:'save',version:1,...draft});
 assert.equal((await f.training.feed(client.userId)).active.items[0].prescription.restSeconds,90);
 await assert.rejects(()=>drafts.save(client,client.userId,{action:'save',version:2,...draft}),e=>e.status===403);
});

test('private reusable templates preserve rest without retaining client notes',()=>{const saved=templateItems([{...defaultPrescription('goblet'),restSeconds:90,notes:'private'}]);assert.equal(saved[0].restSeconds,90);assert.equal(saved[0].notes,'');});
