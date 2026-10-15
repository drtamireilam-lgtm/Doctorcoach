'use client';
import {effortTarget,effortName,effortValue} from '../lib/effort';
import {targetRpeForSet,type SessionExercise} from '../lib/training';
import {useLanguage} from './language-provider';
import type {nextSetLoad} from '../lib/set-load';

/** Same unrounded calculation in the trainee workout and the team's review. */
export function NextSetCalculation({item,index,suggestion,preview=false}:{item:SessionExercise;index:number;suggestion:ReturnType<typeof nextSetLoad>;preview?:boolean}){
 const english=useLanguage().language==='en';
 if(suggestion.calculatedWeight===null||!item.results[index+1])return null;
 const format=(value:number)=>new Intl.NumberFormat(english?'en-GB':'he-IL',{maximumFractionDigits:1}).format(value);
 const change=Math.round((suggestion.calculatedWeight-item.results[index].weight)*10)/10;
 const target=targetRpeForSet(item,index+1);
 const targetLabel=english?`${effortName(item.effortScale)} target ${effortValue(target,item.effortScale)}`:effortTarget({...item,targetRpe:target});
 const percent=suggestion.relativePercent??0;
 const relative=english?(percent===0?'No calculated change from the previous set.':`Calculated ${percent>0?'increase':'decrease'} of ${format(Math.abs(percent))}% from the previous set.`):suggestion.text;
 return <div className="next-set-calculation">
  {preview&&<p>{english?'Next-set preview — this report has not been saved yet.':'תצוגה מקדימה לסט הבא — הדיווח עדיין לא נשמר.'}</p>}
  <strong>{english?'Calculated weight for set':'משקל מחושב לסט'} {index+2}: {format(suggestion.calculatedWeight)} {english?'kg':'ק״ג'} × {item.results[index+1].amount} · {targetLabel}</strong>
  <p>{english?(change===0?'No calculated weight change':`Calculated ${change>0?'addition':'reduction'}: ${format(Math.abs(change))} kg`):(change>0?`תוספת מחושבת: ${format(change)} ק״ג`:change<0?`הפחתה מחושבת: ${format(Math.abs(change))} ק״ג`:'ללא שינוי מחושב במשקל')} · {relative}</p>
  <p>{english?'The calculation is not rounded to equipment increments. Choose and enter the weight you will actually use for the next set.':'הערך המחושב אינו מעוגל לפי הציוד. בחרו והזינו את המשקל שתבצעו בפועל בסט הבא.'}</p>
 </div>;
}
