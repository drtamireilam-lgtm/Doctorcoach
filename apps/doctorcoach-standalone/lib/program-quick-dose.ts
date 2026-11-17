import {TrainingError,parseRpe,unitMax,type PlanItem} from './training.ts';
import {effortValue,canonicalEffort} from './effort.ts';
import {programDosePatch} from './import-source.ts';
import {parseRestSeconds} from './rest-prescription.ts';
export type QuickDoseField='sets'|'reps'|'rest'|'effort';
export function quickDoseBlocked(item:PlanItem,field:QuickDoseField){
 if(item.cardio||!['reps','seconds','minutes'].includes(item.unit))return true;
 if((field==='sets'||field==='reps')&&item.setReps?.length)return true;
 if(field==='effort'&&item.targetRpes?.length){const values=Array.from({length:item.sets},(_,n)=>n<item.targetRpes!.length?item.targetRpes![n]:item.targetRpe??null);return values.some(v=>v!==values[0]);}
 return false;
}
export function quickDoseValue(item:PlanItem,field:QuickDoseField):string{
 if(field==='sets')return String(item.sets);
 if(field==='reps')return String(item.reps);
 if(field==='rest')return item.restSeconds==null?'':String(item.restSeconds);
 const target=item.targetRpes?.length?item.targetRpes[0]:item.targetRpe;
 return String(effortValue(target,item.effortScale)??'');
}
/** Only dependencies of this field participate: unrelated editor changes remain safe. */
export function quickDoseSignature(item:PlanItem,field:QuickDoseField):string{
 if(field==='sets')return JSON.stringify([item.sets,item.setReps,item.targetRpes,item.targetRpe]);
 if(field==='reps')return JSON.stringify([item.unit,item.reps,item.repsMax,item.setReps]);
 if(field==='rest')return JSON.stringify(item.restSeconds??null);
 return JSON.stringify([item.sets,item.targetRpes,item.targetRpe,item.effortScale]);
}
export function quickDosePatch(item:PlanItem,field:QuickDoseField,raw:string):Partial<PlanItem>{
 if(quickDoseBlocked(item,field))throw new TrainingError('Edit this prescription individually in the advanced editor.');
 const text=raw.trim();
 if(field==='rest')return {restSeconds:parseRestSeconds(text)};
 if(field==='effort'){
  if(text&&!/^\d+(?:\.\d+)?$/.test(text))throw new TrainingError('Enter a valid effort target.');
  const target=parseRpe(canonicalEffort(text,item.effortScale));
  return {targetRpe:target,...(item.targetRpes?{targetRpes:Array.from({length:item.sets},()=>target)}:{})};
 }
 if(!/^\d+$/.test(text))throw new TrainingError('Enter a whole number.');
 const value=Number(text),max=field==='sets'?20:unitMax[item.unit];
 if(!Number.isInteger(value)||value<1||value>max||field==='reps'&&item.unit==='reps'&&item.repsMax!=null&&value>item.repsMax)throw new TrainingError('The dose is outside its allowed range.');
 return programDosePatch(item,field==='sets'?{sets:value,...(item.targetRpes?{targetRpes:Array.from({length:value},(_,n)=>n<item.targetRpes!.length?item.targetRpes![n]:item.targetRpe??null)}:{})}:{reps:value});
}
