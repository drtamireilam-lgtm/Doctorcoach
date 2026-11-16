import {exerciseAliases} from './rehab-exercises.ts';
import type {ExerciseMuscleLink} from './anatomy-exercise-profiles.ts';
import {muscleFor} from './anatomy-catalog.ts';
import {visibleStructureIds,type AnatomyModel,type AtlasStructure,type AtlasLayer} from './anatomy-models.ts';
import {exerciseAnatomyLinks,type AnatomyExerciseRole} from './anatomy-exercises.ts';
import {exercises} from './content.ts';
const exerciseFor=(id:string)=>exercises.find(e=>e.id===id);
import {defaultPrescription} from './training.ts';
export const anatomyRoleColors:Record<AnatomyExerciseRole,string>={primary:'#ffb84d',secondary:'#58b7ff',stabilizer:'#bc8cff',stretch:'#80dfbb'};
export function exerciseStructureRoles(model:AnatomyModel,exerciseId:string){
 const links=exerciseAnatomyLinks(exerciseId),result=new Map<string,AnatomyExerciseRole>();
 for(const structure of model.structures){if(structure.layer!=='muscle')continue;const link=links.find(l=>exerciseStructureMatches(structure,l));if(link)result.set(structure.id,link.role);}return result;
}
export function exerciseAtlasHash(id:string){const canonical=exerciseAliases[id]??id;return exerciseFor(canonical)?'#learn?atlas=detailed&exercise='+encodeURIComponent(canonical):null;}
export function programExercisePayload(id:string,dayId:string){if(!exerciseFor(id)||!/^\d{1,2}$/.test(dayId)||Number(dayId)<1||Number(dayId)>14)throw new Error('בחרו תרגיל ויום אימון תקינים.');return {...defaultPrescription(id),dayId,occurrenceId:crypto.randomUUID()};}

export function exerciseCoverage(model:AnatomyModel,id:string){const links=exerciseAnatomyLinks(id);const mapped=links.filter(l=>model.structures.some(s=>exerciseStructureMatches(s,l)));return {mapped,missing:links.filter(l=>!mapped.includes(l))};}

export function exerciseStructureMatches(structure:AtlasStructure,link:ExerciseMuscleLink){
 if(structure.layer!=='muscle'||link.slug!==(structure.learningId??structure.id))return false;
 if(!link.part)return true;
 const sourcePart={anterior:'clavicular',lateral:'acromial',posterior:'spinal'}[link.part];
 return link.slug==='deltoid'&&structure.id.includes('-'+sourcePart+'-part-of-');
}
export function exerciseMaterialRole(role:AnatomyExerciseRole|undefined,selected:boolean){return {selectedBase:!role&&selected,emissive:role?anatomyRoleColors[role]:selected?'#145d65':'#000000',intensity:role?(selected?.85:.65):selected?.8:1};}
export function exerciseMuscleName(link:ExerciseMuscleLink,language:'he'|'en'){
 if(link.slug==='deltoid'&&link.part)return ({anterior:{he:'כתף קדמית · דלתואיד קדמי',en:'Anterior deltoid'},lateral:{he:'כתף אמצעית · דלתואיד אמצעי',en:'Lateral deltoid'},posterior:{he:'כתף אחורית · דלתואיד אחורי',en:'Posterior deltoid'}})[link.part][language];
 const common:Record<string,{he:string;en:string}>={'pectoralis-major':{he:'חזה גדול',en:'Pectoralis major'},'triceps-brachii':{he:'יד אחורית · תלת־ראשי',en:'Triceps brachii'},'biceps-brachii':{he:'יד קדמית · דו־ראשי',en:'Biceps brachii'}};
 return common[link.slug]?.[language]??(language==='he'?muscleFor(link.slug)?.name:muscleFor(link.slug)?.en)??link.slug;
}

export function exerciseDisplayName(id:string,language:'he'|'en'){const e=exerciseFor(exerciseAliases[id]??id);return e?(language==='he'?e.name:e.en):(language==='he'?'תרגיל ללא מיפוי מוכר':'Exercise without a known mapping');}

export function exerciseVisibleRoleIds(model:AnatomyModel,roles:ReadonlyMap<string,AnatomyExerciseRole>,layers:ReadonlySet<AtlasLayer>,isolated:string|null,hidden:ReadonlySet<string>){return visibleStructureIds(model,layers,isolated,hidden).filter(id=>roles.has(id));}
