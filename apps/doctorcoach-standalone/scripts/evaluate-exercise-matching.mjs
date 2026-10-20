import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {matchExerciseForImport,normalizeImportExerciseName} from '../lib/exercise-matching.ts';
import {exerciseAliases} from '../lib/exercise-aliases.ts';
import {exercises} from '../lib/content.ts';

export function evaluateMatching(cases){
 const rows=cases.map(row=>({...row,...matchExerciseForImport(row.name)}));
 const accepted=rows.filter(r=>r.exerciseId),correct=accepted.filter(r=>r.exerciseId===r.expected),wrong=accepted.length-correct.length;
 const resolvable=rows.filter(r=>r.expected).length,review=rows.filter(r=>['suggested','ambiguous'].includes(r.status)).length,unmatched=rows.filter(r=>r.status==='unmatched').length;
 return {total:rows.length,resolvable,accepted:accepted.length,correct:correct.length,wrongMatches:wrong,precision:accepted.length?correct.length/accepted.length:null,automaticCoverage:resolvable?correct.length/resolvable:null,review,unmatched,abstained:rows.length-accepted.length,rows};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const fixture=JSON.parse(readFileSync(new URL('../tests/fixtures/matching-heldout.json',import.meta.url),'utf8'));
 const result=evaluateMatching(fixture.cases);
 const canonicalKeys=new Set(exercises.flatMap(e=>[e.name,e.en,e.id].map(normalizeImportExerciseName)));
 const uniqueAdditionalAliasKeys=new Set(Object.values(exerciseAliases).flat().map(normalizeImportExerciseName).filter(key=>!canonicalKeys.has(key)));
 console.log(JSON.stringify({provenance:fixture.provenance,aliasProvenance:'Legacy curated aliases plus manually reviewed literal paraphrases, transliterations and conventional gym abbreviations, bound to names and descriptions in lib/content.ts, gym-exercises.ts, rehab-exercises.ts and stretch-exercises.ts. No external terminology dataset or customer workbook used.',catalogCount:exercises.length,canonicalNameAndIdKeys:canonicalKeys.size,configuredAliasCount:Object.values(exerciseAliases).reduce((n,a)=>n+a.length,0),uniqueAdditionalAliasKeys:uniqueAdditionalAliasKeys.size,aliasCatalogIds:Object.keys(exerciseAliases).length,...result},null,2));
}
