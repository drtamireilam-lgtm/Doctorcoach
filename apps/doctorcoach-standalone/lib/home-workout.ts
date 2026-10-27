import {assignedDays,workoutDayId} from './workout-days.ts';
import {nextAssignedWorkout,type WorkoutChoiceMode} from './workout-choice.ts';
import type {PlanItem,TrainingSession} from './training.ts';

// Never choose a flexible/self-training day on the trainee's behalf.
export function homeWorkoutPreview(plan:PlanItem[],history:TrainingSession[],mode:'self'|'coached',choice:WorkoutChoiceMode,programId:string|null){
 const days=assignedDays(plan);
 const day=days.length===1?days[0]:mode==='coached'&&choice==='fixed'?nextAssignedWorkout(plan,history,programId):undefined;
 const items=day?plan.filter(item=>workoutDayId(item)===day):[];
 return {day,days:days.length,exercises:items.length,sets:items.reduce((sum,item)=>sum+(item.cardio?0:item.sets),0)};
}
