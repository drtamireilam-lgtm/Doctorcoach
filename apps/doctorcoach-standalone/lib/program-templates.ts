import type {PlanItem} from './training.ts';
import {isRecord,TrainingError} from './training.ts';
import {parseAssignedItems} from './care.ts';
import {programItemsForWrite,type CustomExercise} from './custom-exercise-types.ts';
import {programReviewDays} from './program-review.ts';
export type ProgramTemplate={id:string;title:string;itemCount:number;dayCount:number;version:number;updatedAt:string};
export type TemplateDraft={title:string;items:PlanItem[];revisionOf:string|null};
/** Whitelist prescriptions only. No source title, names, notes, results or cached custom definitions. */
export function templateItems(input:unknown,customs:CustomExercise[]=[],keepWeights=false):PlanItem[]{
 if(!Array.isArray(input))throw new TrainingError('רשימת התרגילים אינה תקינה.');
 const clean=input.map(raw=>{if(!isRecord(raw))throw new TrainingError('פרטי התרגיל אינם תקינים.');return {load:keepWeights?raw.load:null,warmupSets:Array.isArray(raw.warmupSets)?raw.warmupSets.map(set=>isRecord(set)?{amount:set.amount,weight:keepWeights?set.weight:0}:set):raw.warmupSets,side:raw.side,occurrenceId:raw.occurrenceId,exerciseId:raw.exerciseId,sets:raw.sets,reps:raw.reps,repsMax:raw.repsMax,unit:raw.unit,weight:keepWeights?raw.weight:0,weightUnspecified:keepWeights?raw.weightUnspecified:true,notes:'',tempo:raw.tempo,targetRpe:raw.targetRpe,targetRpes:raw.targetRpes,effortScale:raw.effortScale,approvedSubstitutions:raw.approvedSubstitutions,dayId:raw.dayId,workoutSection:raw.workoutSection};});
 return programItemsForWrite(parseAssignedItems(clean,customs));
}
export function templateSummary(row:{id:string;title:string;items_json:string;version:number;updated_at:string}):ProgramTemplate{const items=JSON.parse(row.items_json) as PlanItem[];return {id:row.id,title:row.title,itemCount:items.length,dayCount:programReviewDays(items).length,version:row.version,updatedAt:row.updated_at};}
