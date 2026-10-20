'use client';
import {fromKg} from '../lib/load-units';
import {planExerciseName} from '../lib/custom-exercise-types';
import {CustomExerciseInstructions} from './custom-exercise-instructions';
import {repetitionLabel} from '../lib/training';
import {TempoDetails} from './exercise-tempo';
import {Localize} from "../components/language-provider";
import type {PlanItem} from '../lib/training';
import {unitLabels} from '../lib/training';
import {programReviewDays} from '../lib/program-review';
import {planItemKey,workoutDayLabel} from '../lib/workout-days';
import {effortTarget} from '../lib/effort';
import {exercises} from '../lib/content';
import {CareFeedback} from './care-ui';
import {WorkoutSections} from './workout-sections';

const nameOf=(id:string)=>exercises.find(e=>e.id===id)?.name??id;
export function ProgramReview({title,items,clientName,replaces,busy,error,stale,onBack,onEditDay,onPublish}:{
 title:string;items:PlanItem[];clientName:string;replaces?:string;busy:boolean;error:string;stale:boolean;
 onBack:()=>void;onEditDay:(id:string)=>void;onPublish:()=>void;
}){
 const days=programReviewDays(items);
 return <Localize>{<section className="panel care-form" aria-label="בדיקת התוכנית לפני פרסום" dir="rtl">
  <header><span className="eyebrow">בדיקה לפני פרסום</span><h2>{title}</h2><p>מיועדת ל־<strong>{clientName}</strong></p></header>
  <p>{days.length} ימי אימון · {items.length} תרגילים · {days.reduce((sum,d)=>sum+d.sets,0)} סטים בכל ימי התוכנית יחד</p>
  <p className="note">{replaces?`הפרסום יחליף את התוכנית הפעילה ״${replaces}״.`:'לאחר הפרסום התוכנית תהיה זמינה למתאמן.'} אימונים שכבר נשמרו לא ישתנו. ימים ריקים אינם כלולים בתוכנית.</p>
  <div className="care-stack">{days.map(day=><section className="care-program-edit" key={day.id} aria-label={workoutDayLabel(day.id)}>
   <div className="care-row"><div><h3>{workoutDayLabel(day.id)}</h3><p className="care-muted">{day.items.length} תרגילים · {day.sets} סטים</p></div><button type="button" className="text-button" disabled={busy} onClick={()=>onEditDay(day.id)}>עריכת היום</button></div>
   <div className="care-dose-list"><WorkoutSections items={day.items}>{item=><article key={planItemKey(item)}>
    <strong>{planExerciseName(item,nameOf(item.exerciseId))}</strong>
    {item.side&&<p>צד: {{left:'שמאל',right:'ימין',both:'שני הצדדים'}[item.side]}</p>}
    {!!item.warmupSets?.length&&<div className="care-dose-list"><strong>סטים לחימום</strong>{item.warmupSets.map((set,index)=><p key={index}>חימום {index+1}: {set.weight} ק״ג × {set.amount} {unitLabels[item.unit]}</p>)}</div>}
    <p>{item.sets} סטים × {repetitionLabel(item)} {unitLabels[item.unit]} · {effortTarget(item)} · משקל פתיחה: {item.weightUnspecified?'לא הוגדר משקל':`${new Intl.NumberFormat('he-IL',{maximumFractionDigits:2}).format(fromKg(item.weight,item.load?.sourceUnit??'kg'))} ${item.load?.sourceUnit??'kg'}${item.load?.basis==='per-side'?' לכל צד':''}`}</p>
    {item.targetRpe==null&&<p className="care-muted">לא הוגדר יעד מאמץ לתרגיל הזה.</p>}
    {item.weightUnspecified&&<p className="care-muted">המשקל חסר במקור. המתאמן יתעד את המשקל בפועל.</p>}
    <TempoDetails item={item}/><CustomExerciseInstructions item={item}/>{item.notes&&<p className="care-preserve">הערת המאמן: {item.notes}</p>}
    <p className="care-muted">{item.approvedSubstitutions?.length?`חלופות מאושרות: ${item.approvedSubstitutions.map(nameOf).join(' · ')}`:'ללא חלופות מאושרות'}</p>
   </article>}</WorkoutSections></div>
  </section>)}</div>
  {stale&&<p className="care-error" role="alert">התוכנית הפעילה השתנתה. חזרו לעורך וטענו את הגרסה העדכנית.</p>}
  <CareFeedback error={error}/>
  <div className="care-actions"><button type="button" className="button secondary" disabled={busy} onClick={onBack}>חזרה לעריכה</button><button type="button" className="button primary" disabled={busy||stale} onClick={onPublish}>{busy?'מפרסמים…':'אישור ופרסום התוכנית למתאמן'}</button></div>
 </section>}</Localize>;
}
