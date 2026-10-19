import {exerciseAliases} from './exercise-aliases.ts';
import {exerciseFamily} from './exercise-families.ts';
export type NamedExercise={id:string;name:string;en:string;aliases?:readonly string[];area?:string;group?:string;primary?:string;equipment?:string;family?:string};
export const normalizeExerciseName=(s:string)=>s.toLowerCase().replace(/[’'".,()‐‑–—_-]/g,' ').replace(/\s+/g,' ').trim();
export function exerciseNames(e:NamedExercise){return [e.name,e.en,e.id,...exerciseAliases[e.id]??[],...e.aliases??[]];}
export function exactExerciseNameMatches<T extends NamedExercise>(items:readonly T[],query:string):T[]{
 const key=normalizeExerciseName(query);return key?items.filter(e=>exerciseNames(e).some(n=>normalizeExerciseName(n)===key)):[];
}
export function matchesExerciseQuery(e:NamedExercise,query:string,extra=''){
 const terms=normalizeExerciseName(query).split(' ').filter(Boolean),text=normalizeExerciseName([...exerciseNames(e),e.area??'',e.group??'',e.primary??'',e.equipment??'',exerciseFamily(e),extra].join(' '));return terms.every(term=>text.includes(term));
}
export function searchExerciseNames<T extends NamedExercise>(items:readonly T[],query:string):T[]{
 return items.filter(e=>matchesExerciseQuery(e,query));
}
export function bilingualExerciseName(e:NamedExercise){return `${e.name} · ${e.en}`;}
