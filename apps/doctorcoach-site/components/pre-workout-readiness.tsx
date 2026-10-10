'use client';
import {Localize} from "../components/language-provider";
import {useState} from 'react';
import {useCareResource} from '../hooks/use-care';
import type {WellnessBundle} from '../lib/wellness';
import {RecordForm} from './wellness-workspace';

export function PreWorkoutReadiness({disabled,onPending}:{disabled:boolean;onPending:(pending:boolean)=>void}){
 const resource=useCareResource<WellnessBundle>('/api/wellness');
 const [editing,setEditing]=useState(false);
 const [saving,setSaving]=useState(false);
 const bundle=resource.data;
 const record=bundle?.records.find(r=>r.kind==='readiness'&&r.day===bundle.today);
 const edit=(value:boolean)=>{setEditing(value);onPending(value);};
 return <Localize>{<section className="care-form" aria-label="מוכנות לפני האימון">
  <h3>איך מגיעים לאימון היום?</h3>
  <p className="care-muted">דיווח יומי אופציונלי על שינה, אנרגיה ועומס. הדיווח השמור של היום יצורף לאימון בעת פתיחתו ויהיה גלוי לצוות המשויך לפי הרשאותיו. עדכון יומי מאוחר יותר לא ישנה את הדיווח שצורף לאימון.</p>
  {resource.loading&&<p role="status">טוענים את הדיווח של היום…</p>}
  {resource.error&&<div><p className="care-error" role="alert">{resource.error}</p><button type="button" className="text-button" disabled={disabled} onClick={resource.reload}>ניסיון טעינה נוסף</button></div>}
  {!editing&&bundle&&<>
   {record?<p>נשמר היום: {String(record.data.sleep)} שעות שינה · אנרגיה {String(record.data.energy)}/10 · עומס מורגש {String(record.data.stress)}/10</p>:<p className="care-muted">טרם נשמר דיווח מוכנות להיום.</p>}
   <button type="button" className="button secondary" disabled={disabled||resource.loading} onClick={()=>edit(true)}>{record?'עדכון הדיווח של היום':'מילוי דיווח מוכנות'}</button>
  </>}
  {editing&&bundle&&<>
   <RecordForm key={`${record?.id??bundle.today}-${record?.version??0}`} kind="readiness" record={record} day={bundle.today} title="מוכנות היום" onBusy={setSaving} onSaved={data=>{resource.setData(data);setSaving(false);edit(false);}}/>
   <p className="care-muted">לפני התחלת האימון שמרו את הדיווח, או סגרו אותו ללא שמירת השינויים.</p>
   <button type="button" className="text-button" disabled={saving} onClick={()=>{edit(false);void resource.reload();}}>ביטול השינויים וטעינת הדיווח השמור</button>
  </>}
 </section>}</Localize>;
}
