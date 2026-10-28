'use client';
import {useState} from 'react';
import {cardioActivities,cardioActivity,cardioPrescribedSeconds,parseCardioPrescription,type CardioMetrics,type CardioPrescription,type CardioInterval,type CardioMetricSources} from '../lib/cardio';
import {defaultPrescription,type PlanItem} from '../lib/training';
import {useLanguage} from './language-provider';

export const cardioMetricLabels:Record<keyof CardioMetrics,[string,string]>={durationSeconds:['משך (שניות)','Duration (seconds)'],distanceMeters:['מרחק (מטרים)','Distance (meters)'],paceSeconds:['קצב (שניות לק״מ)','Pace (seconds/km)'],speedKph:['מהירות (קמ״ש)','Speed (km/h)'],inclinePercent:['שיפוע (%)','Incline (%)'],resistance:['התנגדות','Resistance'],resistanceLabel:['יחידת התנגדות / מכשיר','Resistance unit / machine'],cadence:['קצב תנועה (לדקה)','Cadence (per minute)'],heartRate:['דופק ממוצע / יעד','Average / target heart rate'],maxHeartRate:['דופק מרבי','Maximum heart rate'],heartRateZone:['אזור דופק (1–5 לפי התוכנית)','Heart-rate zone (1–5 per plan)'],rpe:['מאמץ RPE ‏(0–10)','RPE (0–10)'],poolLengthMeters:['אורך בריכה (מטרים)','Pool length (meters)'],lengths:['מספר בריכות','Pool lengths'],calories:['קלוריות מדווחות','Reported calories']};

export function cardioMetricLabel(activityId:CardioPrescription['activityId'],key:keyof CardioMetrics,en:boolean):string{
 const unit=cardioActivity(activityId)?.paceUnit;
 if(key==='paceSeconds')return en?`Pace (${unit??'seconds/km'})`:unit==='seconds/500m'?'קצב (שניות ל־500 מטר)':unit==='seconds/100m'?'קצב (שניות ל־100 מטר)':'קצב (שניות לק״מ)';
 return cardioMetricLabels[key][en?1:0];
}

export const cardioSourceLabels={manual:['הוזן ידנית','Manually entered'],device_reported:['מדווח ממכשיר','Reported from device'],calculated:['חושב מהנתונים','Calculated from data'],estimated:['הערכה','Estimated'],timer:['טיימר','Timer']} as const;
export function CardioMetricFields({activityId,value,onChange,advanced=false,extraOnly=false,actual=false,sources={},onSourcesChange}:{activityId:CardioPrescription['activityId'];value:CardioMetrics;onChange:(value:CardioMetrics)=>void;advanced?:boolean;extraOnly?:boolean;actual?:boolean;sources?:CardioMetricSources;onSourcesChange?:(sources:CardioMetricSources)=>void}){
 const {language}=useLanguage(),en=language==='en',activity=cardioActivity(activityId)!;
 const basic=['durationSeconds','distanceMeters','paceSeconds','speedKph','inclinePercent','rpe'];
 const fields=activity.metrics.filter(key=>extraOnly?!basic.includes(key):advanced||basic.includes(key));
 return <div className="cardio-fields">{fields.map(raw=>{const key=raw as keyof CardioMetrics,label=cardioMetricLabel(activityId,key,en);return <div key={key}><label>{label}<input type={key==='resistanceLabel'?'text':'number'} min={0} max={key==='rpe'?10:key==='heartRateZone'?5:undefined} step={key==='heartRateZone'?'1':'any'} maxLength={key==='resistanceLabel'?80:undefined} value={value[key]??''} onChange={e=>{const next={...value},nextSources={...sources};if(e.target.value===''){delete next[key];delete nextSources[key];}else{Object.assign(next,{[key]:key==='resistanceLabel'?e.target.value:Number(e.target.value)});nextSources[key]='manual';}onChange(next);onSourcesChange?.(nextSources);}}/></label>{actual&&value[key]!==undefined&&<label>{en?'Source of '+label:'מקור הנתון: '+label}<select aria-label={(en?'Source: ':'מקור: ')+label} value={sources[key]??'manual'} onChange={e=>onSourcesChange?.({...sources,[key]:e.target.value})}>{Object.entries(cardioSourceLabels).filter(([source])=>['manual','device_reported'].includes(source)||source===(sources[key])||source==='estimated'&&key==='calories').map(([id,names])=><option key={id} value={id}>{names[en?1:0]}</option>)}</select></label>}</div>;})}</div>;
}

export function CardioPrescriptionFields({value,onChange,lockActivity=false}:{value:CardioPrescription;onChange:(value:CardioPrescription)=>void;lockActivity?:boolean}){
 const {language}=useLanguage(),en=language==='en',t=(he:string,english:string)=>en?english:he;
 const [query,setQuery]=useState('');
 const updateInterval=(index:number,patch:Partial<CardioInterval>)=>onChange({...value,intervals:value.intervals?.map((item,i)=>i===index?{...item,...patch}:item)});
 return <div className="cardio-prescription" data-no-translate dir={en?'ltr':'rtl'}>
  <label>{t('חיפוש פעילות','Search activities')}<input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label>
  <label>{t('סוג פעילות','Activity')}<select aria-label={t('סוג פעילות','Activity')} disabled={lockActivity} value={value.activityId} onChange={e=>onChange({...value,activityId:e.target.value as CardioPrescription['activityId'],customLabel:undefined,targets:{durationSeconds:value.targets.durationSeconds??600},intervals:value.intervals?.map(i=>({...i,targets:{}}))})}>{cardioActivities.filter(a=>a.id===value.activityId||[a.name,a.nameEn,...a.aliases].some(n=>n.toLowerCase().includes(query.toLowerCase()))).map(a=><option key={a.id} value={a.id}>{en?a.nameEn:a.name}</option>)}</select></label>
  <label>{t('מבנה האימון','Workout format')}<select aria-label={t('מבנה האימון','Workout format')} value={value.mode} onChange={e=>onChange(e.target.value==='steady'?{...value,mode:'steady',intervals:undefined,rounds:undefined}:{...value,mode:'intervals',rounds:1,intervals:[{id:crypto.randomUUID(),phase:'work',durationSeconds:60,repeat:1,targets:{}},{id:crypto.randomUUID(),phase:'recovery',durationSeconds:30,repeat:1,targets:{}}]})}><option value="steady">{t('רציף','Steady state')}</option><option value="intervals">{t('אינטרוולים / HIIT','Intervals / HIIT')}</option></select></label>
  {value.activityId==='other_cardio'&&<label>{t('שם הפעילות המותאמת','Custom activity name')}<input maxLength={80} value={value.customLabel??''} onChange={e=>onChange({...value,customLabel:e.target.value||undefined})}/></label>}
  <CardioMetricFields activityId={value.activityId} value={value.targets} onChange={targets=>onChange({...value,targets})}/>
  <details><summary>{t('יעדים נוספים לפי הפעילות','Additional activity targets')}</summary><CardioMetricFields advanced extraOnly activityId={value.activityId} value={value.targets} onChange={targets=>onChange({...value,targets})}/></details>
  {value.mode==='intervals'&&<div className="cardio-intervals"><label>{t('סבבים של הרצף המלא','Rounds of the complete sequence')}<input type="number" min={1} max={100} value={value.rounds??1} onChange={e=>onChange({...value,rounds:Number(e.target.value)})}/></label>{value.intervals?.map((interval,index)=><fieldset key={interval.id}><legend>{t('מקטע','Interval')} {index+1}</legend><div className="cardio-fields"><label>{t('שלב','Phase')}<select value={interval.phase} onChange={e=>updateInterval(index,{phase:e.target.value as CardioInterval['phase']})}>{[['warmup','חימום','Warmup'],['work','עבודה','Work'],['recovery','מנוחה','Rest'],['cooldown','שחרור','Cooldown']].map(([id,he,english])=><option key={id} value={id}>{t(he,english)}</option>)}</select></label><label>{t('משך בשניות','Seconds')}<input type="number" min={1} max={86400} value={interval.durationSeconds} onChange={e=>updateInterval(index,{durationSeconds:Number(e.target.value)})}/></label><label>{t('חזרות על המקטע','Repeat interval')}<input type="number" min={1} max={100} value={interval.repeat??1} onChange={e=>updateInterval(index,{repeat:Number(e.target.value)})}/></label></div><details><summary>{t('עצימות המקטע','Interval intensity')}</summary><CardioMetricFields activityId={value.activityId} value={interval.targets??{}} onChange={targets=>updateInterval(index,{targets})}/></details><button type="button" className="text-button danger-text" onClick={()=>onChange({...value,intervals:value.intervals?.filter((_,i)=>i!==index)})}>{t('הסרת מקטע','Remove interval')}</button></fieldset>)}<button type="button" className="button secondary" disabled={(value.intervals?.length??0)>=100} onClick={()=>onChange({...value,intervals:[...(value.intervals??[]),{id:crypto.randomUUID(),phase:'recovery',durationSeconds:30,targets:{}}]})}>{t('הוספת מקטע','Add interval')}</button></div>}
 </div>;
}

export function CardioPlanComposer({initial,dayId='1',busy=false,onSave,onCancel}:{initial?:PlanItem;dayId?:string;busy?:boolean;onSave:(item:PlanItem)=>Promise<unknown>|void;onCancel?:()=>void}){
 const {language}=useLanguage(),en=language==='en';
 const [value,setValue]=useState<CardioPrescription>(initial?.cardio??{activityId:'walking',mode:'steady',targets:{durationSeconds:600}}),[notes,setNotes]=useState(initial?.notes??''),[error,setError]=useState('');
 async function save(){try{const cardio=parseCardioPrescription(value),exerciseId=`cardio:${cardio.activityId}`;setError('');await onSave({...defaultPrescription(exerciseId),...initial,exerciseId,cardio,notes,dayId:initial?.dayId??dayId,occurrenceId:initial?.occurrenceId??crypto.randomUUID()});}catch{setError(en?'Check the activity targets and intervals.':'בדקו את יעדי הפעילות והמקטעים.');}}
 return <section className="panel care-form cardio-composer" data-no-translate><h3>{initial?(en?'Edit cardio':'עריכת אירובי'):(en?'Add cardio to this training day':'הוספת אירובי ליום האימון')}</h3><CardioPrescriptionFields value={value} onChange={setValue} lockActivity={!!initial}/><label>{en?'Coach notes':'הערות'}<textarea maxLength={500} value={notes} onChange={e=>setNotes(e.target.value)}/></label>{error&&<p role="alert">{error}</p>}<div className="care-actions"><button type="button" className="button primary" disabled={busy} onClick={()=>void save()}>{en?'Save cardio':'שמירת אירובי'}</button>{onCancel&&<button type="button" className="button secondary" onClick={onCancel}>{en?'Close':'סגירה'}</button>}</div></section>;
}

export function CardioPrescriptionSummary({value}:{value:CardioPrescription}){
 const {language}=useLanguage(),en=language==='en',t=(he:string,english:string)=>en?english:he;
 const targets=value.targets,total=cardioPrescribedSeconds(value),activity=cardioActivity(value.activityId);
 const phase=(id:CardioInterval['phase'])=>({warmup:t('חימום','Warmup'),work:t('עבודה','Work'),recovery:t('מנוחה','Rest'),cooldown:t('שחרור','Cooldown')}[id]);

 const clock=(seconds:number)=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
 return <div className="cardio-target-summary" data-no-translate><strong>{value.customLabel??(en?activity?.nameEn:activity?.name)}</strong><span>{value.mode==='intervals'?t('אינטרוולים','Intervals'):t('רציף','Steady state')}{targets.distanceMeters!=null?` · ${targets.distanceMeters} ${t('מ׳','m')}`:''}</span>
  {value.mode==='intervals'&&<span>{value.rounds??1} {t('סבבים של הרצף המלא','rounds of the complete sequence')}</span>}
  {total!=null&&<span>{t('משך כולל בתוכנית','Prescribed total')}: {clock(total)} ({total} {t('שניות','seconds')})</span>}
  <details><summary>{t('יעדים שנקבעו','Prescribed targets')}</summary><dl>{Object.entries(targets).map(([key,v])=><div key={key}><dt>{cardioMetricLabel(value.activityId,key as keyof CardioMetrics,en)}</dt><dd>{v}</dd></div>)}</dl>{value.intervals?.map(i=><p key={i.id}>{phase(i.phase)} · {i.durationSeconds} {t('שניות','seconds')} × {i.repeat??1}</p>)}</details>
 </div>;
}
