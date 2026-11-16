import {exerciseAliases} from './rehab-exercises.ts';
import {learningCards,exerciseMuscles} from './anatomy-learning.ts';
import {stretchingTargets,stretchesForMuscle} from './stretch-anatomy-targets.ts';
export type AnatomyExerciseRole='primary'|'secondary'|'stabilizer'|'stretch';
/** Reuse the reviewed catalog relationships; never infer muscle roles from names. */
export function muscleExerciseLinks(slug:string):{id:string;role:AnatomyExerciseRole}[]{
 const active=learningCards.find(card=>card.slug===slug)?.links??[];
 return [...active,...stretchesForMuscle(slug).filter(id=>!active.some(link=>link.id===id)).map(id=>({id,role:'stretch' as const}))];
}
export function exerciseAnatomyLinks(id:string):{slug:string;role:AnatomyExerciseRole}[]{
 const canonicalId=exerciseAliases[id]??id;
 const active=exerciseMuscles(canonicalId);
 return [...active,...stretchingTargets(canonicalId).filter(slug=>!active.some(link=>link.slug===slug)).map(slug=>({slug,role:'stretch' as const}))];
}
