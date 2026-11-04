import {parseExerciseQualifiers} from './exercise-qualifiers.ts';
import {normalizeImportExerciseName} from './exercise-matching.ts';
export type ImportMapping={source:string;exerciseId:string;version:number};
export function rememberedImportMapping(items:ImportMapping[],name:string){const matches=items.filter(i=>normalizeImportExerciseName(i.source)===normalizeImportExerciseName(name));return new Set(matches.map(m=>m.exerciseId)).size===1?matches[0]:undefined;}

/** Reuse only the signed-in coach's loaded mapping. Never globalize an alias or change dosing. */
export function applyRememberedImportMappings(rows:import('./program-import.ts').ImportRow[],items:ImportMapping[],catalog:import('./content.ts').Exercise[]){
 return rows.map(row=>{
  const saved=rememberedImportMapping(items,row.originalName??row.name),target=saved&&catalog.find(e=>e.id===saved.exerciseId);if(!target)return row;
  const source=parseExerciseQualifiers(row.name+' '+(row.equipment??'')),destination=parseExerciseQualifiers(target.name+' '+target.en+' '+(target.equipment??''));
  if(source.conflict||destination.conflict)return row;
  for(const key of ['equipment','angle','grip','laterality','position','side','movement'] as const){const from=source[key],to=destination[key];if(from.length&&(key==='equipment'&&!to.length||to.length&&!from.some(value=>to.includes(value))))return row;}
  return {...row,exerciseId:target.id,matchStatus:'alias' as const,matchConfidence:1,matchConfirmed:true};
 });
}
