import {Localize} from "../components/language-provider";
import type {ReturnPlanRevision} from '../lib/wellness';
import {readMilestones,milestoneStatus} from '../lib/rehab-journey';
import {careDate} from './care-ui';
export function RehabHistory({history,total}:{history:ReturnPlanRevision[];total:number}){
 return <Localize>{<section className="panel care-form"><h2>היסטוריית מסלול השיקום</h2><p className="care-muted">{history.length} מתוך {total} גרסאות מתועדות · עד 50 אחרונות. התיעוד מתחיל בהוספת המנגנון; שינויים ישנים אינם משוחזרים.</p>
 {!history.length?<p>הגרסאות יופיעו כאן לאחר שמירת המסלול. התוכנית הנוכחית מוצגת מעל.</p>:<div className="care-stack">{history.map((r,index)=>{
  const previous=history[index+1],stage=String(r.data.stage??''),older=previous?String(previous.data.stage??''):null;
  return <details key={r.id} className="rehab-history-item"><summary><strong>גרסה {r.version} · {stage}</strong><span>{r.authorName} · {careDate(r.updatedAt)}</span></summary>
   {r.baseline?<p className="inline-note">נקודת התחלת התיעוד: המצב שנשמר לפני העדכון הראשון במנגנון החדש. אין מידע על המעברים שקדמו לו.</p>:older&&older!==stage?<p>מעבר שתועד: {older} ← {stage}</p>:<p>גרסה שנשמרה; {older?'השלב לא השתנה.':'הגרסה הקודמת אינה מוצגת כאן.'}</p>}
   <dl className="care-definition"><dt>יעד</dt><dd>{String(r.data.goal??'')}</dd><dt>תנאים להתקדמות</dt><dd>{String(r.data.criteria??'')}</dd><dt>מגבלות והנחיות</dt><dd>{String(r.data.limits??'')||'לא נמסרו בשדה זה.'}</dd></dl>
   <h3>אבני הדרך בגרסה זו</h3>{readMilestones(r.data.milestones).map(m=><article key={m.id}><strong>{m.label} · {milestoneStatus[m.status]}</strong><p>{m.stage} · {m.criteria}</p></article>)}
  </details>;
 })}</div>}
 </section>}</Localize>;
}
