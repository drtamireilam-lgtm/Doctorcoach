'use client';
import {useEffect,useRef,useState} from 'react';
import {painSceneBudget} from '../lib/anatomy-pain-scene-budget';
import {useLanguage} from './language-provider';
import {careRequest,CareRequestError,useCareResource} from '../hooks/use-care';
import {AnatomyPainHistoryComparison} from './anatomy-pain-history';
import {AnatomyPainMap} from './anatomy-pain-map';
import {painStructures,painModelVersion,type AnatomyPainBundle,type AnatomyPainRecord,type PainPoint,type AnatomyPainData} from '../lib/anatomy-pain';
import {painAccessState} from '../lib/anatomy-pain-ui';
import {painOptions,painOccurrences,painCanPlot,painOccurrenceChoice,painSetChoices,type PainWorkoutContext} from '../lib/anatomy-pain-context';
import type {PainCatalog,PainExerciseOption} from '../lib/anatomy-pain-exercises';
import {exercises} from '../lib/content';
const localTime=(date=new Date())=>new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
const noop=(_dirty:boolean)=>{};
const builtins:PainExerciseOption[]=exercises.map(e=>({id:e.id,he:e.name,en:e.en,source:'builtin'}));
type Props={expectedOwner?:string;auth?:string;context?:PainWorkoutContext;embedded?:boolean;onDirty?:(dirty:boolean)=>void};
export function AnatomyPainWorkspace({expectedOwner,auth,context,embedded=false,onDirty=noop}:Props){
 const {language}=useLanguage(),he=language==='he',resource=useCareResource<AnatomyPainBundle>('/api/anatomy-pain');
 const sceneToken=useRef(Symbol('pain-workspace'));
 const eligible=!!expectedOwner&&['ready','error','loading'].includes(auth??'');
 useEffect(()=>{if(!eligible)return;return painSceneBudget.register(sceneToken.current);},[eligible,expectedOwner]);
 const [visible,setVisible]=useState(true);
 useEffect(()=>{const visibility=()=>{setVisible(!document.hidden);if(!document.hidden)void resource.reload();};const focus=()=>void resource.reload();document.addEventListener('visibilitychange',visibility);window.addEventListener('focus',focus);return()=>{document.removeEventListener('visibilitychange',visibility);window.removeEventListener('focus',focus);};},[resource.reload]);
 const access=painAccessState({auth,expectedOwner,bundleOwner:resource.data?.ownerId,status:resource.status,loading:resource.loading,visible,error:!!resource.error});
 const title=he?'מפת כאב אישית':'Personal pain map';
 return <section hidden={!visible} className="care-stack" data-no-translate dir={he?'rtl':'ltr'}>
  {embedded?<h3>{title}</h3>:<h1>{title}</h1>}
  <p>{he?'דיווחים פרטיים לחשבון שלך. הסימון אינו אבחנה ואינו משנה את תוכנית האימון.':'Reports are private to your account. Marking pain does not diagnose a condition or change your program.'}</p>
  {!access.show&&<div className="panel"><p role="status">{resource.loading||auth==='loading'?(he?'בודקים גישה ומעדכנים היסטוריה…':'Checking access and updating history…'):resource.status===401||auth==='required'?(he?'יש להתחבר כדי לשמור ולצפות בדיווחים.':'Sign in to save and view reports.'):resource.status===403?(he?'יש לעדכן את ההסכמות בתיק שלי לפני דיווח כאב.':'Update your health consents in My File before using pain reports.'):(he?'לא ניתן לאמת גישה לדיווחים כרגע. הטיוטה באותו חשבון נשארת בזיכרון בלבד.':'Access cannot be verified right now. The same-account draft stays in memory only.')}</p>{resource.status===401||auth==='required'?<a className="button primary" href="/signin-with-chatgpt?return_to=%2F%23learn%3Fpain%3D1" target="_top">{he?'התחברות':'Sign in'}</a>:<button type="button" disabled={resource.loading} onClick={()=>void resource.reload()}>{he?'ניסיון נוסף':'Retry'}</button>}{!embedded&&<a href="#onboarding">{he?'לתיק שלי ולהסכמות':'My File and consents'}</a>}</div>}
  {access.mount&&resource.data&&<div hidden={!access.show} inert={!access.show}><PrivatePain sceneToken={sceneToken.current} key={resource.data.ownerId} language={language} bundle={resource.data} invalidate={resource.reload} context={context} onDirty={onDirty}/></div>}
 </section>;
}
function PrivatePain({sceneToken,language,bundle,invalidate,context,onDirty}:{sceneToken:symbol;language:'he'|'en';bundle:AnatomyPainBundle;invalidate:()=>Promise<void>;context?:PainWorkoutContext;onDirty:(dirty:boolean)=>void}){
 const he=language==='he',catalog=useCareResource<PainCatalog>('/api/anatomy-pain?catalog=1');
 useEffect(()=>{const refresh=()=>{if(!document.hidden)void catalog.reload();};window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);return()=>{window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};},[catalog.reload]);
 const [point,setPoint]=useState<PainPoint|null>(null),[placement,setPlacement]=useState<'surface'|'centre'>('surface'),[view,setView]=useState<'front'|'back'|'left'|'right'>('front');
 const [intensity,setIntensity]=useState('0'),[at,setAt]=useState(()=>context?.occurredAt?localTime(new Date(context.occurredAt)):localTime()),[timing,setTiming]=useState<AnatomyPainData['timing']>(context?.timing??'before'),[notes,setNotes]=useState(''),[exercise,setExercise]=useState(context?.exerciseId??''),[occurrence,setOccurrence]=useState(context?.occurrenceId??''),[setIndex,setSetIndex]=useState(''),[query,setQuery]=useState(''),[touched,setTouched]=useState(false);
 const [records,setRecords]=useState(bundle.records),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[locked,setLocked]=useState(false),[history,setHistory]=useState<AnatomyPainRecord|null>(null);
 const generation=useRef(0),pending=useRef<{id:string;ownerId:string;data:unknown}|null>(null),lock=useRef(false),alive=useRef(true);
 useEffect(()=>{alive.current=true;generation.current++;return()=>{alive.current=false;generation.current++;};},[]);
 useEffect(()=>{setRecords(bundle.records);if(pending.current&&bundle.records.some(r=>r.id===pending.current?.id)){pending.current=null;setPoint(null);setNotes('');setTouched(false);setBusy(false);setMessage(he?'הדיווח אומת בהיסטוריה ונשמר.':'Report confirmed in history and saved.');}},[bundle.records]);
 useEffect(()=>{if(!context){const id=new URLSearchParams(window.location.hash.split('?')[1]??'').get('exercise');if(id&&exercises.some(e=>e.id===id))setExercise(id);}},[]);
 useEffect(()=>{if([401,403].includes(catalog.status)||catalog.data&&catalog.data.ownerId!==bundle.ownerId){setLocked(true);void invalidate();}},[catalog.status,catalog.data?.ownerId,bundle.ownerId,invalidate]);
 useEffect(()=>{onDirty(!!point||!!notes||touched||!!pending.current);},[point,notes,touched,busy,onDirty]);
 useEffect(()=>()=>onDirty(false),[onDirty]);
 const catalogReady=!catalog.loading&&!catalog.error&&catalog.status===200&&catalog.data?.ownerId===bundle.ownerId;
 const entries=catalogReady?catalog.data!.exercises:builtins;
 const safeContext=context?.sessionId?context:context?{...context,items:context.items?.filter(i=>entries.some(e=>e.id===i.exerciseId))}:undefined;
 const allOptions=painOptions(entries,safeContext,'');
 const eligible=context?.sessionId?allOptions.filter(o=>context.items?.some(i=>i.exerciseId===o.id)):allOptions;
 const filtered=painOptions(eligible,undefined,query),chosen=eligible.find(e=>e.id===exercise);
 const choices=chosen&&!filtered.some(e=>e.id===chosen.id)?[chosen,...filtered]:filtered;
 const occurrences=painOccurrences(context,exercise),effectiveOccurrence=painOccurrenceChoice(occurrences,occurrence);
 const setChoices=painSetChoices(context,exercise,effectiveOccurrence),setInvalid=setIndex!==''&&!setChoices.includes(Number(setIndex));
 const contextInvalid=!!context?.sessionId&&!!exercise&&(!chosen||!effectiveOccurrence);
 const selected=point?painStructures.find(s=>s.id===point.structureId):null,displayed=history?painStructures.find(s=>s.id===history.data.structureId):selected;
 const frozen=busy||!!pending.current;
 const change=()=>{setTouched(true);setMessage('');};
 const source=(s:PainExerciseOption['source'])=>({builtin:he?'קטלוג':'Catalog',personal:he?'אישי':'Personal',public:he?'משותף':'Shared',program:he?'מהתוכנית':'Program',workout:he?'מהאימון':'Workout'})[s];
 const timingLabel=(value:AnatomyPainData['timing'])=>({before:he?'לפני אימון':'Before workout',during:he?'במהלך אימון':'During workout',after:he?'אחרי אימון':'After workout',other:he?'ללא קשר לאימון':'Other / no workout'})[value];
 async function save(){
  const requestGeneration=generation.current;if(lock.current||!pending.current&&(!point||!selected||contextInvalid||setInvalid))return;lock.current=true;setBusy(true);setError('');setMessage('');
  try{
   const date=new Date(at);if(!Number.isFinite(date.getTime()))throw new Error();
   pending.current??={id:crypto.randomUUID(),ownerId:bundle.ownerId,data:{...point,modelVersion:painModelVersion,...setIndex!==''?{setIndex:Number(setIndex)}:{},side:selected!.side,placement,view,intensity:Number(intensity),occurredAt:date.toISOString(),timing,notes,exerciseId:exercise,...context?.sessionId?{sessionId:context.sessionId,...exercise&&effectiveOccurrence?{occurrenceId:effectiveOccurrence}:{}}:{}}};
   const result=await careRequest<AnatomyPainBundle>('/api/anatomy-pain',pending.current);if(!alive.current||requestGeneration!==generation.current)return;
   if(result.ownerId!==bundle.ownerId){setLocked(true);void invalidate();return;}
   setRecords(result.records);pending.current=null;setPoint(null);setNotes('');setTouched(false);setMessage(he?'הדיווח נשמר בחשבון שלך.':'Report saved to your account.');
  }catch(e){if(!alive.current||requestGeneration!==generation.current)return;if(e instanceof CareRequestError&&(e.status===401||e.status===403)){pending.current=null;setLocked(true);void invalidate();}else{if(e instanceof CareRequestError&&e.status>=400&&e.status<500){pending.current=null;setError(e.message);}else setError(he?'השמירה לא אושרה. הדיווח נשאר בזיכרון העמוד; אפשר לנסות שוב.':'Save was not confirmed. The draft remains in this page; retry.');}}
  finally{lock.current=false;if(alive.current&&requestGeneration===generation.current)setBusy(false);}
 }
 if(locked)return <div role="status"><p>{he?'הגישה השתנתה. יש לרענן את הרשימה לפני דיווח נוסף.':'Access changed. Refresh the list before reporting again.'}</p><button type="button" onClick={()=>{setLocked(false);void catalog.reload();void invalidate();}}>{he?'ניסיון נוסף':'Retry'}</button></div>;
 return <>
  <div className="panel care-stack"><h3>{he?'דיווח חדש':'New report'}</h3>
   <AnatomyPainMap sceneToken={sceneToken} readOnly={frozen} language={language} point={history?.data??point} historyView={history?.data.view} onPick={(p,mode,pickedView)=>{if(frozen)return;setHistory(null);setPoint(p);setPlacement(mode);setView(pickedView);change();}}/>
   <fieldset disabled={frozen} className="anatomy-pain-fieldset"><legend>{he?'פרטי הדיווח':'Report details'}</legend>
   {history&&<p role="status">{he?'מוצג סמן מההיסטוריה.':'Showing a historical marker.'}<button type="button" onClick={()=>setHistory(null)}>{he?'חזרה לדיווח החדש':'Return to the new draft'}</button></p>}
   <p role="status">{displayed?(he?'נקודת התמצאות: ':'Location reference: ')+displayed[language]:(he?'טרם סומנה נקודה.':'No point selected yet.')}{(history?.data.placement??placement)==='centre'&&displayed&&(he?' · מרכז משוער של המבנה':' · approximate structure centre')}</p>
   <label className="care-field">{he?'עוצמת כאב 0–10':'Pain intensity 0–10'}<input type="number" min="0" max="10" step="1" required value={intensity} onChange={e=>{setIntensity(e.target.value);change();}}/></label>
   <label className="care-field">{he?'מועד הופעת הכאב':'When pain occurred'}<input type="datetime-local" required value={at} max={localTime()} onChange={e=>{setAt(e.target.value);change();}}/></label>
   <label className="care-field">{he?'הקשר לאימון':'Workout timing'}<select value={timing} onChange={e=>{setTiming(e.target.value as AnatomyPainData['timing']);change();}}>{(['before','during','after','other'] as const).map(v=><option key={v} value={v}>{timingLabel(v)}</option>)}</select></label>
   {context?.sessionId?<p>{he?'הדיווח יקושר לאימון שממנו נפתח.':'This report will be linked to the workout it was opened from.'}</p>:context?.timing==='before'&&<p>{he?'האימון טרם נפתח; הדיווח יישמר ללא מזהה אימון.':'The workout has not started; this report will be saved without a workout ID.'}</p>}
   <label className="care-field">{he?'חיפוש תרגיל בעברית או באנגלית':'Search exercise in Hebrew or English'}<input type="search" maxLength={120} value={query} onChange={e=>setQuery(e.target.value)}/></label>
   {catalog.loading&&<p role="status">{he?'טוענים תרגילים אישיים ומהתוכנית…':'Loading personal and program exercises…'}</p>}
   {catalog.error&&<p role="status">{he?'לא ניתן לעדכן את רשימת התרגילים. אפשר לדווח ללא שיוך או לנסות שוב.':'Unable to update exercises. Report without an exercise or retry.'}<button type="button" onClick={()=>void catalog.reload()}>{he?'טעינת תרגילים מחדש':'Reload exercises'}</button></p>}
   <label className="care-field">{he?'תרגיל קשור — רשות':'Related exercise — optional'}<select value={exercise} onChange={e=>{setExercise(e.target.value);setOccurrence('');setSetIndex('');change();}}><option value="">{he?'ללא תרגיל':'No exercise'}</option>{exercise&&!chosen&&<option value={exercise} disabled>{he?'התרגיל אינו זמין בהקשר זה':'Exercise unavailable in this context'}</option>}{choices.map(e=><option key={e.id} value={e.id}>{he?e.he:e.en} · {source(e.source)}</option>)}</select></label>
   {(occurrences.length>1||!!occurrence&&!effectiveOccurrence)&&<label className="care-field">{he?'הופעת התרגיל באימון':'Exercise occurrence in workout'}<select value={effectiveOccurrence} onChange={e=>{setOccurrence(e.target.value);setSetIndex('');change();}}><option value="">{he?'בחרו הופעה':'Choose occurrence'}</option>{occurrences.map((i,index)=><option key={i.occurrenceId} value={i.occurrenceId}>{index+1}. {i.name}</option>)}</select></label>}
   {(setChoices.length>0||setIndex!=='')&&<label className="care-field">{he?'סט עבודה קשור — רשות':'Related working set — optional'}<select value={setIndex} onChange={e=>{setSetIndex(e.target.value);change();}}><option value="">{he?'ללא סט מסוים':'No specific set'}</option>{setInvalid&&<option value={setIndex} disabled>{he?'הסט אינו זמין':'Set unavailable'}</option>}{setChoices.map(index=><option key={index} value={index}>{he?'סט עבודה':'Working set'} {index+1}</option>)}</select><small>{he?'שיוך לפי מספר הסט בזמן הדיווח; אינו מסמן את הסט כבוצע.':'References the set number at report time; does not mark the set as completed.'}</small></label>}
   {setInvalid&&<p role="alert">{he?'הסט השתנה. בחרו סט זמין או דיווח ללא סט מסוים.':'The set changed. Choose an available set or report without a specific set.'}</p>}
   {contextInvalid&&<p role="alert">{he?'בחרו תרגיל והופעה שעדיין נמצאים באימון, או דיווח ללא תרגיל.':'Choose a current workout exercise and occurrence, or report without an exercise.'}</p>}
   <label className="care-field">{he?'הערה — רשות':'Note — optional'}<textarea maxLength={1500} value={notes} onChange={e=>{setNotes(e.target.value);change();}}/></label>
  </fieldset>
  <button type="button" className="button primary" disabled={busy||!!history||!pending.current&&(!point||contextInvalid||setInvalid||intensity===''||!Number.isInteger(Number(intensity))||Number(intensity)<0||Number(intensity)>10||!at)} onClick={()=>void save()}>{busy?(he?'שומרים…':'Saving…'):pending.current?(he?'ניסיון שמירה חוזר':'Retry save'):(he?'שמירת דיווח כאב':'Save pain report')}</button>
  {message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}</div>
  <section className="panel care-stack" aria-label={he?'היסטוריית דיווחי כאב':'Pain report history'}><h2>{he?'היסטוריית דיווחים':'Report history'}</h2><small>{he?'עד 100 הדיווחים האחרונים. טיוטה שלא נשמרה נמחקת ביציאה מהעמוד או בהחלפת חשבון.':'Up to 100 latest reports. Unsaved drafts clear when leaving or changing accounts.'}</small>
   <AnatomyPainHistoryComparison records={records} language={language}/>
   {!records.length&&<p>{he?'אין דיווחים שמורים.':'No saved reports.'}</p>}
   {records.map(r=>{const structure=painStructures.find(s=>s.id===r.data.structureId),exerciseName=he?r.data.exerciseNameHe:r.data.exerciseNameEn;const fallback=exercises.find(e=>e.id===r.data.exerciseId);return <article key={r.id} className="panel"><time dateTime={r.data.occurredAt}>{new Date(r.data.occurredAt).toLocaleString(he?'he-IL':'en-GB')}</time><p>{structure?.[language]} · {he?'עוצמה':'Intensity'} {r.data.intensity}/10 · {timingLabel(r.data.timing)}</p>{r.data.exerciseId&&<p>{exerciseName||(fallback?(he?fallback.name:fallback.en):(he?'תרגיל אישי או היסטורי':'Personal or historical exercise'))}</p>}{r.data.sessionId&&<small>{he?'משויך לאימון':'Linked to a workout'}{r.data.setIndex!==undefined&&` · ${he?'סט עבודה בזמן הדיווח':'Working set at report time'} ${r.data.setIndex+1}`}</small>}{r.data.notes&&<p>{r.data.notes}</p>}{!painCanPlot(r.data)&&<p>{he?'גרסת המודל השתנתה. פרטי הדיווח נשמרו, אך הסמן אינו מוצג על גאומטריה אחרת.':'The model version changed. Report details are retained; the marker is not shown on different geometry.'}</p>}<button type="button" disabled={frozen||!painCanPlot(r.data)} onClick={()=>{setHistory(r);painSceneBudget.activate(sceneToken);}}>{he?'הצגת הנקודה על המודל':'Show point on model'}</button></article>;})}
  </section>
 </>;
}
