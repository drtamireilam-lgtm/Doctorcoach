'use client';
import type {TrainingController} from '../hooks/use-training';
import type {SessionExercise} from '../lib/training';
import {removableSessionSet} from '../lib/session-flexibility';
import {workoutDayId} from '../lib/workout-days';
import {workoutSection} from '../lib/workout-sections';
import {useLanguage} from './language-provider';
import {exercises} from '../lib/content';
import {WorkoutPrescription} from './workout-prescription';

export function SessionPrescription({item}:{item:SessionExercise}) {
 const en=useLanguage().language==='en',p=item.prescription;
 if(!p)return null;
 const exercise=exercises.find(e=>e.id===p.exerciseId);
 return <details className="session-prescription"><summary>{en?'Original prescription':'המרשם המקורי'}</summary><p>
  {p.customExercise?.name??(en?exercise?.en:exercise?.name)??p.exerciseId}
 </p><WorkoutPrescription item={p}/></details>;
}

export function SessionFlexibility({item,controller,hasDraft}:{item:SessionExercise;controller:TrainingController;hasDraft:boolean}) {
 const en=useLanguage().language==='en',t=(he:string,english:string)=>en?english:he;
 const session=controller.feed.active;
 if(!session)return null;
 const peers=session.items.filter(i=>workoutDayId(i)===workoutDayId(item)&&workoutSection(i)===workoutSection(item));
 const index=peers.indexOf(item),disabled=controller.busy||hasDraft;
 const patch=(action:string,extra:Record<string,unknown>={})=>void controller.patch({action,exerciseId:item.exerciseId,occurrenceId:item.occurrenceId,...extra});
 return <div className="session-flexibility care-form" dir={en?'ltr':'rtl'}>
  <div className="care-actions" role="group" aria-label={t('סדר התרגיל באימון','Exercise order in this workout')}>
   <button type="button" className="button secondary" disabled={disabled||index<=0} onClick={()=>patch('moveExercise',{direction:-1})}>{t('הקדמת התרגיל','Move earlier')}</button>
   <button type="button" className="button secondary" disabled={disabled||index<0||index>=peers.length-1} onClick={()=>patch('moveExercise',{direction:1})}>{t('דחיית התרגיל','Move later')}</button>
  </div>
  {!item.cardio&&session.planMode!=='coached'&&<div className="care-actions" role="group" aria-label={t('סטים באימון הנוכחי','Sets in this workout')}>
   <button type="button" className="button secondary" disabled={disabled||item.sets>=20} onClick={()=>patch('addSet')}>{t('הוספת סט לאימון','Add workout set')}</button>
   <button type="button" className="button secondary" disabled={disabled||!removableSessionSet(item)} onClick={()=>patch('removeSet')}>{t('הסרת הסט האחרון שטרם תועד','Remove last untouched set')}</button>
  </div>}
  <SessionPrescription item={item}/>
  <small>{t('שינויים כאן נשמרים באימון הזה בלבד. התוכנית המקורית נשארת ללא שינוי.','Changes apply only to this workout. Your original program is preserved.')}</small>
 </div>;
}
