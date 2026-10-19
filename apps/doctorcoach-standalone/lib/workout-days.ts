import {TrainingError,exerciseOccurrenceKey, type PlanItem} from './training.ts';

// Stable slots in a coach-assigned program, not calendar dates or weekdays.
export const workoutDays=Array.from({length:7},(_,i)=>({value:String(i+1),label:`יום אימון ${i+1}`}));
export const workoutDayId=(item:PlanItem)=>item.dayId??'1';
export const workoutDayLabel=(id:string)=>workoutDays.find(d=>d.value===id)?.label??'יום אימון';
export const planItemKey=(item:PlanItem)=>exerciseOccurrenceKey(item);
export function assignedDays(items:PlanItem[]):string[]{return [...new Set(items.map(workoutDayId))].sort();}
export function selectWorkoutDay(items:PlanItem[],requested:unknown):PlanItem[]{
 const days=assignedDays(items);
 if(requested!==undefined&&(typeof requested!=='string'||!days.includes(requested)))throw new TrainingError('יום האימון אינו קיים בתוכנית שהוקצתה.');
 if(requested===undefined&&days.length>1)throw new TrainingError('בחרו יום אימון מתוך התוכנית שהמאמן הקצה.');
 const day=requested??days[0];
 return items.filter(item=>workoutDayId(item)===day);
}
