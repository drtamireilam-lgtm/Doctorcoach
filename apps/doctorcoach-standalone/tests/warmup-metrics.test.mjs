import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultPrescription} from '../lib/training.ts';
import {parseAssignedItems} from '../lib/care.ts';
import {performancePoints} from '../lib/performance.ts';
import {weeklyProgress} from '../lib/weekly-progress.ts';
import {nextSetLoad} from '../lib/set-load.ts';
const work={...defaultPrescription('goblet'),name:'Goblet',targetRpe:8,warmupSets:[{amount:5,weight:900}],warmupResults:[{done:true,amount:5,weight:900,actualRpe:8}],results:[{done:true,amount:5,weight:50,actualRpe:8},{done:false,amount:5,weight:50}]};
const prep={...work,workoutSection:'warmup',warmupSets:[],warmupResults:[],results:[{done:true,amount:5,weight:800,actualRpe:8}]};
const s={id:'a',status:'completed',items:[work,prep],before:0,after:0,startedAt:'2026-10-05T09:00:00Z',finishedAt:'2026-10-05T10:00:00Z',version:1,plannedSets:3,completedSets:2};
test('assigned JSON parsing preserves independent warmups, side and repeated occurrences',()=>{
 const parsed=parseAssignedItems([{...work,occurrenceId:'a',side:'left'},{...work,occurrenceId:'b',side:'right'}]);
 assert.deepEqual(parsed[0].warmupSets,work.warmupSets);assert.equal(parsed[1].side,'right');assert.equal(parsed[1].occurrenceId,'b');
});
test('preparation never contributes to strength progression, load estimates or weekly volume',()=>{
 const points=performancePoints([s],'goblet');assert.equal(points[0].weight,50);assert.ok(points[0].e1rm<100);
 const report=weeklyProgress([s],[],'2026-10-04');assert.equal(report.current.volume,250);assert.equal(report.current.sets,1);assert.equal(report.current.exercises[0].weight,50);
 const hint=nextSetLoad(prep,0,s);assert.equal(hint.estimate,null);assert.equal(hint.weight,null);assert.equal(hint.calculatedWeight,null);
 assert.deepEqual(performancePoints([{...s,items:[prep]}],'goblet'),[]);
});

test('revision and day-copy warmup edits cannot mutate their source plan',async()=>{
 const {revisionDraft}=await import('../lib/program-revisions.ts');const {copyWorkoutDay,copiedProgramDraft}=await import('../lib/program-copy.ts');
 const source={id:'source',title:'Test',items:[work],authorName:'Coach',createdAt:'2026-01-01',appliedAt:null};
 const revised=revisionDraft(source);revised.items[0].warmupSets[0].weight=99;assert.equal(source.items[0].warmupSets[0].weight,900);
 const day=copyWorkoutDay(source.items,'1','2');day.items[1].warmupSets[0].amount=9;assert.equal(source.items[0].warmupSets[0].amount,5);
 const copy=copiedProgramDraft(source,null);copy.items[0].warmupSets[0].weight=11;assert.equal(source.items[0].warmupSets[0].weight,900);
});
