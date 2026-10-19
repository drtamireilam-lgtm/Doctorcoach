import {normalizeExerciseName} from './exercise-search.ts';
export type ImportMapping={source:string;exerciseId:string;version:number};
export function rememberedImportMapping(items:ImportMapping[],name:string){return items.find(i=>normalizeExerciseName(i.source)===normalizeExerciseName(name));}
