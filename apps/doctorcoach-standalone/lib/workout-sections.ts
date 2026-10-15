import type {PlanItem} from './training.ts';
import {stretchExerciseIds} from './stretch-exercises.ts';
export type WorkoutSection='warmup'|'main'|'stretch';
export const workoutSections=[{value:'warmup',label:'חימום'},{value:'main',label:'תרגילי האימון'},{value:'stretch',label:'מתיחות'}] as const;
const stretches=new Set(['roman-chair-ql-lateral-stretch','cossack-squat-stretch',...stretchExerciseIds]);
export const isStretchExercise=(id:string)=>stretches.has(id);
export const defaultWorkoutSection=(id:string):WorkoutSection=>isStretchExercise(id)?'stretch':'main';
/** Legacy assignments remain main exercises until the coach deliberately changes them. */
export const workoutSection=(item:Pick<PlanItem,'workoutSection'>):WorkoutSection=>item.workoutSection??'main';
export function workoutGroups<T extends PlanItem>(items:T[]){return workoutSections.map(section=>({...section,items:items.filter(item=>workoutSection(item)===section.value)})).filter(group=>group.items.length>0);}
