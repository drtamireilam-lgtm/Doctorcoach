'use client';
import type {PlanItem} from '../lib/training';
import {useLanguage} from './language-provider';
export function RestPrescription({item,onChange}:{item:PlanItem;onChange?:(rest:number|null)=>void}){
 const en=useLanguage().language==='en',label=en?'Rest between sets (seconds)':'מנוחה בין סטים (שניות)';
 return onChange?<label className="care-field">{label}<input aria-label={label} type="number" inputMode="numeric" min={0} max={1800} step={1} value={item.restSeconds??''} placeholder={en?'Not specified':'לא צוין'} onChange={e=>onChange(e.target.value===''?null:Number(e.target.value))}/><span className="field-hint">{en?'0 means no rest; blank leaves rest unspecified.':'0 = ללא מנוחה; שדה ריק = לא צוין.'}</span></label>:item.restSeconds==null?null:<p>{en?'Rest':'מנוחה'}: {item.restSeconds} {en?'seconds':'שניות'}</p>;
}
