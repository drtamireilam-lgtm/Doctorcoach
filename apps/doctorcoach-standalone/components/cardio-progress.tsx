'use client';
import {useSyncExternalStore} from 'react';
import type {TrainingSession} from '../lib/training';
import {cardioActivity} from '../lib/cardio';
import {cardioProgressSummary} from '../lib/cardio-progress';
import {useLanguage} from './language-provider';

const subscribeTimezone=()=>()=>{};
const browserTimezone=()=>Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
const serverTimezone=()=>'UTC';

export function CardioProgress({history}:{history:TrainingSession[]}){
 const {language}=useLanguage(),en=language==='en',t=(he:string,english:string)=>en?english:he;
 const timezone=useSyncExternalStore(subscribeTimezone,browserTimezone,serverTimezone);
 const summary=cardioProgressSummary(history,{timezone}),number=(n:number|null|undefined)=>n==null?'—':new Intl.NumberFormat(en?'en-US':'he-IL',{maximumFractionDigits:1}).format(n),name=(id:string)=>{const a=cardioActivity(id);return (en?a?.nameEn:a?.name)??id;};
 const weeks=summary.weeks.slice(-8),latest=weeks.at(-1);
 const paceUnit=(unit:string)=>unit==='seconds/500m'?t('שניות ל־500 מטר','sec/500m'):unit==='seconds/100m'?t('שניות ל־100 מטר','sec/100m'):t('שניות לק״מ','sec/km');
 return <section className="panel cardio-progress" data-no-translate dir={en?'ltr':'rtl'}><h2>{t('התקדמות באירובי','Cardio progress')}</h2>
  <p className="care-muted">{t('לפי ההיסטוריה שנטענה (עד 50 אימונים). השבוע מתחיל ביום ראשון. זמן מקומי:','Based on loaded history (up to 50 sessions). Weeks start Sunday. Timezone:')} {timezone}. {t('היעדר מדידה אינו אפס. ללא תוכנית שבועית לא מוצגים אימונים שהוחמצו.','An absent measurement is not zero. Missed sessions are not inferred without a weekly plan.')}</p>
  {!latest?<p>{t('אימוני אירובי שהושלמו עם תאריך תקין יופיעו כאן.','Completed cardio sessions with valid timestamps will appear here.')}</p>:<>
   <h3>{t('השבוע האחרון עם נתונים · החל מ־','Latest observed week · from ')}{latest.week}</h3>
   <p>{number(latest.sessions)} {t('אימונים עם אירובי שהושלם','sessions with completed cardio')} · {number(latest.minutes)} {t('דקות שתועדו','recorded minutes')}</p>
   <div className="table-scroll"><table className="weekly-table"><caption>{t('לפי פעילות בשבוע המוצג','By activity in the displayed week')}</caption><thead><tr>{[t('פעילות','Activity'),t('אימונים','Sessions'),t('דקות שתועדו','Recorded minutes'),t('מרחק שתועד (מ׳)','Recorded distance (m)'),t('מדידות מרחק / פעילויות','Distance measurements / activities')].map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{latest.activities.map(a=><tr key={a.activityId}><th scope="row">{name(a.activityId)}</th><td>{number(a.sessions)}</td><td>{number(a.minutes)}</td><td>{number(a.distanceMeters)}</td><td>{a.distanceObservations}/{a.observations}</td></tr>)}</tbody></table></div>
   <h3>{t('גרפים שבועיים לפי פעילות','Weekly graphs by activity')}</h3>
   <p className="care-muted">{t('עד שמונה שבועות עם נתונים. שבוע ללא פעילות מתועדת מוצג כלא ידוע. ספירת אימונים היא לפי אימון ייחודי, לא לפי מספר מקטעים.','Up to eight observed weeks. Weeks without recorded activity remain unknown. Session counts use distinct workouts, not segments.')}</p>
   <div className="cardio-activity-graphs">{summary.activities.map(activity=><article className="cardio-activity-graph" key={activity.activityId}><h4>{name(activity.activityId)}</h4>{(['minutes','distanceMeters','sessions'] as const).map(metric=>{
    const label=metric==='minutes'?t('דקות שתועדו','Recorded minutes'):metric==='distanceMeters'?t('מרחק שתועד (מ׳)','Recorded distance (m)'):t('אימונים שהושלמו','Completed sessions');
    const values=weeks.map(w=>({week:w.week,value:w.activities.find(a=>a.activityId===activity.activityId)?.[metric]??null})),max=Math.max(1,...values.map(v=>v.value??0));
    return <figure className="cardio-week-bars" key={metric}><figcaption>{label}</figcaption><ol>{values.map(({week,value})=><li key={week}><span className="cardio-week-label">{week}</span><span className="cardio-bar-track" aria-hidden="true">{value!==null&&<span className="cardio-bar-fill" style={{width:`${value/max*100}%`}}/>}</span><span className="cardio-bar-value">{value===null?t('לא נמדד','Unknown'):number(value)}</span></li>)}</ol></figure>;
   })}</article>)}</div>
  </>}
  <details className="cardio-comparisons" open={summary.comparisons.length>0}><summary>{t('השוואה בין שבועות במאמץ דומה','Week-over-week comparison at similar effort')}</summary><p className="care-muted">{t('השוואה תצפיתית בלבד; אינה מוכיחה שינוי בכושר או סיבה לשינוי. נדרשים לפחות שני אימונים נפרדים עם מדידה בכל שבוע עוקב, באותה פעילות, מרחק, RPE והקשר מדידה. בהשוואת דופק גם הקצב או המהירות חייבים להיות זהים.','Observational only; this does not establish a fitness change or its cause. At least two distinct measured sessions in each adjacent week are required, with matching activity, distance, RPE and measurement context. Heart-rate comparisons also require matching pace or speed.')}</p>
   {!summary.comparisons.length?<p>{t('אין מספיק מדידות תואמות להשוואה בין שבועות.','There are not enough matching measurements for a week-over-week comparison.')}</p>:<ul>{summary.comparisons.map(c=><li key={c.metric+c.contextKey+c.week}><strong>{name(c.activityId)} · {c.metric==='paceSeconds'?t('קצב','Pace'):t('דופק ממוצע','Average heart rate')}</strong><p>{c.previousWeek} → {c.week}: {number(c.previous)} → {number(c.current)} {c.metric==='paceSeconds'?paceUnit(c.paceUnit):t('פעימות לדקה','bpm')} ({c.change>0?'+':''}{number(c.change)})</p><p className="care-muted">{number(c.distanceMeters)} {t('מטרים','meters')} · RPE {number(c.rpe)} · {c.previousObservations}/{c.currentObservations} {t('מדידות בשבוע הקודם / הנוכחי','measurements in previous / current week')}</p></li>)}</ul>}
  </details>
  {summary.rows.length>0&&<details><summary>{t('מדידות לפי אימון','Measurements by session')}</summary><div className="table-scroll"><table className="weekly-table"><thead><tr>{[t('תאריך מקומי','Local date'),t('פעילות','Activity'),t('קצב שנמדד','Measured pace'),t('RPE','RPE'),t('דופק','Heart rate')].map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{summary.rows.map(({session,item,p,r,day},index)=><tr key={session.id+':'+(item.occurrenceId??item.exerciseId)+':'+index}><td>{day}</td><td>{name(p.activityId)}</td><td>{number(r.metrics.paceSeconds)} {r.metrics.paceSeconds===undefined?'':paceUnit(cardioActivity(p.activityId)!.paceUnit)}</td><td>{number(r.metrics.rpe)}</td><td>{number(r.metrics.heartRate)}</td></tr>)}</tbody></table></div></details>}
 </section>;
}
