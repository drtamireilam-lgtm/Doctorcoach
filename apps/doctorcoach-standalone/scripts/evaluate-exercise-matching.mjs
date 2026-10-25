import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {matchExerciseForImport,normalizeImportExerciseName} from '../lib/exercise-matching.ts';
import {exerciseAliases} from '../lib/exercise-aliases.ts';
import {exercises} from '../lib/content.ts';

export function evaluateMatching(cases){
 const rows=cases.map(row=>({name:row.name,expected:row.expected,...matchExerciseForImport(row.name)}));
 const accepted=rows.filter(r=>r.exerciseId),correct=accepted.filter(r=>r.exerciseId===r.expected),wrong=accepted.length-correct.length;
 const resolvable=rows.filter(r=>r.expected).length,review=rows.filter(r=>['suggested','ambiguous'].includes(r.status)).length,unmatched=rows.filter(r=>r.status==='unmatched').length;
 return {total:rows.length,resolvable,accepted:accepted.length,correct:correct.length,wrongMatches:wrong,precision:accepted.length?correct.length/accepted.length:null,automaticCoverage:resolvable?correct.length/resolvable:null,review,unmatched,abstained:rows.length-accepted.length,rows};
}
/** Diagnostic only: never rewrites canonical IDs or resolves collisions. */
export function auditMatchingCatalog(catalog=exercises,aliases=exerciseAliases){
 const ids=new Set(),duplicateIds=new Set(),keys=new Map();
 for(const item of catalog){
  if(ids.has(item.id))duplicateIds.add(item.id);ids.add(item.id);
  for(const name of [item.id,item.name,item.en,...aliases[item.id]??[],...item.aliases??[]]){
   const key=normalizeImportExerciseName(name);if(!key)continue;
   if(!keys.has(key))keys.set(key,new Set());keys.get(key).add(item.id);
  }
 }
 return {duplicateIds:[...duplicateIds].sort(),orphanAliasIds:Object.keys(aliases).filter(id=>!ids.has(id)),collisions:[...keys].filter(([,set])=>set.size>1).map(([key,set])=>({key,ids:[...set].sort()})).sort((a,b)=>a.key.localeCompare(b.key))};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 // Optional caller-supplied corpus must contain exercise names only, with manual expected IDs.
 const fixture=JSON.parse(readFileSync(process.argv[2]??new URL('../tests/fixtures/matching-heldout.json',import.meta.url),'utf8'));
 if(!Array.isArray(fixture.cases)||fixture.cases.some(r=>!r||typeof r.name!=='string'||r.expected!==null&&typeof r.expected!=='string'))throw Error('Expected a names-only corpus with cases: [{name, expected}]');
 const result=evaluateMatching(fixture.cases);
 const canonicalKeys=new Set(exercises.flatMap(e=>[e.name,e.en,e.id].map(normalizeImportExerciseName)));
 const uniqueAdditionalAliasKeys=new Set(Object.values(exerciseAliases).flat().map(normalizeImportExerciseName).filter(key=>!canonicalKeys.has(key)));
 console.log(JSON.stringify({provenance:fixture.provenance,aliasProvenance:'Legacy curated aliases plus manually reviewed literal paraphrases, transliterations and conventional gym abbreviations, bound to names and descriptions in lib/content.ts, gym-exercises.ts, rehab-exercises.ts and stretch-exercises.ts. Three observed names from authorized workbooks were checked against canonical entries; other additions are literal catalog paraphrases. No external terminology dataset or holdout-derived tuning.',catalogAudit:auditMatchingCatalog(),catalogCount:exercises.length,canonicalNameAndIdKeys:canonicalKeys.size,configuredAliasCount:Object.values(exerciseAliases).reduce((n,a)=>n+a.length,0),uniqueAdditionalAliasKeys:uniqueAdditionalAliasKeys.size,aliasCatalogIds:Object.keys(exerciseAliases).length,...result},null,2));
}
