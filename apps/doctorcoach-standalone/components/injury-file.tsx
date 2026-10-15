'use client';
import {Localize} from "../components/language-provider";
import {latestEpisodeMeasurement} from '../lib/rehab-measurements';
import {useCareResource} from '../hooks/use-care';
import {CareGate,careDate} from './care-ui';
import {recoveryHref} from '../lib/recovery-navigation';
import type {WellnessBundle} from '../lib/wellness';
export function InjuryFile({context='care'}:{context?:'care'|'plan'}){
 const resource=useCareResource<WellnessBundle>('/api/wellness');
 if(!resource.data)return context==='care'?<Localize>{<CareGate {...resource}/>}</Localize>:resource.error?<Localize>{<p role="alert">לא ניתן לטעון את מסלולי השיקום כרגע. <button className="text-button" onClick={resource.reload}>ניסיון נוסף</button></p>}</Localize>:null;
 const episodes=resource.data.records.filter(r=>r.kind==='episode'&&(context==='care'||r.data.status==='active'));
 const general=resource.data.records.find(r=>r.kind==='return'&&r.slot==='current');
 if(context==='plan'&&!episodes.length&&!general)return null;
 return <Localize>{<section className="panel care-form"><h2>{context==='plan'?'השיקום לצד תוכנית האימון':'פציעות ובעיות שתועדו על ידי הרופא'}</h2>
 {!episodes.length&&context==='care'&&<p className="care-muted">טרם תועדו פציעות נפרדות. המידע שמסרת בשאלון נשאר בשאלון ואינו הופך אוטומטית לאבחנה.</p>}
 {episodes.map(r=>{const plan=resource.data!.records.find(p=>p.kind==='return'&&p.slot===r.id),measurement=latestEpisodeMeasurement(resource.data!.records,r);return <article className="care-note" key={r.id}><h3>{String(r.data.label)}</h3><p>{String(r.data.region)} · {String(r.data.side)} · {r.data.status==='closed'?'מעקב סגור':'במעקב פעיל'}</p>{plan?<><p>שלב שנקבע: {String(plan.data.stage)}</p><small>עדכון המסלול: {plan.authorName} · {careDate(plan.updatedAt)}</small></>:<p className="care-muted">טרם הוגדר מסלול חזרה לפעילות.</p>}<small>פרטי הפציעה: {r.authorName} · {careDate(r.updatedAt)}</small>{measurement?<div><h4>המדידה האחרונה שדיווחת</h4><p><time dateTime={measurement.day}>{measurement.day}</time> · {String(measurement.data.motion)} · {String(measurement.data.response)}</p><dl className="care-definition"><dt>כאב מדווח</dt><dd>{String(measurement.data.pain)}/10</dd><dt>טווח תנועה</dt><dd>{measurement.data.rom===null||measurement.data.rom===undefined?'לא נמדד':String(measurement.data.rom)+'°'}</dd><dt>תפקוד מדווח</dt><dd>{String(measurement.data.functionScore)}/10</dd></dl></div>:<p className="care-muted">טרם דווחה מדידה המקושרת לפציעה זו.</p>}<div className="care-actions"><a className="button secondary" href={recoveryHref({tab:'return',episodeId:r.id,from:context})}>מסלול השיקום וההיסטוריה</a><a className="text-button" href={recoveryHref({tab:'rehab',episodeId:r.id,from:context})}>{r.data.status==='closed'?'צפייה במדידות':'מדידות כאב וטווח תנועה'}</a></div></article>;})}
 {general&&<div className="care-note"><h3>מסלול כללי — ללא קישור לפציעה</h3><p>שלב שנקבע: {String(general.data.stage)}</p><a className="button secondary" href={recoveryHref({tab:'return',from:context})}>פתיחת המסלול הכללי</a></div>}
 <p className="care-muted">המדידה היא דיווח עצמי של תנועה ומועד מסוימים; אין בה הערכת כשירות או אישור להתקדם. המסלול והשלב נקבעים על ידי הרופא. סגירת מעקב אינה אישור לפעילות ואינה משנה את תוכנית האימון.</p></section>}</Localize>;
}
