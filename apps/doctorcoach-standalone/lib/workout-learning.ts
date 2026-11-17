import {exerciseFor,muscleFor} from './anatomy-catalog.ts';
import {learningCard} from './anatomy-learning.ts';
export type WorkoutLearningTarget={kind:'muscle';slug:string}|{kind:'exercise';id:string;fromMuscle?:string};
/** Resolve curated local content only; never navigate a supplied URL or infer custom exercise anatomy. */
export function workoutLearningTarget(kind:'muscle'|'exercise',id:string,fromMuscle?:string):WorkoutLearningTarget|null{
 if(kind==='muscle')return muscleFor(id)&&learningCard(id)?{kind,slug:id}:null;
 const exercise=exerciseFor(id);return exercise?{kind,id:exercise.id,...fromMuscle&&muscleFor(fromMuscle)&&learningCard(fromMuscle)?{fromMuscle}:{}}:null;
}
