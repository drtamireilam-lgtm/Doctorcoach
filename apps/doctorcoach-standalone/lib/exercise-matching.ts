import {parseExerciseQualifiers} from './exercise-qualifiers.ts';
import {exercises} from './content.ts';
import {exerciseAliases} from './exercise-aliases.ts';
import type {NamedExercise} from './exercise-search.ts';

export type ExerciseMatchStatus='exact'|'alias'|'normalized'|'suggested'|'ambiguous'|'unmatched';
export type ExerciseMatchCandidate={exerciseId:string;score:number;reason:string};
export type ExerciseImportMatch={exerciseId:string;status:ExerciseMatchStatus;confidence:number;candidates:ExerciseMatchCandidate[]};

/** Conservative equivalence only: never remove equipment, angle, side or stance. */
export function normalizeImportExerciseName(value:string){
 return value.normalize('NFKC').toLowerCase()
  .replace(/\bd\s*\.\s*b\s*\.?/g,'dumbbell ').replace(/\bb\s*\.\s*b\s*\.?/g,'barbell ')
  .replace(/[\u0591-\u05c7]/g,'').replace(/[׳״’'".,()\[\]{}‐‑–—_\-/\\:;]+/g,' ')
  .replace(/\b(?:db|dumbbells)\b/g,'dumbbell').replace(/\b(?:bb|barbells)\b/g,'barbell')
  .replace(/\s+/g,' ').trim();
}
type Entry={exerciseId:string;source:string;canonical:boolean};
type Index={names:Map<string,Entry[]>;tokens:Map<string,Entry[]>;keys:string[]};
// Sorted MULTISET: no stopword removal, stemming or dropping unknown tokens.
const tokenKey=(key:string)=>key.split(' ').sort().join(' ');
const cache=new WeakMap<readonly NamedExercise[],Index>();
function indexFor(catalog:readonly NamedExercise[]):Index{
 const existing=cache.get(catalog);if(existing)return existing;
 const names=new Map<string,Entry[]>();
 for(const item of catalog){
  for(const [canonical,values] of [[true,[item.name,item.en,item.id]],[false,[...exerciseAliases[item.id]??[],...item.aliases??[]]]] as const){
   for(const source of values){const key=normalizeImportExerciseName(source);if(!key)continue;const entries=names.get(key)??[];entries.push({exerciseId:item.id,source,canonical});names.set(key,entries);}
  }
 }
 const tokens=new Map<string,Entry[]>();
 for(const [key,entries] of names){const signature=tokenKey(key);tokens.set(signature,[...tokens.get(signature)??[],...entries]);}
 const index={names,tokens,keys:[...names.keys()]};cache.set(catalog,index);return index;
}
function similarity(a:string,b:string){
 if(Math.abs(a.length-b.length)>Math.max(a.length,b.length)*.4)return 0;
 let previous=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,previous[j]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1));previous=next;}
 return 1-previous[b.length]/Math.max(a.length,b.length);
}
const empty=():ExerciseImportMatch=>({exerciseId:'',status:'unmatched',confidence:0,candidates:[]});
/** Import-only index; exact verified equivalence can assign, fuzzy results cannot. */
export function matchExerciseForImport(name:string,catalog:readonly NamedExercise[]=exercises,options:{allowGeneralMovement?:boolean;suggestions?:boolean}={}):ExerciseImportMatch{
 const key=normalizeImportExerciseName(name);if(!key||key.length>240)return empty();
 if(parseExerciseQualifiers(key).conflict)return empty();
 const index=indexFor(catalog);
 // Union exact and reordered names: an exact spelling cannot hide a collision
 // with another verified phrase containing the identical words.
 const rawEntries=index.tokens.get(tokenKey(key));
 const eligible=rawEntries?.filter(e=>options.allowGeneralMovement||!e.exerciseId.startsWith('movement-'));
 const entries=eligible?.length?eligible:undefined;
 if(entries){
  // A literal general movement takes precedence only in the opted-in program
  // import policy. Explicit equipment/angle names do not match these keys.
  const general=options.allowGeneralMovement?entries.filter(e=>e.exerciseId.startsWith('movement-')):[];
  const preferred=general.length?general:entries;
  const ids=[...new Set(preferred.map(e=>e.exerciseId))];
  const candidates=ids.slice(0,3).map(exerciseId=>({exerciseId,score:1,reason:ids.length>1?'Name identifies multiple catalog variants':'Verified catalog name or alias'}));
  if(ids.length>1)return {exerciseId:'',status:'ambiguous',confidence:0,candidates};
  const literal=preferred.find(e=>e.source.trim().toLowerCase()===name.trim().toLowerCase());
  return {exerciseId:ids[0],status:literal?(literal.canonical?'exact':'alias'):'normalized',confidence:1,candidates};
 }
 if(options.suggestions===false)return empty();
 // Spelling similarity is evidence for review only, even at a very high score.
 const scores=new Map<string,number>();
 for(const candidateKey of index.keys){const words=key.split(' '),candidateWords=candidateKey.split(' ');const contained=words.length>=2&&words.every(w=>candidateWords.includes(w));const score=Math.max(similarity(key,candidateKey),contained?.74:0);if(score<.72)continue;for(const entry of index.names.get(candidateKey)??[])if(options.allowGeneralMovement||!entry.exerciseId.startsWith('movement-'))scores.set(entry.exerciseId,Math.max(scores.get(entry.exerciseId)??0,score));}
 const candidates=[...scores].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,3).map(([exerciseId,score])=>({exerciseId,score,reason:'Similar spelling; verify equipment, angle and side manually'}));
 return candidates.length?{exerciseId:'',status:'suggested',confidence:candidates[0].score,candidates}:empty();
}
