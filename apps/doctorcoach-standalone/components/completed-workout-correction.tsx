'use client';
import {useRef,useState} from 'react';
import type {TrainingController} from '../hooks/use-training';
import {canCorrectCompletedSet,type CompletedSetCorrection} from '../lib/completed-workout-corrections';
import {canonicalEffort,effortName,effortValue} from '../lib/effort';
import {fromKg,toKg} from '../lib/load-units';
import {unitMax,type TrainingSession,type SessionExercise} from '../lib/training';
import {useLanguage} from './language-provider';

type Draft={snapshot:TrainingSession;itemIndex:number;setIndex:number;amount:string;weight:string;effort:string;originalWeight:string};
type Controller=Pick<TrainingController,'auth'|'busy'|'access'|'correctCompletedSet'|'refresh'>;
function draftFor(snapshot:TrainingSession,itemIndex:number,setIndex:number):Draft {
 const item=snapshot.items[itemIndex],set=item.results[setIndex],weight=set.weight==null?'':String(fromKg(set.weight,item.load?.sourceUnit??'kg'));
 return {snapshot,itemIndex,setIndex,amount:set.amount==null?'':String(set.amount),weight,originalWeight:weight,effort:String(effortValue(set.actualRpe,item.effortScale)??'')};
}

const correctable=(session:TrainingSession,item:SessionExercise,index:number)=>!!item.occurrenceId&&canCorrectCompletedSet(session,item,index);

/** Explicit historical corrections never share active-workout autosave or apply load recommendations. */
export function CompletedWorkoutCorrection({session,controller}:{session:TrainingSession;controller:Controller}) {
 const en=useLanguage().language==='en',t=(he:string,english:string)=>en?english:he;
 const [draft,setDraft]=useState<Draft|null>(null),[saving,setSaving]=useState(false),[conflict,setConflict]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const lock=useRef(false),blocked=useRef(false),identities=useRef(new Map<string,string>());
 const eligible=session.items.some(item=>item.results.some((_,index)=>correctable(session,item,index)));
 if(controller.auth!=='ready'||!controller.access?.canStart||!eligible)return null;
 const snapshot=draft?.snapshot??session,item=draft?snapshot.items[draft.itemIndex]:null,unit=item?.load?.sourceUnit??'kg',disabled=saving||controller.busy;
 const edit=(patch:Partial<Draft>)=>{if(!lock.current&&!controller.busy)setDraft(old=>old?{...old,...patch}:old);};
 const open=()=>{
  if(lock.current||controller.busy||blocked.current)return;
  const itemIndex=session.items.findIndex(candidate=>candidate.results.some((_,index)=>correctable(session,candidate,index))),selected=session.items[itemIndex];
  setDraft(draftFor(session,itemIndex,selected.results.findIndex((_,index)=>correctable(session,selected,index))));setError('');setMessage('');
 };
 const save=async()=>{
  if(!draft||!item?.occurrenceId||lock.current||controller.busy||blocked.current||controller.auth!=='ready'||!controller.access?.canStart)return;
  const amount=Number(draft.amount),weight=draft.weight===draft.originalWeight?item.results[draft.setIndex].weight:toKg(Number(draft.weight),unit),actualRpe=canonicalEffort(draft.effort,item.effortScale);
  if(!draft.amount.trim()||!Number.isInteger(amount)||amount<1||amount>unitMax.reps||!draft.weight.trim()||weight===null||!Number.isFinite(weight)||weight<0||weight>1000||actualRpe!==null&&(!Number.isFinite(actualRpe)||actualRpe<1||actualRpe>10||!Number.isInteger(actualRpe*2))){
   setError(t('בדקו חזרות (1–100), משקל (0–1000 ק״ג) ומאמץ במדרגות של חצי. מאמץ לא ידוע אפשר להשאיר ריק.','Check repetitions (1–100), weight (0–1000 kg) and effort in half steps. Leave unknown effort blank.'));return;
  }
  const values={sessionId:snapshot.id,version:snapshot.version,exerciseId:item.exerciseId,occurrenceId:item.occurrenceId,setIndex:draft.setIndex,amount,weight,actualRpe},key=JSON.stringify(values);
  let requestId=identities.current.get(key);if(!requestId){requestId=crypto.randomUUID();identities.current.set(key,requestId);}
  const payload:CompletedSetCorrection={...values,requestId};
  lock.current=true;setSaving(true);setError('');setMessage('');
  const failure=(cause:Error&{status?:number})=>{
   if(cause.status===409){blocked.current=true;setConflict(true);setError(t('האימון השתנה מאז פתיחת העורך. העריכה נשמרה על המסך. טענו מחדש לפני תיקון נוסף.','This workout changed after the editor opened. Your edits remain on screen. Reload before another correction.'));}
   else setError(cause.status===401||cause.status===403?t('אין כרגע הרשאה לשמור את התיקון. התחברו ובדקו את הגישה.','You cannot save this correction right now. Sign in and check your access.'):t('התיקון לא אושר כשמור. הערכים נשארו בעורך; אפשר לנסות שוב.','The correction was not confirmed as saved. Your values remain in the editor; you can retry.'));
  };
  try {const saved=await controller.correctCompletedSet(payload,failure);if(saved){setDraft(null);setMessage(t('התיקון נשמר בהיסטוריית האימון.','The correction was saved in workout history.'));}else if(!blocked.current)setError(old=>old||t('השמירה לא אושרה. הערכים נשארו בעורך; אפשר לנסות שוב.','Saving was not confirmed. Your values remain in the editor; you can retry.'));}
  catch(cause){failure(cause as Error&{status?:number});}
  finally{lock.current=false;setSaving(false);}
 };
 const reload=async()=>{
  if(lock.current||controller.busy)return;
  lock.current=true;setSaving(true);
  try {if(await controller.refresh()){setDraft(null);blocked.current=false;setConflict(false);setError('');setMessage(t('האימון נטען מחדש והעריכה שלא נשמרה בוטלה. פתחו שוב לתיקון.','The workout was reloaded and unsaved edits were discarded. Reopen to correct it.'));}else setError(t('לא ניתן לטעון מחדש כרגע. העריכה נשארה על המסך.','Unable to reload right now. Your edits remain on screen.'));}
  catch{setError(t('לא ניתן לטעון מחדש כרגע. העריכה נשארה על המסך.','Unable to reload right now. Your edits remain on screen.'));}
  finally{lock.current=false;setSaving(false);}
 };
 return <section className="panel care-form completed-workout-correction" dir={en?'ltr':'rtl'} aria-label={t('תיקון ביצוע באימון שהושלם','Correct performance in a completed workout')}>
  {!draft&&<button type="button" className="button secondary" disabled={disabled||conflict} onClick={open}>{t('תיקון סט שתועד','Correct a recorded set')}</button>}
  {draft&&item&&<form className="care-form" onSubmit={event=>{event.preventDefault();return save();}}>
   <h4>{t('תיקון סט שתועד','Correct a recorded set')}</h4>
   <p className="care-muted">{t('התיקון מתועד עם הערכים הקודמים. זמני האימון, התוכנית המקורית ושאר הסטים נשמרים. אין שמירה אוטומטית.','Corrections are audited with the previous values. Workout times, the original prescription and other sets are preserved. Changes save only when you confirm.')}</p>
   <label className="care-field">{t('מופע תרגיל','Exercise occurrence')}<select className="service-select" aria-label={t('מופע תרגיל','Exercise occurrence')} value={item.occurrenceId} disabled={disabled} onChange={event=>{if(lock.current||controller.busy)return;const index=snapshot.items.findIndex(i=>i.occurrenceId===event.target.value);if(index<0)return;const selected=snapshot.items[index],setIndex=selected.results.findIndex((_,n)=>correctable(snapshot,selected,n));if(setIndex>=0)setDraft(draftFor(snapshot,index,setIndex));}}>{snapshot.items.map((candidate,index)=>candidate.results.some((_,n)=>correctable(snapshot,candidate,n))&&<option key={candidate.occurrenceId} value={candidate.occurrenceId}>{index+1}. {candidate.name}</option>)}</select></label>
   <label className="care-field">{t('סט','Set')}<select className="service-select" aria-label={t('סט','Set')} value={draft.setIndex} disabled={disabled} onChange={event=>{if(!lock.current&&!controller.busy){const index=Number(event.target.value);if(correctable(snapshot,item,index))setDraft(draftFor(snapshot,draft.itemIndex,index));}}}>{item.results.map((_,index)=>correctable(snapshot,item,index)&&<option value={index} key={index}>{t('סט','Set')} {index+1}</option>)}</select></label>
   <div className="form-grid">
    <label className="care-field">{t('חזרות','Repetitions')}<input aria-label={t('חזרות','Repetitions')} type="number" dir="ltr" inputMode="numeric" min={1} max={unitMax.reps} step={1} required value={draft.amount} disabled={disabled} onChange={event=>edit({amount:event.target.value})}/></label>
    <label className="care-field">{t(`משקל (${unit})`,`Weight (${unit})`)}{item.load?.basis==='per-side'&&t(' · לכל צד',' · per side')}<input aria-label={t(`משקל (${unit})`,`Weight (${unit})`)} type="number" dir="ltr" inputMode="decimal" min={0} max={fromKg(1000,unit)} step="any" required value={draft.weight} disabled={disabled} onChange={event=>edit({weight:event.target.value})}/></label>
    <label className="care-field">{effortName(item.effortScale)}<input aria-label={effortName(item.effortScale)} type="number" dir="ltr" inputMode="decimal" min={item.effortScale==='rir'?0:1} max={item.effortScale==='rir'?9:10} step={0.5} value={draft.effort} disabled={disabled} placeholder={t('לא ידוע','Unknown')} onChange={event=>edit({effort:event.target.value})}/></label>
   </div>
   <div className="care-actions"><button type="submit" className="button primary" disabled={disabled||conflict}>{saving?t('שומרים…','Saving…'):t('שמירת התיקון','Save correction')}</button><button type="button" className="button secondary" disabled={disabled} onClick={()=>{if(!lock.current){setDraft(null);if(!blocked.current)setError('');}}}>{t('ביטול','Cancel')}</button></div>
  </form>}
  {conflict&&<button type="button" className="button secondary" disabled={disabled} onClick={reload}>{t('טעינה מחדש וביטול העריכה','Reload and discard changes')}</button>}
  {error&&<p className="care-error" role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
 </section>;
}
