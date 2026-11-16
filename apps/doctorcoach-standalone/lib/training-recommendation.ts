import {nextSetLoad} from './set-load.ts';
import type {SessionExercise,TrainingSession} from './training.ts';
export type NextSetExplanation={status:'available'|'blocked';weight:number|null;rawWeight:number|null;deltaKg:number|null;deltaPercent:number|null;rawDeltaPercent:number|null;uncertainty:'heuristic'|'insufficient-data';reasons:string[];constraints:string[]};
/** Display metadata only. The model is a heuristic, and constraints are product rules. */
export function recommendationExplanation(item:SessionExercise,index:number,suggestion:ReturnType<typeof nextSetLoad>,sourceWeight?:number|null):NextSetExplanation {
 const previous=sourceWeight===undefined?item.results[index]?.weight:sourceWeight;
 const available=suggestion.weight!=null&&Number.isFinite(suggestion.weight)&&previous!=null&&Number.isFinite(previous)&&previous>0;
 const delta=available?suggestion.weight!-previous!:null;
 return {status:available?'available':'blocked',weight:suggestion.weight,rawWeight:suggestion.calculatedWeight,deltaKg:delta===null?null:Math.round(delta*10000)/10000,deltaPercent:delta===null?null:Math.round(delta/previous!*1000)/10,rawDeltaPercent:suggestion.relativePercent,uncertainty:available?'heuristic':'insufficient-data',reasons:[suggestion.text,...(suggestion.fatigueLimited?['שלושה אומדני ביצוע יורדים: העלאת עומס הוגבלה.']:[])],constraints:['external-total-load-only','reps-1-to-10','actual-rpe-6-to-10','pain-blocks','max-change-5-percent','equipment-rounding','coach-review']};
}
export function nextSetRecommendation(item:SessionExercise,index:number,session:Pick<TrainingSession,'before'|'after'>&Partial<Pick<TrainingSession,'items'>>,step=2.5):NextSetExplanation {
 return recommendationExplanation(item,index,nextSetLoad(item,index,session,step));
}
