import raw from './prepared/muscles.json';
import extra from './prepared/additional-muscles.json';
import regionSeed from './prepared/regions.json';
import injurySeed from './prepared/injuries.json';
import matrix from './prepared/injury-matrix.json';
import movements from './prepared/movements.json';
import {exercises} from './content';
import {exerciseAliases} from './rehab-exercises';
export type Muscle={slug:string;name:string;en:string;action:string;source:string};
const slug=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const catalog=new Map<string,Muscle>();
for(const item of raw){const m=item as Record<string,unknown>;catalog.set(item.slug,{slug:item.slug,name:item.name_he,en:item.name_en,action:String(m.primary_function_he??m.role_he??''),source:String(m.source_page_url??m.commons_image_search_url??'')});}
for(const item of extra){const existing=catalog.get(item.muscle_id);if(existing){if(!existing.action)existing.action=item.primary_function_he;}else catalog.set(item.muscle_id,{slug:item.muscle_id,name:item.name_he,en:item.name_en,action:item.primary_function_he,source:item.wikimedia_search});}
export const muscles=[...catalog.values()];
export const regions=regionSeed.map(r=>({id:r.id,label:r.label_he,muscles:r.muscles}));
for(const m of extra){let r=regions.find(r=>r.id===m.region_id);if(!r){r={id:m.region_id,label:m.region_he,muscles:[]};regions.push(r);}if(!r.muscles.includes(m.name_en))r.muscles.push(m.name_en);}
regions.push({id:'groin',label:'אגן / מפשעה',muscles:['Adductor Longus','Adductor Brevis','Adductor Magnus','Gracilis','Pectineus','Iliopsoas']});
const aliases:Record<string,string[]>={'Biceps Long Head':['Biceps Brachii'],'Triceps Long Head':['Triceps Brachii'],'Quadriceps Group':['Rectus Femoris','Vastus Lateralis','Vastus Medialis','Vastus Intermedius'],'Hamstrings Group':['Biceps Femoris Long Head','Biceps Femoris Short Head','Semitendinosus','Semimembranosus']};
export function regionMuscles(id:string){const region=regions.find(r=>r.id===id);const names=(region?.muscles??[]).flatMap(n=>id==='ankle_foot'&&['Dorsal Interossei','Plantar Interossei'].includes(n)?[n+' of Foot']:aliases[n]??[n]);return muscles.filter(m=>names.includes(m.en)||names.some(n=>slug(n)===m.slug));}
export const exerciseFor=(id:string)=>exercises.find(e=>e.id===(exerciseAliases[id]??id));
export function muscleMovements(m:Muscle){const key=m.en.toLowerCase();return movements.filter(v=>v.primary_muscles.some(p=>p.toLowerCase()===key||p.toLowerCase().startsWith(key+' (')||key.includes(p.toLowerCase())));}
const regionAliases:Record<string,string[]>={lower_back_spine:['lumbar','lumbar/hip'],hip_glute:['hip','groin','hamstring'],thigh:['hip','groin','hamstring'],ankle_foot:['ankle','foot'],lower_leg:['calf','lower_leg'],cervical_neck:['cervical'],upper_back_scapula:['upper_back','thoracic'],core_abdomen:['core'],wrist_hand:['hand','forearm']};
export function injuryMappings(regionId:string,muscle?:string){return matrix.filter(m=>muscle?m.muscles.includes(muscle):m.region===regionId||(regionAliases[regionId]??[]).includes(m.region));}
export const injuryTopics=(regionId:string)=>injurySeed.filter(i=>i.region_id===regionId);
export const anatomicalSources=[{title:'AAOS · הכתף',url:'https://www.orthoinfo.org/recovery/rotator-cuff-and-shoulder-conditioning-program/'},{title:'AAOS · עמוד השדרה',url:'https://www.orthoinfo.org/recovery/spine-conditioning-program/'},{title:'AAOS · ירך',url:'https://www.orthoinfo.org/recovery/hip-conditioning-program/'}];
