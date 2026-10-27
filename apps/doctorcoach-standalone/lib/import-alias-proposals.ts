import {exercises} from './content.ts';
import {matchExerciseForImport,normalizeImportExerciseName} from './exercise-matching.ts';
import {parseExerciseQualifiers} from './exercise-qualifiers.ts';

export type ImportAliasProposal={source:string;exerciseId:string;state:'needs_review';flags:string[];currentCandidates:string[]};
/** Export from persisted personal coach corrections. This is a proposal payload,
 * never an approved dictionary or a write to shared exercise data. Only the
 * source name and builtin target ID survive; no account/prescription fields. */
export function proposeImportAliases(values:readonly unknown[]){
 const builtinIds=new Set(exercises.map(e=>e.id));
 const proposals:ImportAliasProposal[]=[],seen=new Set<string>();
 for(const value of values.slice(0,250)){
  if(!value||typeof value!=='object')continue;
  const record=value as Record<string,unknown>;
  if(typeof record.source!=='string'||typeof record.exerciseId!=='string')continue;
  const source=record.source.trim(),exerciseId=record.exerciseId;
  if(!source||source.length>100||/[\u0000-\u001f\u007f]/u.test(record.source)||!builtinIds.has(exerciseId))continue;
  const key=normalizeImportExerciseName(source);if(!key)continue;
  const pair=JSON.stringify([key,exerciseId]);if(seen.has(pair))continue;seen.add(pair);
  // This queue needs literal collision evidence, not fuzzy ranking. Avoid the
  // expensive suggestion scan across the entire dictionary for every export.
  const match=matchExerciseForImport(source,exercises,{allowGeneralMovement:true,suggestions:false});
  if(match.exerciseId===exerciseId)continue;
  const flags=['unverified_name'];
  if(parseExerciseQualifiers(source).conflict)flags.push('conflicting_qualifiers');
  if(match.exerciseId&&match.exerciseId!==exerciseId)flags.push('existing_other_match');
  if(match.status==='ambiguous')flags.push('ambiguous_name');
  proposals.push({source,exerciseId,state:'needs_review',flags,currentCandidates:match.candidates.map(c=>c.exerciseId)});
 }
 const signature=(source:string)=>normalizeImportExerciseName(source).split(' ').sort().join(' ');
 const targets=new Map<string,Set<string>>();
 for(const p of proposals){const key=signature(p.source),ids=targets.get(key)??new Set();ids.add(p.exerciseId);targets.set(key,ids);}
 for(const p of proposals)if((targets.get(signature(p.source))?.size??0)>1)p.flags.push('conflicting_proposals');
 return {schemaVersion:1 as const,mode:'proposals_only' as const,proposals,omitted:values.length-proposals.length};
}
