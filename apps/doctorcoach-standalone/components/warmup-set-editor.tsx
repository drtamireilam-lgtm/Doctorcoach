'use client';
import {Localize} from './language-provider';
import {unitLabels,unitMax,type PlanItem,type WarmupSetPrescription} from '../lib/training';
export function WarmupSetEditor({item,onChange,disabled}:{item:PlanItem;onChange:(sets:WarmupSetPrescription[])=>void;disabled?:boolean}){
 const sets=item.warmupSets??[];
 const update=(index:number,key:'amount'|'weight',value:number)=>onChange(sets.map((set,i)=>i===index?{...set,[key]:value}:set));
 return <Localize><fieldset className="care-form" disabled={disabled}><legend>סטים לחימום</legend>{sets.map((set,index)=><div className="care-grid" key={index}><label className="care-field"><span>חימום {index+1} · {unitLabels[item.unit]}</span><input type="number" min="1" max={unitMax[item.unit]} step="1" value={Number.isFinite(set.amount)?set.amount:''} onChange={e=>update(index,'amount',e.target.value===''?NaN:Number(e.target.value))}/></label><label className="care-field"><span>משקל בק״ג</span><input type="number" min="0" max="1000" step="0.25" value={Number.isFinite(set.weight)?set.weight:''} onChange={e=>update(index,'weight',e.target.value===''?NaN:Number(e.target.value))}/></label><button type="button" className="secondary" onClick={()=>onChange(sets.filter((_,i)=>i!==index))} aria-label={`הסרת סט חימום ${index+1}`}>הסרה</button></div>)}<button type="button" className="secondary" disabled={sets.length>=20} onClick={()=>onChange([...sets,{amount:item.reps,weight:0}])}>הוספת סט חימום</button></fieldset></Localize>;
}
