'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {SessionExercise,TrainingSession} from '../lib/training';
import {cardioIntervalPosition} from '../lib/cardio-player';
import type {CardioMetrics} from '../lib/cardio';
import type {TrainingController} from '../hooks/use-training';
import {CardioMetricFields,CardioPrescriptionSummary,cardioMetricLabels} from './cardio-editor';
import {useLanguage} from './language-provider';

// Per-document continuity: application navigation keeps continuity; a new document requires recovery.
const continuity=new Set<string>();
const clock=(seconds:number)=>`${Math.floor(Math.max(0,seconds)/60)}:${String(Math.floor(Math.max(0,seconds)%60)).padStart(2,'0')}`;

export function CardioWorkoutPlayer({session,item,controller,blocked=false}:{session:TrainingSession;item:SessionExercise;controller:TrainingController;blocked?:boolean}){
 const {language}=useLanguage(),en=language==='en',t=(he:string,english:string)=>en?english:he;
 const result=item.cardioResult,key=`${session.id}:${item.occurrenceId??item.exerciseId}`;
 const [now,setNow]=useState(()=>Date.now()),[recovery,setRecovery]=useState(()=>result?.status==='running'&&!continuity.has(key)),[metrics,setMetrics]=useState<CardioMetrics>(result?.metrics??{}),[showResults,setShowResults]=useState(false);
 const current=useRef({session,item,controller});useEffect(()=>{current.current={session,item,controller};},[session,item,controller]);
 const action=useCallback(async(command:string,extra:Record<string,unknown>={})=>{
  const {item,controller}=current.current;
  const saved=await controller.patch({action:'cardio',command,exerciseId:item.exerciseId,occurrenceId:item.occurrenceId,actionId:crypto.randomUUID(),...extra});
  if(saved){continuity.add(key);setRecovery(false);}return saved;
 },[key]);
 const act=useRef(action);useEffect(()=>{act.current=action;},[action]);
 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(id);},[]);
 useEffect(()=>{
  if(result?.status!=='running'||recovery||blocked)return;
  const tick=setInterval(()=>{if(!current.current.controller.busy&&document.visibilityState==='visible')void act.current('checkpoint');},30000);
  const hide=()=>{if(document.visibilityState==='hidden'&&!current.current.controller.busy)void act.current('pause');};
  document.addEventListener('visibilitychange',hide);
  return()=>{clearInterval(tick);document.removeEventListener('visibilitychange',hide);};
 },[result?.status,recovery,blocked]);
 if(!item.cardio)return null;
 const gap=result?Math.max(0,(now-Date.parse(result.checkpointAt))/1000):0,interrupted=recovery||result?.status==='interrupted'||result?.status==='running'&&gap>120;
 const elapsed=(result?.elapsedSeconds??0)+(result?.status==='running'&&!interrupted?gap:0);
 const position=cardioIntervalPosition(item.cardio,elapsed),targetDuration=item.cardio.mode==='intervals'?item.cardio.intervals?.reduce((sum,i)=>sum+i.durationSeconds*(i.repeat??1),0):item.cardio.targets.durationSeconds;
 const complete=result?.status==='completed',busy=controller.busy||blocked,otherRunning=session.items.some(other=>(other.occurrenceId??other.exerciseId)!==(item.occurrenceId??item.exerciseId)&&other.cardioResult?.status==='running');
 return <section className="panel cardio-player" data-no-translate dir={en?'ltr':'rtl'} aria-label={t('נגן אימון אירובי','Cardio workout player')}>
  <CardioPrescriptionSummary value={item.cardio}/>
  <div className="cardio-timer"><output aria-label={t('זמן שחלף','Elapsed time')}>{clock(elapsed)}</output>{targetDuration!=null&&<span>{t('נותר לפי התוכנית','Prescribed time remaining')}: {clock(targetDuration-elapsed)}</span>}</div>
  <p className="care-muted">{t('הטיימר מודד זמן שהתחלתם; הוא אינו חיישן המאמת פעילות. נעילת המסך משהה את האימון כשניתן לשמור את ההשהיה.','The timer measures time you start; it does not verify physical activity. Locking the screen pauses when the pause can be saved.')}</p>
  {position.interval&&<div className="cardio-current-interval"><strong>{t('מקטע נוכחי','Current interval')} {position.index+1}: {position.interval.phase}</strong><span>{clock(position.remainingSeconds)}</span>{position.interval.targets&&<dl>{Object.entries(position.interval.targets).map(([metric,value])=><div key={metric}><dt>{cardioMetricLabels[metric as keyof CardioMetrics][en?1:0]}</dt><dd>{value}</dd></div>)}</dl>}{position.next&&<p>{t('הבא','Next')}: {position.next.phase} · {clock(position.next.durationSeconds)}</p>}</div>}
  {interrupted&&!complete?<div className="cardio-recovery" role="status"><h4>{t('האימון נקטע','Workout interrupted')}</h4><p>{t('הפער מאז השמירה האחרונה לא נספר אוטומטית. אפשר לאשר זמן שבוצע או להמשיך מהזמן השמור.','The gap since the last save was not counted automatically. Confirm only time actually performed, or continue from the saved time.')}</p><div className="care-actions"><button type="button" className="button primary" disabled={busy} onClick={()=>void action('recover',{recoverySeconds:0})}>{t('המשך ללא הפער','Exclude the gap')}</button><button type="button" className="button secondary" disabled={busy||gap>86400} onClick={()=>void action('recover',{recoverySeconds:Math.min(gap,86400)})}>{t('אני מאשר/ת שביצעתי את זמן הפער','Confirm I performed the gap')}</button></div></div>:<div className="care-actions">
   {!result&&<button type="button" className="button primary" disabled={busy||otherRunning} onClick={()=>void action('start')}>{t('התחלת אירובי','Start cardio')}</button>}
   {result?.status==='running'&&<button type="button" className="button secondary" disabled={busy} onClick={()=>void action('pause')}>{t('השהיה','Pause')}</button>}
   {result?.status==='paused'&&<button type="button" className="button primary" disabled={busy||otherRunning} onClick={()=>void action('resume')}>{t('המשך','Resume')}</button>}
   {result&&!complete&&<button type="button" className="button primary" disabled={busy} onClick={()=>setShowResults(true)}>{t('סיום אירובי ותיעוד ביצוע','Finish cardio and record results')}</button>}
  </div>}
  {otherRunning&&(!result||result.status==='paused')&&<p>{t('יש להשהות או לסיים את פעילות האירובי הפעילה לפני התחלת פעילות נוספת.','Pause or finish the active cardio activity before starting another.')}</p>}
  {showResults&&!complete&&!interrupted&&<div className="care-form"><h4>{t('ביצוע בפועל — שדות שלא נמדדו נשארים ריקים','Actual results — leave unmeasured fields empty')}</h4><CardioMetricFields advanced activityId={item.cardio.activityId} value={metrics} onChange={setMetrics}/><div className="care-actions"><button type="button" className="button primary" disabled={busy} onClick={async()=>{if(await action('finish',{metrics}))setShowResults(false);}}>{t('שמירת הביצוע','Save results')}</button><button type="button" className="button secondary" onClick={()=>setShowResults(false)}>{t('חזרה לאימון','Back to workout')}</button></div></div>}
  {complete&&<CardioResultSummary item={item} withPrescription={false}/>}
 </section>;
}

export function CardioResultSummary({item,withPrescription=true}:{item:SessionExercise;withPrescription?:boolean}){const {language}=useLanguage(),en=language==='en';if(!item.cardio)return null;const pace500=['rowing_machine','skierg'].includes(item.cardio.activityId);return <div className="cardio-results" data-no-translate>{withPrescription&&<CardioPrescriptionSummary value={item.cardio}/>}<p>{item.cardioResult?.status==='completed'?(en?'Completed cardio':'אירובי שהושלם'):(en?'Not completed':'לא הושלם')} · {clock(item.cardioResult?.elapsedSeconds??0)}</p><dl>{Object.entries(item.cardioResult?.metrics??{}).map(([key,value])=><div key={key}><dt>{key==='paceSeconds'&&pace500?(en?'Pace (seconds/500m)':'קצב (שניות ל־500 מטר)'):cardioMetricLabels[key as keyof CardioMetrics][en?1:0]}</dt><dd>{value}</dd></div>)}</dl></div>;}
