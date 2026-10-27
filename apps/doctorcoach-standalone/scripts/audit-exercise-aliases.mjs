import {writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {exercises} from '../lib/content.ts';
import {exerciseAliases} from '../lib/exercise-aliases.ts';
import {normalizeImportExerciseName as normalize,matchExerciseForImport} from '../lib/exercise-matching.ts';

const tokenSignature=s=>s.split(' ').sort().join(' ');
export function auditExerciseAliases(catalog=exercises,dictionary=exerciseAliases){
 const index=new Map(),tokenIndex=new Map();
 const rows=catalog.map(e=>{
  const canonical=new Set([e.name,e.en,e.id].map(normalize));
  const aliases=new Map();
  for(const name of [...dictionary[e.id]??[],...e.aliases??[]]){const key=normalize(name);if(key&&!canonical.has(key)&&!aliases.has(key))aliases.set(key,name);}
  for(const key of new Set([...canonical,...aliases.keys()])){const ids=index.get(key)??new Set();ids.add(e.id);index.set(key,ids);const signature=tokenSignature(key);const tokenIds=tokenIndex.get(signature)??new Set();tokenIds.add(e.id);tokenIndex.set(signature,tokenIds);}
  const canonicalTokens=new Set([...canonical].map(tokenSignature));
  const tokenDistinctAliasCount=new Set([...aliases.keys()].map(tokenSignature).filter(s=>!canonicalTokens.has(s))).size;
  return {exerciseId:e.id,hebrew:e.name,english:e.en,aliasCount:aliases.size,tokenDistinctAliasCount,meetsTarget:aliases.size>=15,aliases:[...aliases].map(([normalized,name])=>({name,normalized})),hasHebrew:[...aliases.values()].some(n=>/[א-ת]/.test(n)),hasEnglish:[...aliases.values()].some(n=>/[a-z]/i.test(n))};
 });
 const collisions=[...index].filter(([,ids])=>ids.size>1).map(([normalized,ids])=>({normalized,exerciseIds:[...ids].sort()})).sort((a,b)=>a.normalized.localeCompare(b.normalized,'en'));
 const tokenCollisions=[...tokenIndex].filter(([,ids])=>ids.size>1).map(([signature,ids])=>({signature,exerciseIds:[...ids].sort()})).sort((a,b)=>a.signature.localeCompare(b.signature,'en'));
 return {tokenDistinctAliases:rows.reduce((s,r)=>s+r.tokenDistinctAliasCount,0),tokenCollisions,exerciseCount:rows.length,totalAliases:rows.reduce((s,r)=>s+r.aliasCount,0),meetsTarget:rows.filter(r=>r.meetsTarget).length,shortfalls:rows.filter(r=>!r.meetsTarget).map(({exerciseId,aliasCount})=>({exerciseId,aliasCount,missing:15-aliasCount})),orphanIds:Object.keys(dictionary).filter(id=>!catalog.some(e=>e.id===id)).sort(),rows,collisions};
}
const quote=s=>'"'+String(s).replaceAll('"','""')+'"';
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const output=resolve(process.argv[2]??'docs/audits/recognition-3');mkdirSync(output,{recursive:true});
 const report=auditExerciseAliases();
 // Literal self-consistency diagnostics, NOT independent precision/recall.
 const unresolved=[];
 for(const row of report.rows)for(const alias of row.aliases){const match=matchExerciseForImport(alias.name,exercises,{allowGeneralMovement:true});if(match.exerciseId!==row.exerciseId)unresolved.push({name:alias.name,expected:row.exerciseId,status:match.status,actual:match.exerciseId,candidates:match.candidates});}
 writeFileSync(output+'/alias-audit.json',JSON.stringify({...report,literalDiagnostics:unresolved},null,2)+'\n');
 writeFileSync(output+'/aliases.csv','exercise_id,hebrew,english,alias_count,alias,normalized\n'+report.rows.flatMap(r=>r.aliases.length?r.aliases.map(a=>[r.exerciseId,r.hebrew,r.english,r.aliasCount,a.name,a.normalized].map(quote).join(',')):[[r.exerciseId,r.hebrew,r.english,0,'',''].map(quote).join(',')]).join('\n')+'\n');
 writeFileSync(output+'/coverage.md','# Exercise Recognition 3.0 alias coverage\n\nCounts exclude canonical names/ID and deduplicate using the production normalizer. Literal listed word-order variants count when their normalized strings differ; runtime permutations are not generated or added to this count. The separate token-distinct count also collapses word order and excludes canonical token equivalents. Alias collisions count as naming coverage, not automatic recognition. See JSON for collisions and literal diagnostics.\n\n| ID | English | Literal normalized aliases | Token-distinct aliases | Target |\n|---|---|---:|---:|---|\n'+report.rows.map(r=>`| ${r.exerciseId} | ${r.english} | ${r.aliasCount} | ${r.tokenDistinctAliasCount} | ${r.meetsTarget?'15+':'SHORTFALL'} |`).join('\n')+'\n');
 console.log(JSON.stringify({exerciseCount:report.exerciseCount,totalAliases:report.totalAliases,meetsTarget:report.meetsTarget,shortfalls:report.shortfalls,collisions:report.collisions.length,literalDiagnostics:unresolved.length,orphanIds:report.orphanIds},null,2));
}
