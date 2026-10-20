'use client';
import {useLoadUnit} from './load-unit-picker';
import {fromKg} from '../lib/load-units';
import {useLanguage} from './language-provider';
import type {SessionExercise} from '../lib/training';
import type {nextSetLoad} from '../lib/set-load';
/** Presentation only: existing calculation and load guardrails are unchanged. */
export function NextSetCalculation({item,index,suggestion,preview=false}:{item:SessionExercise;index:number;suggestion:ReturnType<typeof nextSetLoad>;preview?:boolean}){
 const unit=useLoadUnit();
 const english=useLanguage().language==='en';
 if(suggestion.calculatedWeight===null||!item.results[index+1])return null;
 const weight=new Intl.NumberFormat(english?'en-GB':'he-IL',{maximumFractionDigits:1}).format(fromKg(suggestion.calculatedWeight,unit));
 const direction=(suggestion.relativePercent??0)>0?'↑':(suggestion.relativePercent??0)<0?'↓':'↔';
 return <span className="next-set-calculation compact-next-set" role="status">{english?'Next set':'הסט הבא'}: <strong dir="ltr">{weight} {unit} {direction}</strong>{preview&&<small>{english?'Preview':'תצוגה מקדימה'}</small>}</span>;
}
