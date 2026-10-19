'use client';
import {Localize} from './language-provider';
import {EffortInput} from './effort-input';
import {effortName,effortValue,canonicalEffort} from '../lib/effort';
import {targetRpeForSet,type PlanItem} from '../lib/training';
export function SetTargetEditor({item,onChange}:{item:PlanItem;onChange:(targets:(number|null)[])=>void}){
 const update=(index:number,value:number|null)=>onChange(Array.from({length:item.sets},(_,i)=>i===index?value:targetRpeForSet(item,i)));
 return <Localize><details className="panel care-form"><summary>יעד {effortName(item.effortScale)} נפרד לכל סט</summary><p>היעד הרגיל חל על כל הסטים. כאן אפשר לבחור יעד שונה לכל סט; החישוב לסט הבא ישתמש ביעד של אותו סט.</p>{Array.from({length:item.sets},(_,index)=>{const target=targetRpeForSet(item,index);return <div className="care-grid" key={index}><EffortInput target scale={item.effortScale} value={target} onChange={value=>update(index,value)} ariaLabel={`${effortName(item.effortScale)} יעד לסט ${index+1}`}/><label className="care-field"><span>סט {index+1} · {effortName(item.effortScale)} {effortValue(target,item.effortScale)??'לא הוגדר'}</span><input type="range" min={item.effortScale==='rir'?0:6} max={item.effortScale==='rir'?4:10} step="0.5" value={effortValue(target,item.effortScale)??(item.effortScale==='rir'?3:7)} onChange={e=>update(index,canonicalEffort(e.target.value,item.effortScale))} aria-label={`סקאלת יעד מאמץ לסט ${index+1}`}/></label></div>;})}</details></Localize>;
}
