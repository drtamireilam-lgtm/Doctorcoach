import type {AnatomyModel} from './anatomy-models.ts';
import {exerciseAnatomyLinks,type AnatomyExerciseRole} from './anatomy-exercises.ts';
import {exercises} from './content.ts';
const exerciseFor=(id:string)=>exercises.find(e=>e.id===id);
import {defaultPrescription} from './training.ts';
export const anatomyRoleColors:Record<AnatomyExerciseRole,string>={primary:'#ffb84d',secondary:'#58b7ff',stabilizer:'#bc8cff',stretch:'#80dfbb'};
export function exerciseStructureRoles(model:AnatomyModel,exerciseId:string){
 const links=exerciseAnatomyLinks(exerciseId),result=new Map<string,AnatomyExerciseRole>();
 for(const structure of model.structures){if(structure.layer!=='muscle')continue;const link=links.find(l=>l.slug===(structure.learningId??structure.id));if(link)result.set(structure.id,link.role);}return result;
}
export function exerciseAtlasHash(id:string){return exerciseFor(id)?'#learn?atlas=detailed&exercise='+encodeURIComponent(id):null;}
export function programExercisePayload(id:string,dayId:string){if(!exerciseFor(id)||!/^\d{1,2}$/.test(dayId)||Number(dayId)<1||Number(dayId)>14)throw new Error('בחרו תרגיל ויום אימון תקינים.');return {...defaultPrescription(id),dayId,occurrenceId:crypto.randomUUID()};}

export function exerciseCoverage(model:AnatomyModel,id:string){const links=exerciseAnatomyLinks(id);const mapped=links.filter(l=>model.structures.some(s=>s.layer==='muscle'&&(s.learningId??s.id)===l.slug));return {mapped,missing:links.filter(l=>!mapped.includes(l))};}
