import {cardioActivity} from './cardio.ts';
import type {Exercise} from './content.ts';
import type {Unit,PlanItem} from './training.ts';
export type CustomExercise=Exercise&{unit:Unit;equipment:string;family:string;aliases:string[];videoUrl:string};
export type CustomExerciseRecord={exercise:CustomExercise;state:'private'|'pending'|'published';version:number;owned:boolean};
export type CustomCatalog={items:CustomExerciseRecord[];canCreate:boolean;canApprove:boolean};
export const customId=(id:string)=>/^custom-[0-9a-f-]{36}$/i.test(id);
export function customPrescription(e:CustomExercise):PlanItem{return {exerciseId:e.id,sets:2,reps:e.unit==='seconds'?25:10,unit:e.unit,weight:0,notes:'',workoutSection:e.kind==='מתיחה'?'stretch':'main',customExercise:e};}
export function planExerciseName(item:Pick<PlanItem,'exerciseId'|'customExercise'|'cardio'>,fallback?:string){return (item.cardio?cardioActivity(item.cardio.activityId)?.name:undefined)??item.customExercise?.name??fallback??item.exerciseId;}
// Definitions are resolved by the server; sending them back bloats large plans.
export function programItemsForWrite(items:PlanItem[]){return items.map(({customExercise,...item})=>item);}
