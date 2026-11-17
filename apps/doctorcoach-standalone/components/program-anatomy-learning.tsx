'use client';
import {useRef,useState} from 'react';
import type {WorkoutLearningTarget} from '../lib/workout-learning';
import {useLanguage} from './language-provider';
import {WorkoutLearningDialog,type WorkoutLearningReturn} from './workout-learning-dialog';
/** Learning is read-only; only an explicit accepted callback can append to a draft. */
export function ProgramAnatomyLearning({exerciseId,dayLabel,availableIds,canAdd=false,onAdd}:{exerciseId:string;dayLabel:string;availableIds:readonly string[];canAdd?:boolean;onAdd?:(id:string)=>boolean}){
 const {language}=useLanguage(),he=language==='he';
 const [target,setTarget]=useState<WorkoutLearningTarget|null>(null),[added,setAdded]=useState<string|null>(null),[error,setError]=useState('');
 const returnTo=useRef<WorkoutLearningReturn|null>(null),submitted=useRef<string|null>(null);
 const navigate=(next:WorkoutLearningTarget)=>{setTarget(next);setAdded(null);setError('');submitted.current=null;};
 return <div className="program-anatomy-learning" data-no-translate>
  <button type="button" className="button secondary" data-program-learning={exerciseId} onClick={event=>{returnTo.current={element:event.currentTarget,x:window.scrollX,y:window.scrollY};navigate({kind:'exercise',id:exerciseId});}}>{he?'שרירים והסבר לתרגיל':'Muscles and exercise guide'}</button>
  {target&&<WorkoutLearningDialog target={target} language={language} onNavigate={navigate} onClose={()=>setTarget(null)} returnTo={returnTo} returnLabel={he?'חזרה לעורך התוכנית':'Back to program editor'} exerciseAction={id=>{
   const enabled=canAdd&&!!onAdd&&availableIds.includes(id)&&added!==id;
   return <section className="care-form program-anatomy-add" aria-label={he?'הוספה לטיוטת התוכנית':'Add to program draft'}>
    <p>{he?'יום היעד בטיוטה: ':'Draft destination: '}{dayLabel}</p>
    <button type="button" className="button primary" data-learning-add={id} disabled={!enabled} onClick={()=>{if(!enabled||submitted.current===id)return;submitted.current=id;try{if(onAdd?.(id)){setAdded(id);setError('');}else{setError(he?'התרגיל לא נוסף. בדקו את הטיוטה ונסו שוב.':'Exercise was not added. Check the draft and retry.');submitted.current=null;}}catch{setError(he?'התרגיל לא נוסף. נסו שוב.':'Exercise was not added. Retry.');submitted.current=null;}}}>{added===id?(he?'נוסף לטיוטה':'Added to draft'):(he?'הוספה ליום הזה בטיוטה':'Add to this draft day')}</button>
    {added===id&&<p role="status">{he?'התרגיל נוסף לטיוטה. פרסום התוכנית הוא פעולה נפרדת.':'Exercise added to the draft. Publishing the program is a separate action.'}</p>}
    {!canAdd&&<p role="status">{he?'ההוספה אינה זמינה כרגע. אשרו שדות פתוחים ובדקו את המקום בתוכנית.':'Adding is unavailable right now. Confirm pending fields and check program capacity.'}</p>}
    {!availableIds.includes(id)&&<p role="status">{he?'התרגיל אינו זמין בקטלוג של העורך הזה.':'This exercise is unavailable in this editor’s catalog.'}</p>}
    {error&&<p role="alert">{error}</p>}
   </section>;
  }}/>}
 </div>;
}
