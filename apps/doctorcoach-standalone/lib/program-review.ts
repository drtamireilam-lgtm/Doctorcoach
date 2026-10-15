import {parseAssignedItems,textField} from './care.ts';
import {assignedDays,workoutDayId} from './workout-days.ts';
import type {PlanItem} from './training.ts';

/** Match server normalization and validate every day, including hidden editor days. */
export function prepareProgramReview(title:unknown,items:unknown,customs:import('./custom-exercise-types.ts').CustomExercise[]=[]){
 return {title:textField(title,'שם תוכנית',100,3),items:parseAssignedItems(items,customs).map(item=>({...item,...(item.tempo?{tempo:{...item.tempo}}:{}),...(item.approvedSubstitutions?{approvedSubstitutions:[...item.approvedSubstitutions]}:{})}))};
}
export function programReviewDays(items:PlanItem[]){
 return assignedDays(items).map(id=>{
  const dayItems=items.filter(item=>workoutDayId(item)===id);
  return {id,items:dayItems,sets:dayItems.reduce((sum,item)=>sum+item.sets,0)};
 });
}
