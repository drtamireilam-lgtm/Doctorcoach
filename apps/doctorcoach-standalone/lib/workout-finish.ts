import {hasTotalLoad} from './load-units.ts';
import {TrainingError,type TrainingSession,type SessionExercise} from './training.ts';
import {setEstimated1RM} from './set-load.ts';
import {workoutDayId} from './workout-days.ts';
import {workoutSection} from './workout-sections.ts';
export type FinishFeedback={effort:number|null;note:string};
export function finishFeedback(value:unknown):FinishFeedback|null{
 if(value==null)return null;
 if(typeof value!=='object'||Array.isArray(value))throw new TrainingError('סיכום האימון אינו תקין.');
 const {effort=null,note=''}=value as Record<string,unknown>;
 if(effort!==null&&(typeof effort!=='number'||!Number.isFinite(effort)||effort<1||effort>10||!Number.isInteger(effort*2)))throw new TrainingError('המאמץ הכללי צריך להיות בין 1 ל־10.');
 if(typeof note!=='string'||note.length>500)throw new TrainingError('ההערה מוגבלת ל־500 תווים.');
 return {effort,note:note.trim()};
}
function metrics(item:SessionExercise){
 const sets=item.results.filter(s=>s.done);
 if(!hasTotalLoad(item))return {weight:null,reps:item.unit==='reps'&&sets.length?Math.max(...sets.map(s=>s.amount)):null,estimate:null};
 const estimates=sets.map(s=>setEstimated1RM(s,item.unit)).filter((n):n is number=>n!==null);
 return {weight:sets.length?Math.max(...sets.map(s=>s.weight)):null,reps:item.unit==='reps'&&sets.length?Math.max(...sets.map(s=>s.amount)):null,estimate:estimates.length?Math.max(...estimates):null};
}
export function workoutFinishSummary(session:TrainingSession,history:TrainingSession[]){
 const completed=session.items.filter(i=>i.results.some(s=>s.done));
 const previous=[...history].filter(s=>s.id!==session.id&&s.status==='completed'&&s.planMode===session.planMode&&s.programId===session.programId&&s.finishedAt&&s.finishedAt<=session.startedAt).sort((a,b)=>b.finishedAt!.localeCompare(a.finishedAt!));
 const comparisons=completed.filter(item=>workoutSection(item)==='main').map(item=>{
  const match=previous.map(s=>({session:s,item:s.items.find(i=>i.exerciseId===item.exerciseId&&(i.occurrenceId??`${i.dayId??'1'}:${i.exerciseId}`)===(item.occurrenceId??`${item.dayId??'1'}:${item.exerciseId}`)&&i.unit===item.unit&&workoutDayId(i)===workoutDayId(item)&&workoutSection(i)==='main'&&i.results.some(r=>r.done))})).find(m=>m.item);
  const current=metrics(item),prior=match?.item?metrics(match.item):null;
  return {name:item.name,current,prior,previousAt:match?.session.finishedAt??null};
 });
 return {exercises:completed.length,sets:session.items.reduce((sum,i)=>sum+i.results.filter(s=>s.done).length,0),comparisons};
}
