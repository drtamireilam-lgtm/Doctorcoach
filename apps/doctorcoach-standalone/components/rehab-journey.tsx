'use client';
import {Localize} from "../components/language-provider";
import {useState} from 'react';
import {rehabStages,readMilestones,milestoneStatus,type RehabMilestone} from '../lib/rehab-journey';
import type {WellnessBundle,WellnessRecord} from '../lib/wellness';
import {careRequest,useCareAction} from '../hooks/use-care';
import {CareConfirm,CareFeedback,CareSelect,careDate} from './care-ui';
import {requestId} from '../lib/request-id';
export function RehabJourney({record,canEdit,today,clientId,episodeId,onSaved}:{record?:WellnessRecord;canEdit:boolean;today:string;clientId?:string;episodeId?:string;onSaved:(data:WellnessBundle)=>void}){
 const [id]=useState(()=>record?.id??requestId());
 const [stage,setStage]=useState(String(record?.data.stage??rehabStages[0]));
 const [goal,setGoal]=useState(String(record?.data.goal??'')),[criteria,setCriteria]=useState(String(record?.data.criteria??'')),[limits,setLimits]=useState(String(record?.data.limits??''));
 const [milestones,setMilestones]=useState(()=>readMilestones(record?.data.milestones));
 const [confirm,setConfirm]=useState(false);const action=useCareAction();
 const visible=canEdit?milestones:readMilestones(record?.data.milestones),current=canEdit?stage:String(record?.data.stage??'');
 const edit=(id:string,patch:Partial<RehabMilestone>)=>setMilestones(rows=>rows.map(row=>row.id===id?{...row,...patch}:row));
 const save=async()=>{const result=await action.run(()=>careRequest<WellnessBundle>('/api/wellness',{id,kind:'return',day:today,clientId,version:record?.version??0,data:{episodeId,stage,goal,criteria,limits,milestones:JSON.stringify(milestones)}}),'מסלול השיקום נשמר.');if(result){setConfirm(false);onSaved(result);}};
 return <Localize>{<section className="panel care-form rehab-journey"><h2>מסלול החזרה לפעילות</h2><p className="inline-note">השלב ואישור אבני הדרך נקבעים על ידי הרופא המשויך. השגת אבן דרך אינה מעבירה שלב אוטומטית ואינה מבטלת מגבלה או בירור רפואי.</p>
 {!record&&!canEdit?<p className="care-empty">הרופא המשויך יוכל להוסיף כאן את שלבי הדרך והיעדים האישיים שלך.</p>:<>
 <ol className="rehab-stage-list" aria-label="שלבי מסלול השיקום">{rehabStages.map(s=><li key={s} aria-current={current===s?'step':undefined}><strong>{s}</strong><span>{current===s?'השלב שנבחר':''}</span></li>)}</ol>
 {record&&<p className="care-muted">עדכון אחרון: {record.authorName} · {careDate(record.updatedAt)}</p>}
 {canEdit?<form onSubmit={e=>{e.preventDefault();setConfirm(true);}}><fieldset disabled={action.busy}>
 <CareSelect label="שלב נוכחי — בחירת הרופא" value={stage} onChange={setStage} options={rehabStages.map(s=>({value:s,label:s}))}/>
 {([['יעד אישי',goal,setGoal,1500],['תנאים להתקדמות בין שלבים',criteria,setCriteria,3000],['מגבלות והנחיות',limits,setLimits,3000]] as const).map(([label,value,set,max])=><label className="care-field" key={label}>{label}<textarea value={value} required={label!=='מגבלות והנחיות'} minLength={label!=='מגבלות והנחיות'?2:undefined} maxLength={max} rows={3} onChange={e=>set(e.target.value)}/></label>)}
 <h3>אבני דרך אישיות</h3><p className="care-muted">הגדירו תנאי מדיד לכל אבן דרך. אפשר להשאיר את הרשימה ריקה אם טרם הוגדרה. סימון ״אושר שהושג״ הוא החלטת הרופא, לא חישוב של האפליקציה.</p>
 {milestones.map(m=><div className="rehab-milestone" key={m.id}><label className="care-field">שם אבן הדרך<input required minLength={2} maxLength={150} value={m.label} onChange={e=>edit(m.id,{label:e.target.value})}/></label><CareSelect label="שלב משויך" value={m.stage} onChange={stage=>edit(m.id,{stage})} options={rehabStages.map(s=>({value:s,label:s}))}/><label className="care-field">תנאי לאישור<textarea required minLength={2} maxLength={1000} value={m.criteria} onChange={e=>edit(m.id,{criteria:e.target.value})}/></label><CareSelect label="אישור הרופא" value={m.status} onChange={status=>edit(m.id,{status:status as RehabMilestone['status']})} options={Object.entries(milestoneStatus).map(([value,label])=>({value,label}))}/><button type="button" className="text-button" onClick={()=>setMilestones(rows=>rows.filter(row=>row.id!==m.id))}>הסרת אבן הדרך מהטיוטה</button></div>)}
 <div className="care-actions"><button type="button" className="button secondary" disabled={milestones.length>=12} onClick={()=>setMilestones(rows=>[...rows,{id:requestId(),stage,label:'',criteria:'',status:'pending'}])}>הוספת אבן דרך</button><button className="button primary" type="submit">בדיקה ושמירת המסלול</button></div>
 </fieldset></form>:<><dl className="care-definition"><dt>היעד שלך</dt><dd>{String(record?.data.goal??'')}</dd><dt>תנאים להתקדמות</dt><dd>{String(record?.data.criteria??'')}</dd><dt>מגבלות והנחיות</dt><dd>{String(record?.data.limits??'')||'לא נוספו הנחיות בשדה זה; אין בכך אישור לפעילות.'}</dd></dl><h3>אבני הדרך שלך</h3>{!visible.length&&<p className="care-muted">טרם הוגדרו אבני דרך אישיות.</p>}{visible.map(m=><article className="rehab-milestone" key={m.id}><span className="care-pill">{milestoneStatus[m.status]}</span><h3>{m.label}</h3><p>{m.stage} · {m.criteria}</p></article>)}</>}
 </>}
 <CareFeedback {...action}/><CareConfirm open={confirm} onClose={()=>setConfirm(false)} busy={action.busy} title="לשמור את מסלול השיקום?" description={`שלב נוכחי: ${stage}. ${milestones.filter(m=>m.status==='met').length} אבני דרך מסומנות כהושגו. התוכנית תוצג למתאמן ולצוות המשויך. שינוי זה אינו מסיר חסימה רפואית ואינו משנה את תוכנית האימון.`} label="אישור ושמירת המסלול" onConfirm={save}/>
 </section>}</Localize>;
}
