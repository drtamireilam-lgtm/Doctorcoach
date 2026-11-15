'use client';
import {useRef,useState} from 'react';
import {Plus,Check,Search} from 'lucide-react';
import {filterCoachExercises,equipmentOptions,pickerEquipment} from '../lib/coach-exercise-picker';
import {exerciseFamily} from '../lib/exercise-families';
import {bilingualExerciseName,type NamedExercise} from '../lib/exercise-search';
import {workoutDayLabel} from '../lib/workout-days';
import {CareSelect} from './care-ui';
import {Localize,useLanguage} from './language-provider';
import {coachExerciseSelectionStatus,toggleCoachExerciseSelection} from '../lib/coach-exercise-selection';

export function CoachExercisePicker({items,dayId,selectedIds,totalCount,onAdd,onAddMany}:{items:readonly NamedExercise[];dayId:string;selectedIds:string[];totalCount:number;onAdd:(id:string)=>void;onAddMany?:(ids:string[])=>boolean|void}){
 const [query,setQuery]=useState(''),[group,setGroup]=useState('all'),[equipment,setEquipment]=useState('all'),[family,setFamily]=useState('all'),[page,setPage]=useState(1);
 const en=useLanguage().language==='en',t=(he:string,english:string)=>en?english:he;
 const [selection,setSelection]=useState<{dayId:string;ids:string[]}>({dayId,ids:[]}),[batchError,setBatchError]=useState('');
 const dispatched=useRef(false),queue=selection.dayId===dayId?selection.ids:[],queueStatus=coachExerciseSelectionStatus(queue,totalCount,items.map(item=>item.id));
 // Reset this component's private queue before rendering a different day's controls.
 if(selection.dayId!==dayId){setSelection({dayId,ids:[]});setBatchError('');}
 const choose=(id:string,checked:boolean)=>{
  dispatched.current=false;setBatchError('');
  setSelection(old=>{const ids=old.dayId===dayId?old.ids:[];return {dayId,ids:checked?(ids.includes(id)?ids:toggleCoachExerciseSelection(ids,id,queueStatus.remaining)):ids.filter(value=>value!==id)};});
 };
 const clearSelection=()=>{dispatched.current=false;setSelection({dayId,ids:[]});setBatchError('');};
 const batchFailure=()=>{dispatched.current=false;setBatchError(t('לא נוספו תרגילים. הבחירה נשמרה; בדקו את המקום הפנוי ונסו שוב.','No exercises were added. Your selection is preserved; check the remaining space and retry.'));};
 const addSelected=()=>{
  if(!onAddMany||dispatched.current||!queueStatus.canAdd)return;
  dispatched.current=true;setBatchError('');
  try{if(onAddMany([...queue])===false){batchFailure();return;}setSelection({dayId,ids:[]});}
  catch{batchFailure();}
 };
 const groups=[...new Set(items.map(e=>e.group||e.area||'לא צוין'))].sort((a,b)=>a.localeCompare(b));const families=[...new Set(items.map(exerciseFamily).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
 const results=filterCoachExercises(items,query,group,equipment,family),pages=Math.max(1,Math.ceil(results.length/6)),current=Math.min(page,pages),selected=new Set(selectedIds);
 return <Localize><details className="coach-exercise-picker"><summary><Plus size={20}/> הוספת תרגילים · {workoutDayLabel(dayId)} <span>{selectedIds.length} הופעות תרגילים ביום הזה</span></summary><div className="coach-picker-body"><label className="care-field">חיפוש תרגיל בעברית או באנגלית<div className="search-box"><Search size={18}/><input type="search" dir="auto" maxLength={100} value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}} placeholder="למשל: מקרבים, סקוואט או Leg Press"/></div></label><div className="coach-picker-filters"><CareSelect label="קבוצת שרירים" value={group} onChange={value=>{setGroup(value);setPage(1);}} options={[{value:'all',label:'כל קבוצות השרירים'},...groups.map(value=>({value,label:value}))]}/><CareSelect label="ציוד" value={equipment} onChange={value=>{setEquipment(value);setPage(1);}} options={equipmentOptions}/></div><details><summary>משפחות ווריאציות</summary><CareSelect label="משפחת תרגילים" value={family} onChange={value=>{setFamily(value);setPage(1);}} options={[{value:'all',label:'כל המשפחות והווריאציות'},...families.map(value=>({value,label:value}))]}/></details><div className="care-actions"><p role="status">{results.length} תרגילים בתוצאות · {totalCount}/30 בתוכנית</p><button type="button" className="text-button" onClick={()=>{setQuery('');setGroup('all');setEquipment('all');setFamily('all');setPage(1);}}>ניקוי הסינון</button></div>{totalCount>=30&&<p className="care-muted">התוכנית כוללת 30 תרגילים. הסירו תרגיל כדי להוסיף אחר.</p>}{onAddMany&&<section className="care-form" aria-label={t('תרגילים שנבחרו להוספה','Exercises selected to add')}>
  <p role="status">{t(`נבחרו ${queue.length} תרגילים · נותר מקום ל־${queueStatus.remaining} בתוכנית`,`${queue.length} selected · ${queueStatus.remaining} spaces left in the program`)}</p>
  <p className="care-muted">{t('הבחירה נשמרת כשמשנים חיפוש או סינון. התרגילים יתווספו ליום הנוכחי לפי סדר הבחירה, רק בלחיצה על הוספה.','Selections stay across search and filter changes. Exercises are added to the current day in selection order only when you choose Add selected.')}</p>
  {!!queue.length&&<div className="care-actions">{queue.map(id=>{const exercise=items.find(item=>item.id===id),name=exercise?bilingualExerciseName(exercise):t('תרגיל שאינו זמין','Unavailable exercise');return <button type="button" key={id} className="text-button" aria-label={t('הסרת '+name+' מהבחירה','Remove '+name+' from selection')} onClick={()=>choose(id,false)}><span data-no-translate>{name}</span> ×</button>;})}</div>}
  <div className="care-actions"><button type="button" className="button primary" aria-label={t('הוספת התרגילים שנבחרו','Add selected exercises')} disabled={!queueStatus.canAdd} onClick={addSelected}>{t('הוספת התרגילים שנבחרו','Add selected exercises')} ({queue.length})</button><button type="button" className="text-button" aria-label={t('ניקוי הבחירה','Clear selection')} disabled={!queue.length} onClick={clearSelection}>{t('ניקוי הבחירה','Clear selection')}</button></div>
  {!!queue.length&&!queueStatus.canAdd&&<p className="care-error" role="alert">{queueStatus.unavailable.length?t('חלק מהתרגילים שנבחרו כבר אינם זמינים. הסירו אותם מהבחירה לפני ההוספה.','Some selected exercises are no longer available. Remove them from the selection before adding.'):t('אין מספיק מקום לכל הבחירה. הסירו תרגילים מהבחירה או מהתוכנית; לא תתווסף בחירה חלקית.','There is not enough room for the entire selection. Remove selected exercises or program entries; a partial batch will not be added.')}</p>}
  {batchError&&<p className="care-error" role="alert">{batchError}</p>}
 </section>}<div className="coach-picker-results">{results.slice((current-1)*6,current*6).map(e=><article key={e.id}><div><strong data-no-translate>{bilingualExerciseName(e)}</strong><small>{e.group||e.area||'לא צוין'} · {e.equipment||pickerEquipment(e).map(value=>equipmentOptions.find(o=>o.value===value)?.label).join(' · ')}</small>{onAddMany&&<label className="care-check"><input type="checkbox" checked={queue.includes(e.id)} aria-label={t('בחירת '+bilingualExerciseName(e),'Select '+bilingualExerciseName(e))} disabled={!queue.includes(e.id)&&queue.length>=queueStatus.remaining} onChange={event=>choose(e.id,event.target.checked)}/><span>{t('בחירה להוספה משותפת','Select for batch')}</span></label>}</div><button type="button" className={selected.has(e.id)?'button secondary':'button primary'} disabled={totalCount>=30} onClick={()=>onAdd(e.id)}>{selected.has(e.id)?<><Check size={16}/> הוספה נוספת ליום הזה</>:<><Plus size={16}/> הוספה</>}</button></article>)}</div>{!results.length&&<p className="care-empty">לא נמצאו תרגילים. נסו שם אחר או נקו את הסינון.</p>}{pages>1&&<nav className="browse-pages" aria-label="עמודי תוצאות תרגילים"><button type="button" className="button secondary" disabled={current===1} onClick={()=>setPage(current-1)}>הקודם</button><span role="status">עמוד {current} / {pages}</span><button type="button" className="button secondary" disabled={current===pages} onClick={()=>setPage(current+1)}>הבא</button></nav>}</div></details></Localize>;
}
