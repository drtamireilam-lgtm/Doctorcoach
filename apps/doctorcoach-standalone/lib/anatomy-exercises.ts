import {exerciseRoleProfile,exerciseRoleProfileIds,type ExerciseMuscleLink} from './anatomy-exercise-profiles.ts';
import {exerciseAliases} from './rehab-exercises.ts';
import {learningCards,exerciseMuscles} from './anatomy-learning.ts';
import {stretchingTargets,stretchesForMuscle} from './stretch-anatomy-targets.ts';
export type AnatomyExerciseRole='primary'|'secondary'|'stabilizer'|'stretch';
/** Reuse the reviewed catalog relationships; never infer muscle roles from names. */
export function muscleExerciseLinks(slug:string):{id:string;role:AnatomyExerciseRole}[]{
 const activeMap=new Map((learningCards.find(card=>card.slug===slug)?.links??[]).map(link=>[link.id,{...link}]));
 for(const id of exerciseRoleProfileIds){
  const link=exerciseRoleProfile(id)?.find(link=>link.slug===slug);
  if(link&&link.role!=='stretch')activeMap.set(id,{id,role:link.role});
  else activeMap.delete(id);
 }
 const active=[...activeMap.values()];
 return [...active,...stretchesForMuscle(slug).filter(id=>!active.some(link=>link.id===id)).map(id=>({id,role:'stretch' as const}))];
}
export function exerciseAnatomyLinks(id:string):ExerciseMuscleLink[]{
 const canonicalId=exerciseAliases[id]??id;
 const active=exerciseRoleProfile(canonicalId)??exerciseMuscles(canonicalId);
 return [...active,...stretchingTargets(canonicalId).filter(slug=>!active.some(link=>link.slug===slug)).map(slug=>({slug,role:'stretch' as const}))];
}
