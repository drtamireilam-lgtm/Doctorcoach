import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {prepareProgramReview,programReviewDays} from '../lib/program-review.ts';
import {defaultPrescription} from '../lib/training.ts';
import {effortTarget} from '../lib/effort.ts';
import {platform,coach,client} from './platform-db.mjs';

test('review covers every populated day in order without combining different units',()=>{
 const p=prepareProgramReview('תוכנית בדיקה',[
  {...defaultPrescription('walk'),dayId:'3'},
  {...defaultPrescription('goblet'),dayId:'1',sets:3,targetRpe:8,effortScale:'rir'},
  {...defaultPrescription('balance'),dayId:'3',sets:2},
  {...defaultPrescription('goblet'),dayId:'3',sets:4,targetRpe:9},
 ]);
 const days=programReviewDays(p.items);
 assert.deepEqual(days.map(d=>d.id),['1','3']);assert.deepEqual(days.map(d=>d.sets),[3,7]);
 assert.deepEqual(days[1].items.map(i=>i.unit),['minutes','seconds','reps']);
 assert.equal(effortTarget(days[0].items[0]),'RIR יעד 2');
 assert.equal(days.flatMap(d=>d.items).length,4);
});
test('review validates hidden days, legacy duplicates, and empty drafts before publishing',()=>{
 assert.throws(()=>prepareProgramReview('שם',[]));
 assert.throws(()=>prepareProgramReview('תוכנית',[]));
 assert.throws(()=>prepareProgramReview('תוכנית',[defaultPrescription('goblet'),{...defaultPrescription('walk'),dayId:'2',reps:999}]));
 assert.equal(new Set(prepareProgramReview('תוכנית',[defaultPrescription('goblet'),{...defaultPrescription('goblet'),dayId:'1'}]).items.map(i=>i.occurrenceId)).size,2);
 assert.throws(()=>prepareProgramReview('תוכנית',[{...defaultPrescription('goblet'),dayId:'2',approvedSubstitutions:['walk']}]));
 assert.equal(programReviewDays(prepareProgramReview('תוכנית',[defaultPrescription('goblet')]).items)[0].id,'1');
});
test('review normalization matches the published program and keeps its own snapshot',async t=>{
 const f=platform(t);await f.connect();
 const draft=[{...defaultPrescription('goblet'),dayId:'2',weight:90,notes:'  הנחיה  ',targetRpe:8,effortScale:'rir',approvedSubstitutions:['bench']}];
 const review=prepareProgramReview('  תוכנית לדוגמה  ',draft);
 draft[0].sets=7;draft[0].approvedSubstitutions.push('wall-slide');
 assert.equal(review.items[0].sets,2);assert.deepEqual(review.items[0].approvedSubstitutions,['bench']);
 assert.equal(review.items[0].weight,90);assert.equal(review.items[0].notes,'הנחיה');
 assert.equal((await f.care.bundle(client,client.userId)).programs.length,0);
 await f.care.assign(coach,client.userId,{id:randomUUID(),...review});
 const published=(await f.care.bundle(client,client.userId)).programs[0];
 assert.equal(published.title,review.title);assert.deepEqual(published.items,review.items);
});
