'use client';
import {useEffect,useRef,useState} from 'react';
import {Localize} from './language-provider';
import {exerciseOccurrenceKey,unitLabels,unitMax,type SessionExercise,type SetResult} from '../lib/training';
export type WarmupSetPatch={action:'warmupSet';exerciseId:string;occurrenceId?:string;setIndex:number;done:boolean;amount:number;weight:number};
type Props={item:SessionExercise;onSave:(payload:WarmupSetPatch)=>Promise<unknown>;disabled?:boolean;onDraftChange?:(key:string,dirty:boolean)=>void};
export function WarmupSets({item,onSave,disabled,onDraftChange}:Props){
 if(!item.warmupResults?.length)return null;
 return <Localize><section aria-label="סטים לחימום" className="care-form"><h4>סטים לחימום</h4>{item.warmupResults.map((set,index)=><WarmupRow key={`${exerciseOccurrenceKey(item)}:warmup:${index}`} item={item} saved={set} index={index} onSave={onSave} disabled={disabled} onDraftChange={onDraftChange}/>)}</section></Localize>;
}
function WarmupRow({item,saved,index,onSave,disabled,onDraftChange}:Props&{saved:SetResult;index:number}){
 const [amount,setAmount]=useState(String(saved.amount)),[weight,setWeight]=useState(String(saved.weight)),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const key=`${exerciseOccurrenceKey(item)}:warmup:${index}`;
 const notify=useRef(onDraftChange);
 useEffect(()=>{notify.current=onDraftChange;},[onDraftChange]);
 const dirty=amount!==String(saved.amount)||weight!==String(saved.weight);
 useEffect(()=>{notify.current?.(key,dirty);return()=>notify.current?.(key,false);},[key,dirty]);
 // Refreshes/conflicts retain a user's draft, while accepted values become clean.
 const previous=useRef(saved);
 useEffect(()=>{if(amount===String(previous.current.amount))setAmount(String(saved.amount));if(weight===String(previous.current.weight))setWeight(String(saved.weight));previous.current=saved;},[saved,amount,weight]);
 const valid=amount.trim()!==''&&weight.trim()!==''&&Number.isInteger(Number(amount))&&Number(amount)>=1&&Number(amount)<=unitMax[item.unit]&&Number.isFinite(Number(weight))&&Number(weight)>=0&&Number(weight)<=1000;
 async function save(done:boolean){if(!valid||busy)return;setBusy(true);setError('');try{const result=await onSave({action:'warmupSet',exerciseId:item.exerciseId,occurrenceId:item.occurrenceId,setIndex:index,done,amount:Number(amount),weight:Number(weight)});if(result===null||result===false)setError('הסט לא נשמר. נסו שוב.');}catch{setError('הסט לא נשמר. נסו שוב.');}finally{setBusy(false);}}
 return <fieldset className="care-grid" disabled={disabled||busy}><legend>חימום {index+1}{saved.done?' · בוצע':''}</legend><label className="care-field"><span>{unitLabels[item.unit]}</span><input type="number" min="1" max={unitMax[item.unit]} step="1" value={amount} onChange={e=>setAmount(e.target.value)}/></label><label className="care-field"><span>משקל בק״ג</span><input type="number" min="0" max="1000" step="0.25" value={weight} onChange={e=>setWeight(e.target.value)}/></label><button type="button" className="primary" disabled={!valid} onClick={()=>void save(dirty?true:!saved.done)}>{busy?'שומר…':dirty?'שמירת ביצוע חימום':saved.done?'ביטול ביצוע חימום':'סימון חימום כבוצע'}</button>{error&&<p role="alert">{error}</p>}</fieldset>;
}
