'use client';
import {useLanguage} from './language-provider';
import {targetRpeForSet,type SessionExercise} from '../lib/training';
import {effortName,effortValue} from '../lib/effort';
import {fromKg} from '../lib/load-units';
/** Read recorded snapshots only. Unperformed set values are never presented as performance. */
export function WorkoutSetReadback({item,warmup=false}:{item:SessionExercise;warmup?:boolean}){
 const en=useLanguage().language==='en',t=(he:string,english:string)=>en?english:he;
 const sets=warmup?item.warmupResults??[]:item.results,unit=warmup?'kg':(item.load?.sourceUnit??'kg');
 const amountLabel=item.unit==='reps'?t('חזרות','Reps'):item.unit==='seconds'?t('שניות','Seconds'):t('דקות','Minutes');
 const format=(value:number|null|undefined)=>value==null?'—':new Intl.NumberFormat(en?'en-GB':'he-IL',{maximumFractionDigits:4}).format(value);
 return <ol className="workout-set-readback" aria-label={warmup?t('סטי חימום שנרשמו','Recorded warm-up sets'):t('ביצועים לפי סט','Recorded sets')} data-no-translate>{sets.map((set,index)=><li key={index} data-recorded-set={set.done?'done':'unrecorded'}>
  <header><strong>{warmup?t('חימום','Warm-up'):t('סט','Set')} {index+1}</strong><span>{set.done?t('בוצע','Completed'):t('לא סומן כבוצע','Not recorded as completed')}</span></header>
  {set.done&&<dl><div><dt>{t('משקל','Weight')}{!warmup&&item.load?.basis==='per-side'?' · '+t('לכל צד','Per side'):''}</dt><dd data-field="weight"><bdi>{set.weight==null?'—':format(fromKg(set.weight,unit))+' '+unit}</bdi></dd></div><div><dt>{amountLabel}</dt><dd data-field="amount"><bdi>{format(set.amount)}</bdi></dd></div>{!warmup&&<div><dt>{effortName(item.effortScale)} {t('יעד','Target')}</dt><dd data-field="target"><bdi>{format(effortValue(targetRpeForSet(item,index),item.effortScale))}</bdi></dd></div>}<div><dt>{effortName(item.effortScale)} {t('בפועל','Actual')}</dt><dd data-field="actual"><bdi>{format(effortValue(set.actualRpe,item.effortScale))}</bdi></dd></div>{set.painDuring!=null&&<div><dt>{t('כאב שדווח','Reported pain')}</dt><dd data-field="pain"><bdi>{format(set.painDuring)}/10</bdi></dd></div>}</dl>}
 </li>)}</ol>;
}
