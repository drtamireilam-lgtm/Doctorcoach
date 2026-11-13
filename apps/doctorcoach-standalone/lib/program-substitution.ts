import {defaultPrescription,type PlanItem} from './training.ts';
import type {Exercise} from './content.ts';
import {customId,type CustomExercise} from './custom-exercise-types.ts';

export function programExerciseUnit(exercise:Exercise){return (exercise as Partial<CustomExercise>).unit??defaultPrescription(exercise.id).unit;}
/** A draft substitution keeps the compatible dose, never an old exercise's starting load. */
export function substituteProgramExercise(item:PlanItem,exercise:Exercise):PlanItem{
 if(item.cardio||exercise.id.startsWith('cardio:')||programExerciseUnit(exercise)!==item.unit)throw new Error('בחרו תרגיל עם אותה יחידת מידה.');
 if(item.exerciseId===exercise.id)return item;
 return {...structuredClone(item),exerciseId:exercise.id,customExercise:customId(exercise.id)?structuredClone(exercise) as CustomExercise:undefined,weight:0,weightUnspecified:true,load:undefined,warmupSets:undefined,approvedSubstitutions:[],...(item.importSource?{importSource:{...structuredClone(item.importSource),matchingStatus:'MATCHED',matchedLibraryId:exercise.id}}:{})};
}
