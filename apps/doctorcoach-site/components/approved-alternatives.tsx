'use client';
import {Localize} from "../components/language-provider";
import {exercises} from '../lib/content';
import {defaultPrescription, type PlanItem} from '../lib/training';
import {CareSelect} from './care-ui';

export function ApprovedAlternatives({item,onChange}:{item:PlanItem;onChange:(ids:string[])=>void}) {
 const selected=item.approvedSubstitutions??[];
 const choices=exercises.filter(e=>e.id!==item.exerciseId&&!selected.includes(e.id)&&defaultPrescription(e.id).unit===item.unit);
 return <Localize>{<div className="care-form">
  <strong>חלופות מאושרות למתאמן · אופציונלי</strong>
  <p className="care-muted">רק החלופות שבחרת יהיו זמינות באימון. הסטים, הכמות ויעד המאמץ נשמרים; המשקל מתאפס. יש לוודא שהמינון מתאים לכל חלופה. שינוי יחידת המידה מנקה את הבחירה.</p>
  {selected.map(id=><div className="care-row" key={id}><span>{exercises.find(e=>e.id===id)?.name}</span><button type="button" className="text-button" aria-label={`הסרת חלופה ${exercises.find(e=>e.id===id)?.name}`} onClick={()=>onChange(selected.filter(v=>v!==id))}>הסרה</button></div>)}
  {selected.length<10&&choices.length>0&&<CareSelect label="הוספת חלופה מאושרת" value="" onChange={id=>{if(choices.some(e=>e.id===id))onChange([...selected,id]);}} options={choices.map(e=>({value:e.id,label:e.name}))}/>}
  {!selected.length&&<p className="care-muted">ללא חלופות — המתאמן מבצע את התרגיל שהוקצה בלבד.</p>}
 </div>}</Localize>;
}
