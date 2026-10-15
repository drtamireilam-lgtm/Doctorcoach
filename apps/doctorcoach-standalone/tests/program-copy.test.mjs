import test from 'node:test';
import assert from 'node:assert/strict';
import {copyWorkoutDay,copiedProgramDraft} from '../lib/program-copy.ts';
import {defaultPrescription} from '../lib/training.ts';
import {workoutDayId} from '../lib/workout-days.ts';
const item=(dayId='1')=>({...defaultPrescription('goblet'),dayId,targetRpes:[7,8,8],repsMax:10,tempo:{eccentric:3,bottom:0,concentric:2,top:0},notes:'cue',approvedSubstitutions:['back-squat']});
test('day copy preserves all dose settings but detaches arrays and replaces only the confirmed destination',()=>{
 const source=item(),other={...item('3'),exerciseId:'bench'},destination={...item('2'),exerciseId:'rdl'},original=[source,destination,other];
 const result=copyWorkoutDay(original,'1','2');assert.equal(result.replacedCount,1);assert.equal(result.sourceCount,1);assert.equal(result.items.length,3);
 const copied=result.items.find(i=>workoutDayId(i)==='2');assert.equal(copied.exerciseId,'goblet');assert.equal(copied.repsMax,10);assert.equal(copied.notes,'cue');assert.deepEqual(copied.tempo,source.tempo);
 copied.targetRpes[0]=10;copied.tempo.eccentric=1;copied.approvedSubstitutions.push('bench');assert.equal(source.targetRpes[0],7);assert.equal(source.tempo.eccentric,3);assert.equal(source.approvedSubstitutions.length,1);
 assert.equal(original[1].exerciseId,'rdl');assert.equal(result.items.find(i=>workoutDayId(i)==='3'),other);
});
test('legacy day one copies to an empty destination; invalid or oversized copies never mutate the source',()=>{
 const legacy=item();delete legacy.dayId;assert.equal(copyWorkoutDay([legacy],'1','4').items[1].dayId,'4');
 for(const [source,target] of [['1','1'],['1','8'],['2','3']])assert.throws(()=>copyWorkoutDay([legacy],source,target));
 const full=Array.from({length:30},(_,n)=>({...item(),exerciseId:'exercise-'+n}));assert.throws(()=>copyWorkoutDay(full,'1','2'));assert.equal(full.length,30);
 assert.throws(()=>copyWorkoutDay([item(),item()],'1','2'));
});
test('program copy contains only editable program data and retains the intended active revision',()=>{
 const program={id:'source',title:'Old plan',authorName:'A person',clientId:'private identity',items:[item()],createdAt:'2026-01-01',appliedAt:null};
 const copied=copiedProgramDraft(program,'active-target');assert.equal(copied.revisionOf,'active-target');assert.deepEqual(Object.keys(copied).sort(),['items','revisionOf','title']);
 copied.items[0].targetRpes[0]=10;assert.equal(program.items[0].targetRpes[0],7);assert.ok(copied.title.length<=100);assert.throws(()=>copiedProgramDraft({...program,items:[]},null));
});
