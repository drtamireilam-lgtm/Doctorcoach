import {resolveSessionExercise, targetRpeForSet, TrainingError, type SessionExercise} from './training.ts';
import {workoutDayId} from './workout-days.ts';
import {workoutSection} from './workout-sections.ts';

/** Only session JSON changes. Prescribed snapshots and completed results stay attached to their occurrence. */
export function moveSessionExercise(items:SessionExercise[], payload:Record<string,unknown>) {
  if(payload.direction!==1 && payload.direction!==-1)throw new TrainingError('בחרו כיוון תקין לסידור התרגיל.');
  const item=resolveSessionExercise(items,payload);
  const peers=items.filter(i=>workoutDayId(i)===workoutDayId(item)&&workoutSection(i)===workoutSection(item));
  const other=peers[peers.indexOf(item)+payload.direction];
  if(!other)return items;
  const next=[...items],a=next.indexOf(item),b=next.indexOf(other);
  [next[a],next[b]]=[next[b],next[a]];
  return next;
}
export function removableSessionSet(item:SessionExercise) {
  const index=item.results.length-1, set=item.results[index];
  return !item.cardio && item.sets>1 && !!set && !set.done && set.actualRpe==null && set.painDuring==null &&
    set.weightSource!=='manual' && set.amount===(item.setReps?.[index]?.min??item.reps) && (set.weightSource==='automatic'||set.weight===item.weight);
}
export function changeSessionSetCount(items:SessionExercise[],payload:Record<string,unknown>) {
  const item=resolveSessionExercise(items,payload);
  if(item.cardio)throw new TrainingError('מספר סטים אינו משתנה בפעילות אירובית.');
  const add=payload.action==='addSet';
  if(add && item.sets>=20)throw new TrainingError('אפשר לכלול עד 20 סטים לתרגיל.');
  if(!add && !removableSessionSet(item))throw new TrainingError('אפשר להסיר רק את הסט האחרון שעדיין לא תועד.',409);
  const count=item.sets+(add?1:-1);
  const targets=Array.from({length:count},(_,index)=>index<item.sets?targetRpeForSet(item,index):null);
  return items.map(i=>i===item?{...item,sets:count,targetRpes:targets,
    ...(item.setReps?{setReps:add?[...item.setReps,{min:item.reps,max:item.repsMax??item.reps}]:item.setReps.slice(0,count)}:{}),
    results:add?[...item.results,{done:false,amount:item.reps,weight:item.weight,actualRpe:null}]:item.results.slice(0,count),
  }:i);
}
