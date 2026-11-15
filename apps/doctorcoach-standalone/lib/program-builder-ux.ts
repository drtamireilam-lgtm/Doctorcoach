import type {PlanItem} from './training.ts';
import type {WorkoutSection} from './workout-sections.ts';
type BatchResult={ok:true;items:PlanItem[]}|{ok:false;reason:'capacity'|'unknown'|'empty'};
/** Append one complete selection to an editable draft; never publish or partially add. */
export function appendProgramExerciseBatch(items:PlanItem[],ids:readonly string[],create:(id:string)=>PlanItem|null,dayId:string,section:WorkoutSection,createId:()=>string=()=>crypto.randomUUID()):BatchResult {
 if(!ids.length)return {ok:false,reason:'empty'};
 if(items.length+ids.length>30)return {ok:false,reason:'capacity'};
 const prescriptions=ids.map(create);
 if(prescriptions.some(item=>item===null))return {ok:false,reason:'unknown'};
 return {ok:true,items:[...items,...prescriptions.map(item=>({...structuredClone(item!),dayId,workoutSection:section,occurrenceId:createId()}))]};
}
