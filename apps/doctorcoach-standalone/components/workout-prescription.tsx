'use client';
import type {PlanItem} from '../lib/training';
import {repetitionLabel,targetRpeForSet} from '../lib/training';
import {fromKg} from '../lib/load-units';
import {effortTarget,effortName,effortValue} from '../lib/effort';
import {useLanguage} from './language-provider';
/** Visible prescription on the existing expandable exercise card. */
export function WorkoutPrescription({item,completed,symbol}:{item:PlanItem;completed?:number;symbol?:string}){
 const en=useLanguage().language==='en',t=(he:string,english:string)=>en?english:he;
 const unit=(item.load?.sourceUnit??'kg')+(item.load?.basis==='per-side'?' '+t('לכל צד','per side'):'');
 const targets=Array.from({length:item.sets},(_,index)=>targetRpeForSet(item,index)),target=targets[0]??null;
 const effortLabel=targets.some(value=>value!==target)?`${effortName(item.effortScale)} ${targets.map(value=>effortValue(value,item.effortScale)??'—').join(' / ')}`:target==null?'—':en?`${effortName(item.effortScale)} ${effortValue(target,item.effortScale)}`:effortTarget({...item,targetRpe:target});
 const values=[[t('סטים','Sets'),String(item.sets)],[t(item.unit==='reps'?'חזרות':item.unit==='seconds'?'שניות':'דקות',item.unit==='reps'?'Reps':item.unit==='seconds'?'Seconds':'Minutes'),repetitionLabel(item)],[t('משקל','Weight'),item.weightUnspecified?'—':new Intl.NumberFormat(en?'en-GB':'he-IL',{maximumFractionDigits:4}).format(fromKg(item.weight,item.load?.sourceUnit??'kg'))+' '+unit],[t('יעד מאמץ','Target effort'),effortLabel]];
 return <div className="workout-prescription-summary">{symbol&&<span className="workout-exercise-symbol" aria-hidden="true">{symbol}</span>}<dl>{values.map(([label,value])=><div key={label}><dt>{label}</dt><dd dir="auto">{value}</dd></div>)}</dl>{completed!==undefined&&<span className={'workout-exercise-state '+(completed===item.sets?'complete':'')}><bdi dir="ltr">{completed}/{item.sets}</bdi> {t('בוצעו','done')}</span>}</div>;
}
