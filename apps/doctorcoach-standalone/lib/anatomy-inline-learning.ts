import {modelForRegion,modelRegionForMuscle} from './anatomy-models.ts';
import {muscleRegionId} from './anatomy-navigation.ts';
import {anatomyMatches,learningCard} from './anatomy-learning.ts';
import {muscleExerciseLinks} from './anatomy-exercises.ts';
import {muscleFor,exerciseFor} from './anatomy-catalog.ts';
export function matchesAnatomyLearningStructure(s:{id:string;he:string;en:string;learningId?:string},query:string){
 if(anatomyMatches({name:s.he,en:s.en,slug:s.id},query))return true;
 const name=muscleFor(s.learningId??s.id);
 return anatomyMatches(name??{name:'',en:'',slug:s.learningId??''},query);
}
export function inlineLearningFor(slug:string){
 const card=learningCard(slug);
 const links=card?muscleExerciseLinks(slug).flatMap(link=>{const exercise=exerciseFor(link.id);return exercise?[{...link,exercise}]:[];}):[];
 return {card,strength:links.filter(l=>l.role!=='stretch'),stretch:links.filter(l=>l.role==='stretch')};
}

/** Saved source geometry takes precedence over catalog membership on return. */
export function learningRegionForMuscle(id:string,preferred:string,regions:{id:string;muscleSlugs:string[]}[],enabled:boolean,preserveSource=true){
 const source=enabled&&preserveSource&&modelForRegion(preferred)?.structures.some(s=>s.id===id);
 return modelRegionForMuscle(id,source?preferred:muscleRegionId(id,preferred,regions)??preferred,enabled);
}
