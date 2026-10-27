'use client';
import {useLanguage} from './language-provider';
import {reviewImportExerciseName} from '../lib/import-recognition-review';
import {matchExerciseForImport} from '../lib/exercise-matching';
import type {Exercise} from '../lib/content';

export function ImportRecognitionHelp({name,catalog,onSelect}:{name:string;catalog:Exercise[];onSelect:(id:string)=>void}){
 const english=useLanguage().language==='en';
 if(matchExerciseForImport(name,catalog,{allowGeneralMovement:true,suggestions:false}).exerciseId)return null;
 const review=reviewImportExerciseName(name,catalog);
 const ids=review?review.candidateIds:matchExerciseForImport(name,catalog,{allowGeneralMovement:true}).candidates.map(c=>c.exerciseId);
 const candidates=ids.flatMap(id=>{const entry=catalog.find(e=>e.id===id);return entry?[entry]:[];});
 return <div data-recognition-review={review?.category??'unrecognized'} dir={english?'ltr':'rtl'}>
  {review&&<p className="care-muted">{english?review.en:review.he}</p>}
  {!!candidates.length&&<><p>{english?'Suggestions for review · no automatic match':'הצעות לבדיקה · אין התאמה אוטומטית'}</p><div className="care-actions">{candidates.map(e=><button className="text-button" type="button" key={e.id} onClick={()=>onSelect(e.id)}>{e.name} · {e.en}</button>)}</div></>}
 </div>;
}
