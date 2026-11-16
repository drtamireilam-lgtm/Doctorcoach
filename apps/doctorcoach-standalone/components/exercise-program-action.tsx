'use client';
import {useRef,useState} from 'react';
import type {TrainingController} from '../hooks/use-training';
import {programExercisePayload} from '../lib/anatomy-training';
import {customId} from '../lib/custom-exercise-types';
import {useLanguage} from './language-provider';
export function ExerciseProgramAction({exerciseId,controller}:{exerciseId:string;controller:TrainingController}){
 const {language}=useLanguage(),he=language==='he';const [day,setDay]=useState(controller.selectedPlanDay),[saved,setSaved]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const pending=useRef<ReturnType<typeof programExercisePayload>|{exerciseId:string;dayId:string;occurrenceId:string}|null>(null),lock=useRef(false);
 const days=controller.split?.days??[{id:'1',label:he?'האימון שלי':'My workout'}];
 async function save(){if(lock.current)return;lock.current=true;setSaving(true);setError('');try{pending.current??=customId(exerciseId)?{exerciseId,dayId:day,occurrenceId:crypto.randomUUID()}:programExercisePayload(exerciseId,day);const result=await controller.savePlan(pending.current);if(result){setSaved(true);pending.current=null;}else setError(he?'השמירה לא אושרה. בדקו את ההודעה ונסו שוב.':'Save was not confirmed. Check the message and retry.');}catch{setError(he?'לא ניתן להוסיף כרגע. נסו שוב.':'Unable to add right now. Retry.');}finally{lock.current=false;setSaving(false);}}
 return <section data-no-translate className="care-stack" aria-label={he?'הוספה ליום אימון':'Add to a workout day'}>{controller.access?.canBuild?<><label className="care-field">{he?'יום אימון בתוכנית הקיימת':'Workout day in the current program'}<select value={day} disabled={saving||!!pending.current} onChange={e=>{setDay(e.target.value);setSaved(false);setError('');}}>{days.map(d=><option key={d.id} value={d.id}>{d.label}</option>)}</select></label><button className="button primary wide" disabled={controller.busy||saving||saved||!days.some(d=>d.id===day)} onClick={()=>void save()}>{saved?(he?'נוסף ליום שנבחר':'Added to the selected day'):saving?(he?'שומרים…':'Saving…'):(he?'הוספה לתוכנית':'Add to program')}</button>{error&&<p role="alert">{error}</p>}{saved&&<p role="status">{he?'התרגיל נוסף. התרגילים והביצועים הקודמים נשמרו.':'Exercise added. Existing prescriptions and workout history are preserved.'}</p>}</>:<p>{he?'הוספה לתוכנית זמינה לפי הרשאות הבנייה שלך. בתוכנית בליווי, המאמן מנהל את בחירת התרגילים.':'Adding exercises requires program-building access. Your coach manages exercises in a coached program.'}</p>}</section>;
}
