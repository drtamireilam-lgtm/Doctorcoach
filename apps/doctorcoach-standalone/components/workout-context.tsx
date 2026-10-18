'use client';
import {Localize} from "../components/language-provider";
import {useEffect,useState} from 'react';
import type {TrainingSession} from '../lib/training';
import type {TrainingController} from '../hooks/use-training';
import {duringPain,followupDay,israelDay} from '../lib/workout-context';
import {CareSelect} from './care-ui';

export function WorkoutContext({session}:{session:TrainingSession}){
 const ready=session.readiness;
 return <Localize>{<section className="care-form workout-context"><h3>מוכנות וכאב באימון הזה</h3>
  {ready?<><p>מוכנות מ־{ready.day}, כפי שנשמרה בתחילת האימון: שינה {ready.data.sleep} שעות · אנרגיה {ready.data.energy}/10 · עומס מורגש {ready.data.stress}/10</p>{ready.data.note&&<p className="session-notes">{ready.data.note}</p>}</>:<p className="care-muted">לא נשמר דיווח מוכנות עם תחילת האימון הזה.</p>}
  <p>כאב לפני: {session.before}/10 · במהלך הסטים: {duringPain(session.items)===null?'לא דווח':duringPain(session.items)+'/10 (הגבוה שדווח)'} · בסיום: {session.after===null?'לא דווח':session.after+'/10'}</p>
  <p>ביום שאחרי: {session.followup?`${session.followup.pain}/10 · מתייחס ל־${session.followup.day}`:'לא דווח'}</p>
  {session.finishFeedback?.effort!=null&&<p>מאמץ כללי בסיום: {session.finishFeedback.effort}/10</p>}{session.finishFeedback?.note&&<p className="session-notes" data-no-translate>הערה בסיום: {session.finishFeedback.note}</p>}
  <small className="care-muted">דיווח עצמי לעיון הצוות. אינו אישור רפואי או שינוי אוטומטי בתוכנית.</small>
 </section>}</Localize>;
}
export function WorkoutFollowupForm({session,controller}:{session:TrainingSession;controller:TrainingController}){
 const [pain,setPain]=useState(session.followup?String(session.followup.pain):'none');
 const [today,setToday]=useState('');
 useEffect(()=>{setToday(israelDay(new Date().toISOString()));},[]);
 useEffect(()=>setPain(session.followup?String(session.followup.pain):'none'),[session.followup?.pain]);
 if(!session.finishedAt||!today||today<followupDay(session.finishedAt))return null;
 return <Localize>{<div className="care-form"><h3>איך הרגשת ביום שאחרי האימון?</h3><p>דיווח על {followupDay(session.finishedAt)}. אם לא זכור לך, אפשר להשאיר ללא דיווח.</p><CareSelect label="כאב ביום שאחרי (0–10)" value={pain} disabled={controller.busy} onChange={setPain} options={[{value:'none',label:'לא דווח'},...Array.from({length:11},(_,n)=>({value:String(n),label:String(n)}))]}/><button className="button secondary" disabled={controller.busy||pain==='none'||Number(pain)===session.followup?.pain} onClick={()=>void controller.followup(session,Number(pain))}>{session.followup?'עדכון הדיווח':'שמירת הדיווח'}</button></div>}</Localize>;
}
