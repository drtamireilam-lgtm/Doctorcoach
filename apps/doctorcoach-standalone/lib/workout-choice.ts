import {assignedDays,workoutDayId} from './workout-days.ts';
import type {PlanItem,TrainingSession} from './training.ts';
export type WorkoutChoiceMode='fixed'|'flexible';
export type WorkoutPreference={mode:WorkoutChoiceMode;version:number};
// Only completed sessions from this exact assignment advance the fixed sequence.
export function nextAssignedWorkout(items:PlanItem[],history:TrainingSession[],programId:string|null):string|undefined {
 const days=assignedDays(items);
 if(!days.length)return undefined;
 const last=[...history].filter(s=>s.status==='completed'&&s.planMode==='coached'&&s.programId===programId&&s.items.length)
  .sort((a,b)=>(b.finishedAt??b.startedAt).localeCompare(a.finishedAt??a.startedAt)||b.id.localeCompare(a.id))[0];
 const index=last?days.indexOf(workoutDayId(last.items[0])):-1;
 return days[(index+1)%days.length];
}
export function startWorkoutChoice(mode:WorkoutChoiceMode,days:string[],fixedDay:string|undefined,chosen:string|undefined){
 return mode==='fixed'?(fixedDay&&days.includes(fixedDay)?fixedDay:days[0]):chosen&&days.includes(chosen)?chosen:undefined;
}
