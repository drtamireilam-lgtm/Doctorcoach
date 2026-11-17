'use client';
import {useEffect,useMemo,useState} from 'react';
import type {TrainingSession} from '../lib/training';
import {completedMuscleSessions,completedMuscleSummary} from '../lib/completed-muscle-map';
import {exerciseMuscleName} from '../lib/anatomy-training';
import {WorkoutMuscleMapContent} from './workout-muscle-map';
import {useLanguage} from './language-provider';
const roles=['primary','secondary','stabilizer'] as const;
export function CompletedMuscleMap({history}:{history:readonly TrainingSession[]}){
 const {language}=useLanguage(),[open,setOpen]=useState(false),he=language==='he';
 return <section className="panel completed-muscle-map-entry no-print" data-no-translate><button type="button" className="button secondary" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?(he?'סגירת מפת השרירים שבוצעו':'Close completed muscle map'):(he?'מפת השרירים שבוצעו':'Completed workout muscle map')}</button>{open&&<CompletedMuscleMapContent history={history} language={language}/>}</section>;
}
export function CompletedMuscleMapContent({history,language}:{history:readonly TrainingSession[];language:'he'|'en'}){
 const he=language==='he',available=useMemo(()=>completedMuscleSessions(history),[history]);
 const [mode,setMode]=useState('session'),[selected,setSelected]=useState(available[0]?.session.id??''),[chosenAnchor,setAnchor]=useState<string|null>(null);
 const sessionId=available.some(s=>s.session.id===selected)?selected:available[0]?.session.id??'';
 const anchor=chosenAnchor??available.find(s=>s.session.id===sessionId)?.day??'';
 useEffect(()=>{if(!available.some(s=>s.session.id===selected))setSelected(available[0]?.session.id??'');},[available,selected]);
 const result=useMemo(()=>completedMuscleSummary(history,mode==='session'?{sessionId}:{weekOf:anchor}),[history,mode,sessionId,anchor]);
 const end=result.week?new Date(Date.parse(result.week.end+'T12:00:00Z')-86400000).toISOString().slice(0,10):'';
 const label=mode==='week'&&result.week?`${result.week.start} – ${end}`:result.sessions[0]?.day??'';
 const contextKey=mode+':'+(mode==='week'?anchor:sessionId)+':'+result.sessions.map(s=>s.session.id+'@'+s.session.version).join('|');
 const roleLabels={primary:he?'עיקרי':'Primary',secondary:he?'מסייע':'Assisting',stabilizer:he?'מייצב':'Stabilizing'};
 return <div className="completed-muscle-map care-stack" dir={he?'rtl':'ltr'} data-no-translate>
  <h2>{he?'מפת עבודה שבוצעה':'Completed muscle work'}</h2>
  <p className="care-muted">{he?'הסיכום מבוסס על היסטוריית האימונים שנטענה — עד 50 אימונים אחרונים. אין כאן ספירה של אימונים שלא תועדו.':'Based on the loaded history — up to 50 recent workouts. Workouts that were not recorded are not counted.'}</p>
  <label>{he?'תקופת הסיכום':'Summary scope'}<select value={mode} onChange={e=>setMode(e.target.value)}><option value="session">{he?'אימון בודד':'Single workout'}</option><option value="week">{he?'שבוע ביצוע':'Performed week'}</option></select></label>
  {mode==='session'?<label>{he?'בחירת אימון שבוצע':'Completed workout'}<select value={sessionId} onChange={e=>{setSelected(e.target.value);setAnchor(null);}}>{available.map(({session,day},i)=><option key={session.id} value={session.id}>{day} · {he?'אימון':'Workout'} {i+1}</option>)}</select></label>:<label>{he?'תאריך בשבוע המבוקש':'Date within the week'}<input type="date" value={anchor} onChange={e=>setAnchor(e.target.value)}/></label>}
  <p>{he?'לפי מועד הביצוע בישראל; השבוע מיום ראשון עד שבת. תיעוד בדיעבד משויך לתאריך הביצוע ולא לתאריך ההזנה.':'By performed date in Israel; weeks run Sunday through Saturday. Retrospective logs use the performed date, not the upload date.'}</p>
  {label&&<h3>{label}</h3>}
  {result.invalidDates>0&&<p role="status">{he?`${result.invalidDates} רשומות עם תאריך לא תקין אינן נכללות.`:`${result.invalidDates} records with invalid dates are excluded.`}</p>}
  {!result.sessions.length?<p role="status">{mode==='week'?(he?'אין אימונים שהושלמו בשבוע הזה.':'No completed workouts in this week.'):(he?'אין אימונים שהושלמו להצגה.':'No completed workouts to display.')}</p>:<>
   <p>{he?`${result.sessions.length} אימונים שהושלמו · ${result.actualItems.reduce((n,i)=>n+i.sets,0)} סטי עבודה מסומנים`:`${result.sessions.length} completed workouts · ${result.actualItems.reduce((n,i)=>n+i.sets,0)} marked working sets`}</p>
   {result.excluded>0&&<p>{he?'חימום, מתיחות ואירובי אינם נספרים.':'Warmup, stretches and cardio are excluded.'}</p>}
   {result.invalidResults>0&&<p role="status">{he?`${result.invalidResults} רשומות תרגיל עם פירוט סטים לא תקין אינן נספרות.`:`${result.invalidResults} exercises with invalid set records are excluded.`}</p>}
   <WorkoutMuscleMapContent key={contextKey} items={result.actualItems} days={result.days} initialDay="week" completedView={{label}} language={language}/>
   {!result.comparisonAvailable?<p role="status">{he?'השוואה לתכנון אינה זמינה: חסר תכנון היסטורי מלא או מיפוי תקין. הביצוע מוצג בנפרד; התוכנית הנוכחית אינה משמשת כתחליף.':'Historical plan comparison is unavailable: a complete historical prescription or valid mapping is missing. Actual work is shown separately; the current program is never used as a substitute.'}</p>:<div className="workout-muscle-table" tabIndex={0} role="region" aria-label={he?'תכנון מול ביצוע לפי שריר ותפקיד':'Planned versus completed by muscle and role'}><table><caption>{he?'תכנון שנשמר עם האימונים מול סטים שבוצעו. ההפרש הוא ביצוע פחות תכנון, ללא איחוד בין תפקידים.':'Planned snapshots versus completed sets. Difference is completed minus planned; roles are never combined.'}</caption><thead><tr>{[he?'שריר':'Muscle',he?'תפקיד':'Role',he?'תכנון':'Planned',he?'ביצוע':'Completed',he?'הפרש':'Difference'].map(title=><th scope="col" key={title}>{title}</th>)}</tr></thead><tbody>{result.comparison.flatMap(row=>roles.filter(role=>row.planned[role]||row.actual[role]).map(role=><tr key={row.key+role}><th scope="row">{exerciseMuscleName({...row,role},language)}</th><td>{roleLabels[role]}</td><td>{row.planned[role]}</td><td>{row.actual[role]}</td><td><bdi dir="ltr">{row.delta[role]<0?'−'+Math.abs(row.delta[role]):row.delta[role]>0?'+'+row.delta[role]:'0'}</bdi></td></tr>))}</tbody></table></div>}
  </>}
 </div>;
}
