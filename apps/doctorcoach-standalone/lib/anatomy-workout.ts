import {exerciseFor} from './anatomy-catalog.ts';
import type {PlanItem} from './training.ts';
import {workoutSection} from './workout-sections.ts';
import {exerciseAnatomyLinks} from './anatomy-exercises.ts';
import type {ExerciseMuscleLink} from './anatomy-exercise-profiles.ts';
export type WorkingMuscleRole='primary'|'secondary'|'stabilizer';
export type WorkoutContribution={index:number;exerciseId:string;dayId:string;sets:number;role:WorkingMuscleRole};
export type WorkoutMuscleRow=Pick<ExerciseMuscleLink,'slug'|'part'>&{key:string;counts:Record<WorkingMuscleRole,number>;contributions:WorkoutContribution[]};
export type WorkoutMapIssue={index:number;reason:'unmapped'|'invalid-sets'};
/** Planned working sets only. A set contributes independently to each authored muscle role. */
export function workoutMuscleSummary(items:readonly PlanItem[]){
 const muscles=new Map<string,WorkoutMuscleRow>(),unmapped:WorkoutMapIssue[]=[];let excluded=0;
 items.forEach((item,index)=>{
  const links=exerciseAnatomyLinks(item.exerciseId),working=links.filter((link):link is ExerciseMuscleLink&{role:WorkingMuscleRole}=>link.role!=='stretch');
  if(workoutSection(item)!=='main'||item.cardio||links.length>0&&!working.length){excluded++;return;}
  if(!Number.isSafeInteger(item.sets)||item.sets<=0||item.sets>20){unmapped.push({index,reason:'invalid-sets'});return;}
  if(!working.length){unmapped.push({index,reason:'unmapped'});return;}
  const seen=new Set<string>();for(const link of working){const key=link.slug+':'+(link.part??'');if(seen.has(key))continue;seen.add(key);let row=muscles.get(key);if(!row){row={slug:link.slug,...link.part?{part:link.part}:{},key,counts:{primary:0,secondary:0,stabilizer:0},contributions:[]};muscles.set(key,row);}row.counts[link.role]+=item.sets;row.contributions.push({index,exerciseId:item.exerciseId,dayId:item.dayId??'1',sets:item.sets,role:link.role});}
 });
 return {muscles:[...muscles.values()],unmapped,excluded};
}
/** Aggregate colour means this role exists in at least one included exercise, never intensity. */
export function workoutMuscleLinks(rows:readonly WorkoutMuscleRow[]):ExerciseMuscleLink[]{return rows.map(row=>({slug:row.slug,...row.part?{part:row.part}:{},role:row.counts.primary?'primary':row.counts.secondary?'secondary':'stabilizer'}));}

export function workoutPrescriptionName(item:PlanItem,language:'he'|'en'){
 if(item.customExercise)return language==='he'?item.customExercise.name:item.customExercise.en||item.customExercise.name;
 const exercise=exerciseFor(item.exerciseId);return exercise?(language==='he'?exercise.name:exercise.en):(language==='he'?'תרגיל לא מוכר':'Unknown exercise');
}
