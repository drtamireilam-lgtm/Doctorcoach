import {modelForRegion,modelRegionForMuscle} from './anatomy-models.ts';
import {muscleRegionId} from './anatomy-navigation.ts';
import sourceMuscles from './prepared/muscles.json' with {type:'json'};
import additionalMuscles from './prepared/additional-muscles.json' with {type:'json'};
import {anatomyMatches,learningCard} from './anatomy-learning.ts';
import {muscleExerciseLinks} from './anatomy-exercises.ts';
import {exercises} from './content.ts';
import {exerciseAliases} from './rehab-exercises.ts';
const names=new Map(sourceMuscles.map(m=>[m.slug,{slug:m.slug,name:m.name_he,en:m.name_en}]));
for(const m of additionalMuscles)if(!names.has(m.muscle_id))names.set(m.muscle_id,{slug:m.muscle_id,name:m.name_he,en:m.name_en});
const catalog=new Map(exercises.map(e=>[e.id,e]));
export function matchesAnatomyLearningStructure(s:{id:string;he:string;en:string;learningId?:string},query:string){
 if(anatomyMatches({name:s.he,en:s.en,slug:s.id},query))return true;
 const name=names.get(s.learningId??s.id);
 return anatomyMatches(name??{name:'',en:'',slug:s.learningId??''},query);
}
export function inlineLearningFor(slug:string){
 const card=learningCard(slug);
 const links=card?muscleExerciseLinks(slug).flatMap(link=>{const exercise=catalog.get(exerciseAliases[link.id]??link.id);return exercise?[{...link,exercise}]:[];}):[];
 return {card,strength:links.filter(l=>l.role!=='stretch'),stretch:links.filter(l=>l.role==='stretch')};
}

/** Saved source geometry takes precedence over catalog membership on return. */
export function learningRegionForMuscle(id:string,preferred:string,regions:{id:string;muscleSlugs:string[]}[],enabled:boolean){
 const source=enabled&&modelForRegion(preferred)?.structures.some(s=>s.id===id);
 return modelRegionForMuscle(id,source?preferred:muscleRegionId(id,preferred,regions)??preferred,enabled);
}
