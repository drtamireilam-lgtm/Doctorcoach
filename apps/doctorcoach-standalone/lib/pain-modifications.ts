import {painStructures,painModelVersion,type AnatomyPainBundle,type AnatomyPainRecord} from './anatomy-pain.ts';
import {exerciseAnatomyLinks,type AnatomyExerciseRole} from './anatomy-exercises.ts';
import {exerciseStructureMatches} from './anatomy-training.ts';
import type {AtlasStructure} from './anatomy-models.ts';
import {exerciseFamily} from './exercise-families.ts';
import {exercises,type Exercise} from './content.ts';
import type {PlanItem} from './training.ts';
export type PainRestrictions={known:boolean;approvedOnly?:boolean;blockedExerciseIds?:readonly string[];blockedFamilies?:readonly string[];blockedMuscleSlugs?:readonly string[];availableEquipment?:readonly string[];hold?:boolean};
export type PainAffectedExercise={exerciseId:string;occurrenceId?:string;role:AnatomyExerciseRole|'uncertain';reportedExercise:boolean;alternatives:{exerciseId:string;sharedMuscles:string[];sameEquipment:boolean;coachApproved:boolean}[]};
export type PainModificationRow={report:AnatomyPainRecord;affected:PainAffectedExercise[]};
/** Informational matching only. No safety ranking, prescription or plan mutation. */
export function buildPainModificationReview({ownerId,bundle,items,catalog,restrictions}:{ownerId:string;bundle:AnatomyPainBundle;items:readonly Pick<PlanItem,'exerciseId'|'occurrenceId'|'approvedSubstitutions'|'side'>[];catalog:readonly Exercise[];restrictions:PainRestrictions}):PainModificationRow[]{
 if(bundle.ownerId!==ownerId)throw new Error('Pain report owner mismatch');
 const byId=new Map(catalog.map(e=>[e.id,e]));
 const blocked=(e:Exercise)=>restrictions.hold||restrictions.blockedExerciseIds?.includes(e.id)||restrictions.blockedFamilies?.includes(exerciseFamily(e))||exerciseAnatomyLinks(e.id).some(l=>restrictions.blockedMuscleSlugs?.includes(l.slug));
 return bundle.records.map(report=>{const structure=report.data.modelVersion===painModelVersion?painStructures.find(s=>s.id===report.data.structureId&&s.side===report.data.side):undefined;
 const affected=items.flatMap(item=>{const links=exerciseAnatomyLinks(item.exerciseId),link=structure?links.find(l=>exerciseStructureMatches(structure as AtlasStructure,l)):undefined;
 const reportedExercise=report.data.exerciseId===item.exerciseId&&(!report.data.occurrenceId||report.data.occurrenceId===item.occurrenceId);
 const uncertain=!structure||structure.layer!=='muscle'||!links.length;
 if(!link&&!reportedExercise&&!uncertain)return [];
 const role:PainAffectedExercise['role']=link?.role??'uncertain';const source=byId.get(item.exerciseId),family=source?exerciseFamily(source):'';
 const alternatives=restrictions.known&&!restrictions.hold&&source&&family&&role!=='uncertain'?catalog.filter(e=>e.id!==source.id&&(!restrictions.approvedOnly||item.approvedSubstitutions?.includes(e.id))&&exerciseFamily(e)===family&&!blocked(e)&&!!e.equipment&&(restrictions.availableEquipment?.includes(e.equipment)||e.equipment===source.equipment)).map(e=>({exerciseId:e.id,sharedMuscles:exerciseAnatomyLinks(e.id).filter(l=>links.some(s=>s.slug===l.slug)).map(l=>l.slug),sameEquipment:!!source.equipment&&source.equipment===e.equipment,coachApproved:!!item.approvedSubstitutions?.includes(e.id)})).filter(e=>e.sharedMuscles.length).sort((a,b)=>Number(b.coachApproved)-Number(a.coachApproved)||Number(b.sameEquipment)-Number(a.sameEquipment)||a.exerciseId.localeCompare(b.exerciseId)):[];
 return [{exerciseId:item.exerciseId,occurrenceId:item.occurrenceId,role,reportedExercise,alternatives}];});return {report,affected};});
}


export type PainShareIdentity={ownerId:string;reportId:string;coachEmail:string;exerciseId:string;occurrenceId?:string;candidateExerciseId?:string;notes:string};
/** Keep this cache in an owner-keyed component ref; failed responses retain the ID. */
export function painModificationRequestId(cache:Map<string,string>,request:PainShareIdentity,makeId:()=>string=()=>crypto.randomUUID()){
 const fingerprint=JSON.stringify([request.ownerId,request.reportId,request.coachEmail,request.exerciseId,request.occurrenceId??'',request.candidateExerciseId??'',request.notes]);
 const existing=cache.get(fingerprint);if(existing)return existing;const id=makeId();cache.set(fingerprint,id);return id;
}
/** The review API currently accepts built-in IDs; a private custom ID needs coach messaging. */
export function painModificationShareSupported(id:string,catalog:readonly Pick<Exercise,'id'>[]){return catalog.some(e=>e.id===id)&&exercises.some(e=>e.id===id);}
