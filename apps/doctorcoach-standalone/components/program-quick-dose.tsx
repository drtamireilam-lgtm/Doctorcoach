'use client';
import type {ReactNode} from 'react';
import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {unitMax,type PlanItem} from '../lib/training';
import {planItemKey,workoutDayId} from '../lib/workout-days';
import {exercises} from '../lib/content';
import {effortName} from '../lib/effort';
import {quickDoseBlocked,quickDosePatch,quickDoseSignature,quickDoseValue,type QuickDoseField} from '../lib/program-quick-dose';
import {setProgramDraftDirty,removeProgramDraft} from '../lib/program-draft-navigation';
import {useLanguage} from './language-provider';
type Buffer={text:string;base:string;error?:string};
type Props={items:PlanItem[];onChange:(occurrenceKey:string,patch:Partial<PlanItem>)=>void;disabled?:boolean;renderActions?:(item:PlanItem)=>ReactNode;onDirtyChange?:(dirty:boolean)=>void};
const fields:QuickDoseField[]=['sets','reps','rest','effort'];
function QuickDoseRow({item,onChange,disabled,onDirty,renderActions}:{renderActions?:Props['renderActions'];item:PlanItem;onChange:Props['onChange'];disabled:boolean;onDirty:(key:string,dirty:boolean)=>void}){
 const en=useLanguage().language==='en',t=(he:string,eng:string)=>en?eng:he;
 const key=planItemKey(item),rowKey=`${workoutDayId(item)}:${key}:${item.exerciseId}`;
 const [buffers,setBuffers]=useState<Partial<Record<QuickDoseField,Buffer>>>({});
 const pending=useRef<Partial<Record<QuickDoseField,Buffer>>>({});
 const title=item.customExercise?.name??(en?exercises.find(e=>e.id===item.exerciseId)?.en:exercises.find(e=>e.id===item.exerciseId)?.name)??item.exerciseId;
 useEffect(()=>{onDirty(rowKey,Object.keys(pending.current).length>0);return()=>onDirty(rowKey,false);},[onDirty,rowKey]);
 function change(field:QuickDoseField,text:string){const next={...pending.current,[field]:{text,base:pending.current[field]?.base??quickDoseSignature(item,field)}};pending.current=next;setBuffers(next);onDirty(rowKey,true);}
 function reset(field:QuickDoseField){const next={...pending.current};delete next[field];pending.current=next;setBuffers(next);onDirty(rowKey,Object.keys(next).length>0);}
 function commit(field:QuickDoseField){const buffer=pending.current[field];if(!buffer||disabled)return;
  if(buffer.base!==quickDoseSignature(item,field)){setBuffers(old=>({...old,[field]:{...buffer,error:t('המינון השתנה בזמן העריכה. אפסו את השדה לפני עריכה מחדש.','This prescription changed while editing. Reset this field before editing again.')}}));return;}
  try{const patch=quickDosePatch(item,field,buffer.text);onChange(key,patch);reset(field);}catch{setBuffers(old=>({...old,[field]:{...buffer,error:field==='rest'?t('הזינו 0–1800 שניות, דקות מפורשות או דקות:שניות. שדה ריק = לא צוין.','Enter 0–1800 seconds, explicit minutes or mm:ss. Blank means unspecified.'):field==='effort'?t('בחרו יעד בחצאי נקודה בטווח המוצג, או השאירו ריק.','Enter a half-point target within the displayed range, or leave blank.'):t(`הזינו מספר שלם בין 1 ל־${field==='sets'?20:item.unit==='reps'?item.repsMax??unitMax[item.unit]:unitMax[item.unit]}.`,`Enter a whole number from 1 to ${field==='sets'?20:item.unit==='reps'?item.repsMax??unitMax[item.unit]:unitMax[item.unit]}.`)}}));}
 }
 return <article className="panel care-form" data-quick-occurrence={key} style={{minWidth:0,padding:'0.85rem'}}><strong dir="auto">{title}</strong><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,8rem),1fr))',gap:'0.65rem'}}>{fields.map(field=>{
  const blocked=quickDoseBlocked(item,field),buffer=buffers[field],conflict=buffer&&buffer.base!==quickDoseSignature(item,field);
  const label=field==='sets'?t('סטים','Sets'):field==='reps'?(item.unit==='seconds'?t('משך (שניות)','Duration (seconds)'):item.unit==='minutes'?t('משך (דקות)','Duration (minutes)'):t(item.repsMax!=null?'חזרות — מינימום':'חזרות',item.repsMax!=null?'Repetitions — minimum':'Repetitions')):field==='rest'?t('מנוחה (שניות)','Rest (seconds)'):`${effortName(item.effortScale)} ${t('יעד','target')}`;
  const name=`${label} · ${title} · ${key}`;
  return <div key={field} className="care-form" style={{minWidth:0,gap:'0.3rem',alignContent:'start'}}><label className="care-field">{label}<input type="text" inputMode={field==='effort'?'decimal':field==='rest'?'text':'numeric'} aria-label={name} data-quick-field={field} value={buffer?.text??quickDoseValue(item,field)} disabled={disabled||blocked} aria-invalid={!!buffer?.error||!!conflict} placeholder={field==='effort'?(item.effortScale==='rir'?'0–9':'1–10'):undefined} onChange={e=>change(field,e.target.value)} onBlur={()=>commit(field)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();commit(field);}}} style={{width:'100%',minWidth:0}}/></label>{blocked&&<small>{t('מינון לפי סט — ערכו בנפרד בהגדרות המתקדמות.','Per-set prescription — edit individually in advanced settings.')}</small>}{field==='reps'&&item.unit==='reps'&&item.repsMax!=null&&!blocked&&<small>{t(`הגבול העליון ${item.repsMax} נשמר.`,`Upper bound ${item.repsMax} is retained.`)}</small>}{field==='rest'&&<small>{t('0 = ללא מנוחה; ריק = לא צוין. אפשר גם 1.5 min או 1:30.','0 = no rest; blank = unspecified. Also accepts 1.5 min or 1:30.')}</small>}{(buffer?.error||conflict)&&<small role="alert">{buffer?.error??t('השדה השתנה בזמן העריכה. אפסו לפני שמירה.','This field changed while editing. Reset before saving.')}</small>}{buffer&&<button type="button" className="text-button" disabled={disabled} onPointerDown={e=>e.preventDefault()} onMouseDown={e=>e.preventDefault()} onClick={()=>reset(field)}>{t('איפוס השדה לערך העדכני','Reset field to current value')}</button>}</div>;
 })}</div>{renderActions?.(item)}</article>;
}
export function ProgramQuickDose({items,onChange,disabled=false,onDirtyChange,renderActions}:Props){
 const en=useLanguage().language==='en',token=useRef<object>({}),dirtyRows=useRef(new Set<string>()),notify=useRef(onDirtyChange);
 useLayoutEffect(()=>{notify.current=onDirtyChange;},[onDirtyChange]);
 const [dirty,setDirty]=useState(false),active=useRef(true);
 const onDirty=useCallback((key:string,value:boolean)=>{if(!active.current)return;if(value)dirtyRows.current.add(key);else dirtyRows.current.delete(key);const next=dirtyRows.current.size>0;setProgramDraftDirty(token.current,next);setDirty(next);notify.current?.(next);},[]);
 useLayoutEffect(()=>{setProgramDraftDirty(token.current,dirty);},[dirty]);
 useLayoutEffect(()=>{active.current=true;const ownToken=token.current;return()=>{active.current=false;removeProgramDraft(ownToken);notify.current?.(false);};},[]);
 const eligible=items.filter(i=>!i.cardio&&['reps','seconds','minutes'].includes(i.unit));
 return <section className="care-form" aria-label={en?'Quick program dose':'עריכת מינון מהירה'}><p className="care-muted">{en?'Edit a field, then press Enter or leave it to apply. Changes remain in this program draft.':'ערכו שדה ולחצו Enter או צאו ממנו כדי להחיל. השינויים נשארים בטיוטת התוכנית.'}</p>{eligible.map(item=><QuickDoseRow key={`${workoutDayId(item)}:${planItemKey(item)}:${item.exerciseId}`} item={item} onChange={onChange} disabled={disabled} onDirty={onDirty} renderActions={renderActions}/>)}{eligible.length!==items.length&&<p className="care-muted">{en?'Cardio remains available in advanced exercise settings.':'אירובי ניתן לעריכה בהגדרות המתקדמות של התרגיל.'}</p>}</section>;
}
