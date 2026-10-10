'use client';
import {Localize} from "../components/language-provider";
import {useState} from 'react';
import type {TrainingFeed} from '../lib/training';
import type {WellnessBundle} from '../lib/wellness';
import {progressTimeline,filterProgress,type ProgressCategory} from '../lib/progress-timeline';
import {useCareResource} from '../hooks/use-care';
export function ProgressTimeline({feed,go,clientId}:{feed:TrainingFeed;go?:(section:string)=>void;clientId?:string}){
 const resource=useCareResource<WellnessBundle>('/api/wellness'+(clientId?'?client='+encodeURIComponent(clientId):''));
 const [category,setCategory]=useState<ProgressCategory|'all'>('all'),[from,setFrom]=useState(''),[to,setTo]=useState(''),[limit,setLimit]=useState(20);
 const invalid=!!from&&!!to&&from>to;
 const events=invalid?[]:filterProgress(progressTimeline(feed,resource.data?.records??[]),category,from,to);
 return <Localize>{<section className="panel care-form progress-timeline" aria-labelledby="progress-timeline-title"><div className="section-heading compact"><div><h2 id="progress-timeline-title">{clientId?'התקדמות המתאמן במקום אחד':'הדרך שלך במקום אחד'}</h2><p>אימונים, תזונה, מוכנות וכאב לפי תאריך הדיווח.</p></div><button className="text-button" disabled={resource.loading} onClick={resource.reload}>רענון מדידות</button></div>
 <div className="care-grid three"><label className="care-field">תחום<select value={category} onChange={e=>{setCategory(e.target.value as ProgressCategory|'all');setLimit(20);}}>{[['all','כל התחומים'],['training','אימונים'],['nutrition','תזונה ומדידות'],['recovery','כאב וטווח תנועה'],['readiness','מוכנות']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label className="care-field">מתאריך<input type="date" value={from} onChange={e=>{setFrom(e.target.value);setLimit(20);}}/></label><label className="care-field">עד תאריך<input type="date" value={to} onChange={e=>{setTo(e.target.value);setLimit(20);}}/></label></div>
 {invalid&&<p role="alert">תאריך ההתחלה צריך להיות לפני תאריך הסיום.</p>}
 {resource.loading&&<p role="status">טוענים מדידות ודיווחים…</p>}
 {resource.error&&<p role="alert">{resource.error} {resource.data?'מוצגים הדיווחים האחרונים שנטענו.':'כרגע מוצגים רק נתוני האימונים הזמינים.'}</p>}
 {clientId&&<p className="care-muted">מוצגים רק הדיווחים הזמינים להרשאה שלך. סיכום תזונה משותף אינו מעניק גישה למדידות ולשאלון המלאים.</p>}
 <p className="care-muted">התצוגה כוללת עד 50 אימונים ו־730 רשומות מדידה אחרונות שנשמרו. היעדר דיווח אינו ערך אפס. המדידות אינן קובעות כשירות לאימון.</p>
 {!invalid&&!events.length&&!resource.loading&&<p className="care-empty">אין דיווחים להצגה בטווח ובתחום שנבחרו.</p>}
 <ol className="progress-events">{events.slice(0,limit).map(event=><li key={event.id}><article><time dateTime={event.day}>{event.day}</time><h3>{event.title}</h3><ul>{event.details.map((detail,i)=><li key={i}>{detail}</li>)}</ul>{go&&<button className="text-button" onClick={()=>event.destination==='history'?document.getElementById('workout-history-list')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}):go(event.destination)}>לפרטים ולמעקב</button>}</article></li>)}</ol>
 {events.length>limit&&<button className="button secondary" onClick={()=>setLimit(n=>n+20)}>הצגת דיווחים נוספים ({events.length-limit})</button>}
 </section>}</Localize>;
}
