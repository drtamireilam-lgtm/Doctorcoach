'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {WorkoutLearningDialog,type WorkoutLearningReturn} from './workout-learning-dialog';
import {workoutLearningTarget,type WorkoutLearningTarget} from '../lib/workout-learning';
import {useLanguage} from './language-provider';
import {AnatomyModelViewer} from './anatomy-model-viewer';
import {anatomy3dLabEnabled} from '../lib/anatomy-lab';
import {anatomyModels} from '../lib/anatomy-models';
import {workoutMuscleSummary,workoutMuscleLinks,workoutPrescriptionName} from '../lib/anatomy-workout';
import {exerciseAnatomyLinks} from '../lib/anatomy-exercises';
import {anatomyRoleColors,exerciseDisplayName,exerciseMuscleName,exerciseStructureMatches} from '../lib/anatomy-training';
import type {PlanItem} from '../lib/training';
type Props={items:readonly PlanItem[];days?:readonly {id:string;label:string}[];initialDay?:string};
const model=anatomyModels.find(m=>m.id==='detailed')!;
const roles=['primary','secondary','stabilizer'] as const;
const name=workoutPrescriptionName;
export function WorkoutMuscleMap(props:Props){
 const {language}=useLanguage(),[open,setOpen]=useState(false),he=language==='he';
 useEffect(()=>{setOpen(false);},[props.items]);
 return <section className="panel workout-muscle-map-entry no-print" data-no-translate><button className="button secondary" type="button" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?(he?'סגירת מפת שרירי האימון':'Close workout muscle map'):(he?'מפת השרירים של התוכנית':'Program muscle map')}</button>{open&&<WorkoutMuscleMapContent {...props} language={language}/>}</section>;
}
export function WorkoutMuscleMapContent({items,days=[],initialDay,language}:Props&{language:'he'|'en'}){
 const he=language==='he',[scope,setScope]=useState(initialDay??days[0]?.id??items[0]?.dayId??'1'),[exercise,setExercise]=useState('all'),[selection,setSelection]=useState<{kind:'list';key:string}|{kind:'model';id:string}|null>(null),[showModel,setShowModel]=useState(true);
 const [learning,setLearning]=useState<WorkoutLearningTarget|null>(null),[learningUnavailable,setLearningUnavailable]=useState(false),returnTo=useRef<WorkoutLearningReturn|null>(null);
 function openLearning(kind:'muscle'|'exercise',id:string,fromMuscle?:string){const target=workoutLearningTarget(kind,id,fromMuscle);if(!target){setLearningUnavailable(true);return;}returnTo.current={element:document.activeElement as HTMLElement|null,x:window.scrollX,y:window.scrollY};setLearningUnavailable(false);setLearning(target);}
 useEffect(()=>()=>{returnTo.current=null;},[]);
 const options=useMemo(()=>{const map=new Map(days.map(d=>[d.id,d.label]));for(const item of items){const id=item.dayId??'1';if(!map.has(id))map.set(id,(he?'אימון ':'Workout ')+id);}return [...map].map(([id,label])=>({id,label}));},[days,items,he]);
 const effectiveScope=scope==='week'||options.some(d=>d.id===scope)?scope:options[0]?.id??'1';
 const scopedItems=useMemo(()=>effectiveScope==='week'?items:items.filter(i=>(i.dayId??'1')===effectiveScope),[items,effectiveScope]);
 const summary=useMemo(()=>workoutMuscleSummary(scopedItems),[scopedItems]);
 const mappedIndices=new Set(summary.muscles.flatMap(row=>row.contributions.map(c=>c.index)));
 const index=exercise==='all'?null:Number(exercise),focusedItem=index!==null&&mappedIndices.has(index)?scopedItems[index]:undefined;
 const links=useMemo(()=>focusedItem?exerciseAnatomyLinks(focusedItem.exerciseId):workoutMuscleLinks(summary.muscles),[focusedItem,summary]);
 const pickedStructure=selection?.kind==='model'?model.structures.find(s=>s.id===selection.id):undefined;
 const selectedRows=selection?.kind==='list'?summary.muscles.filter(m=>m.key===selection.key):pickedStructure?summary.muscles.filter(row=>exerciseStructureMatches(pickedStructure,{...row,role:'primary'})):[];
 const selectedStructure=selection?.kind==='list'&&selectedRows[0]?model.structures.find(s=>exerciseStructureMatches(s,{...selectedRows[0],role:'primary'}))?.id:undefined;
 const missing=links.filter(link=>!model.structures.some(s=>exerciseStructureMatches(s,link)));
 const onStructure=useCallback((id:string|null)=>setSelection(id?{kind:'model',id}:null),[]);
 useEffect(()=>{returnTo.current=null;setLearning(null);setLearningUnavailable(false);setExercise('all');setSelection(null);},[items,effectiveScope]);
 useEffect(()=>{if(initialDay)setScope(initialDay);},[initialDay]);
 const labels={primary:he?'עיקרי':'Primary',secondary:he?'מסייע':'Assisting',stabilizer:he?'מייצב':'Stabilizing'};
 const scopeLabel=effectiveScope==='week'?(he?'סיכום שבועי מתוכנן':'Planned weekly overview'):options.find(d=>d.id===effectiveScope)?.label??(he?'האימון':'Workout');
 return <div className="workout-muscle-map care-stack" dir={he?'rtl':'ltr'} data-no-translate>
  <h2>{he?'אילו שרירים משתתפים בתוכנית?':'Which muscles participate in the program?'}</h2>
  <label>{he?'תצוגת אימון':'Workout scope'}<select value={effectiveScope} onChange={e=>{setScope(e.target.value);setExercise('all');setSelection(null);}}>{options.map(day=><option key={day.id} value={day.id}>{day.label}</option>)}<option value="week">{he?'סיכום שבועי':'Weekly overview'}</option></select></label>
  <p className="care-muted">{he?'הסיכום השבועי מניח שכל אימון בתוכנית מבוצע פעם אחת. הוא אינו לוח אימונים שבועי בפועל.':'The weekly overview assumes each programmed workout is performed once. It is not an actual weekly schedule.'}</p>
  <h3>{scopeLabel}</h3>
  <p>{he?'סטי עבודה מתוכננים בלבד, ללא אחוזי הפעלה או מדידת עומס. כל תפקיד נספר בנפרד; אותו סט יכול להופיע אצל כמה שרירים.':'Planned working sets only, not activation percentages or a load measurement. Roles are counted separately; one set can contribute to several muscles.'}</p>
  {!scopedItems.length&&<p role="status">{he?'אין תרגילים באימון הזה.':'No exercises in this workout.'}</p>}
  {summary.excluded>0&&<p>{he?`${summary.excluded} תרגילי חימום, מתיחה או אירובי אינם נכללים בספירת סטי העבודה.`:`${summary.excluded} warmup, stretch or cardio exercises excluded from working-set counts.`}</p>}
  {summary.unmapped.length>0&&<div role="status"><p>{he?'לחלק מהתרגילים אין מיפוי זמין או ספירת סטים תקינה; הם אינם נכללים בסיכום.':'Some exercise mapping is unavailable or has invalid set counts; these exercises are not included in the summary.'}</p><ul>{summary.unmapped.map(issue=><li key={issue.index}>{name(scopedItems[issue.index],language)} · {issue.index+1}: {issue.reason==='invalid-sets'?(he?'מספר הסטים צריך להיות מספר שלם בין 1 ל־20; התרגיל לא נספר עד לתיקון.':'Working sets must be an integer from 1 to 20; excluded until corrected.'):(he?'מיפוי לא זמין':'Mapping unavailable')}</li>)}</ul></div>}
  {!!summary.muscles.length&&<>
   <label>{he?'צביעה לפי תרגיל':'Exercise colouring'}<select value={focusedItem?exercise:'all'} onChange={e=>setExercise(e.target.value)}><option value="all">{he?'כל תרגילי התצוגה':'All exercises in this view'}</option>{scopedItems.map((item,i)=>mappedIndices.has(i)?<option key={i} value={String(i)}>{i+1}. {name(item,language)} · {item.sets} {he?'סטים':'sets'}</option>:null)}</select></label>
   <p className="care-muted">{he?'בתצוגה משולבת, כתום אומר תפקיד עיקרי בתרגיל אחד לפחות; אחרת כחול למסייע וסגול למייצב. הצבע אינו מציין עוצמה. הטבלה תמיד מסכמת את כל התרגילים בתצוגה שנבחרה.':'In a combined view, orange means primary in at least one exercise; otherwise blue means assisting and purple stabilizing. Colour is not intensity. The table always summarizes all exercises in the selected scope.'}</p>
   <div className="workout-muscle-legend">{roles.map(role=><span key={role}><i aria-hidden="true" style={{background:anatomyRoleColors[role]}}/>{labels[role]}</span>)}</div>
   {anatomy3dLabEnabled&&<><button type="button" className="button secondary" aria-expanded={showModel} onClick={()=>setShowModel(v=>!v)}>{showModel?(he?'הסתרת מודל הגוף':'Hide body model'):(he?'הצגת מודל הגוף':'Show body model')}</button>{showModel&&<AnatomyModelViewer key={effectiveScope} model={model} language={language} muscleLinks={links} overlayTitle={focusedItem?name(focusedItem,language):scopeLabel} initialSelection={selectedStructure} onSelectStructure={onStructure} persistView={false} onExercise={id=>openLearning('exercise',id,selectedRows[0]?.slug??pickedStructure?.learningId)} onMuscle={slug=>openLearning('muscle',slug)} autoOpen/>}</>}
   {missing.length>0&&<p role="note">{he?'שרירים שאינם מיוצגים בגאומטריה: ':'Muscles not represented in this geometry: '}{missing.map(link=>exerciseMuscleName(link,language)).join(', ')}</p>}
   <div className="workout-muscle-table" tabIndex={0} role="region" aria-label={he?'סטי עבודה לפי שריר ותפקיד':'Working sets by muscle and role'}><table><caption>{he?'בחרו שריר לפירוט התרגילים. אין לחבר בין עמודות התפקידים למדד עומס אחד.':'Select a muscle for exercise details. Do not combine role columns into a single load score.'}</caption><thead><tr><th scope="col">{he?'שריר':'Muscle'}</th>{roles.map(role=><th scope="col" key={role}>{labels[role]}</th>)}</tr></thead><tbody>{summary.muscles.map(row=><tr key={row.key}><th scope="row"><button type="button" className="text-button" aria-pressed={selectedRows.some(selected=>selected.key===row.key)} onClick={()=>setSelection({kind:'list',key:row.key})}>{exerciseMuscleName({...row,role:'primary'},language)}</button></th>{roles.map(role=><td key={role}>{row.counts[role]}</td>)}</tr>)}</tbody></table></div>
   <section className="workout-muscle-contributions" aria-label={he?'תרגילים לשריר שנבחר':'Selected muscle exercises'} aria-live="polite">{selectedRows.length?<>{selectedRows.map(selected=><div key={selected.key}><h3>{exerciseMuscleName({...selected,role:'primary'},language)}</h3><button type="button" className="text-button" onClick={()=>openLearning('muscle',selected.slug)}>{he?'כרטיס השריר ותרגילים קשורים':'Muscle card and related exercises'}</button><ul>{selected.contributions.map(c=><li key={c.index}><button type="button" className="text-button" onClick={()=>openLearning('exercise',c.exerciseId,selected.slug)}>{name(scopedItems[c.index],language)}</button> · {options.find(d=>d.id===c.dayId)?.label??c.dayId} · {c.sets} {he?'סטי עבודה':'working sets'} · <span style={{borderInlineStart:`4px solid ${anatomyRoleColors[c.role]}`,paddingInlineStart:6}}>{labels[c.role]}</span></li>)}</ul></div>)}</>:<p>{he?'בחרו שריר ברשימה או במודל כדי לראות אילו תרגילים משתתפים בספירה.':'Select a muscle in the list or model to see which exercises contribute to its counts.'}</p>}</section>
  </>}
  {learningUnavailable&&<p role="status">{he?'תוכן הלמידה המבוקש עדיין אינו זמין.':'The requested learning content is not available yet.'}</p>}{learning&&<WorkoutLearningDialog target={learning} language={language} onNavigate={setLearning} onClose={()=>setLearning(null)} returnTo={returnTo}/>}
  <small className="care-muted">{he?'מיפוי לימודי; סקירה קלינית ממתינה. הסיכום אינו משנה את התוכנית או את היסטוריית האימונים.':'Educational mapping; clinical review pending. This summary does not modify the program or workout history.'}</small>
 </div>;
}
