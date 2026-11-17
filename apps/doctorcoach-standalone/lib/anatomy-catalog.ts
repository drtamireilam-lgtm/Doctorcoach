import raw from './prepared/muscles.json' with {type:'json'};
import extra from './prepared/additional-muscles.json' with {type:'json'};
import {exercises} from './content.ts';
import {exerciseAliases} from './rehab-exercises.ts';
export type Muscle={slug:string;name:string;en:string;action:string;source:string};
const catalog=new Map<string,Muscle>();
for(const item of raw){const m=item as Record<string,unknown>;catalog.set(item.slug,{slug:item.slug,name:item.name_he,en:item.name_en,action:String(m.primary_function_he??m.role_he??''),source:String(m.source_page_url??m.commons_image_search_url??'')});}
for(const item of extra){const existing=catalog.get(item.muscle_id);if(existing){if(!existing.action)existing.action=item.primary_function_he;}else catalog.set(item.muscle_id,{slug:item.muscle_id,name:item.name_he,en:item.name_en,action:item.primary_function_he,source:item.wikimedia_search});}
export const muscles=[...catalog.values()];
export const muscleFor=(id:string)=>catalog.get(id);
export const exerciseFor=(id:string)=>exercises.find(e=>e.id===(exerciseAliases[id]??id));
