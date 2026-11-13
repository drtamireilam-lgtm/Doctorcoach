'use client';
import {useLoadUnit} from './load-unit-picker';
import {fromKg} from '../lib/load-units';
import {useLanguage} from './language-provider';
import type {SessionExercise} from '../lib/training';
import {targetRpeForSet} from '../lib/training';
import {effortName,effortValue} from '../lib/effort';
import type {nextSetLoad} from '../lib/set-load';
/** Presentation only; the shared engine owns all load guardrails. */
export function NextSetCalculation({item,index,suggestion,preview=false,expanded=false,actualRpe,sourceWeight,targetRpe}:{item:SessionExercise;index:number;suggestion:ReturnType<typeof nextSetLoad>;preview?:boolean;expanded?:boolean;actualRpe?:number|null;sourceWeight?:number|null;targetRpe?:number|null}){
 const unit=useLoadUnit();
 const english=useLanguage().language==='en';
 const actual=actualRpe===undefined?item.results[index].actualRpe:actualRpe,target=targetRpe===undefined?targetRpeForSet(item,index):targetRpe;
 const feedback=actual!=null&&target!=null?(actual>target?(english?'Harder than target':'קשה מהיעד'):actual<target?(english?'Easier than target':'קל מהיעד'):(english?'On target':'בהתאם ליעד')):null;
 const comparison=feedback&&<small>{feedback} · <bdi>{effortName(item.effortScale)} {effortValue(actual,item.effortScale)} / {english?'target':'יעד'} {effortValue(target,item.effortScale)}</bdi></small>;
 if(!item.results[index+1])return expanded&&comparison?<div className="workout-recommendation" role="status">{comparison}</div>:null;
 if(suggestion.calculatedWeight===null){
  if(!expanded)return null;
  const reasons:Record<string,string>={
   'המשקל נמדד לכל צד; נדרש עומס כולל מפורש לחישובי כוח.':'Per-side load needs an explicit total load before a recommendation can be calculated.',
   'הצעת משקל זמינה לתרגילי האימון בלבד, לא לחימום או למתיחות.':'Load recommendations apply to working sets, not warm-ups or stretches.',
   'דווח כאב — התאמת העומס תיעשה עם הצוות.':'Pain reported — discuss load adjustments with your team.',
   'לחישוב נדרשים משקל חיצוני, 1–10 חזרות ו־RPE בין 6 ל־10.':'Enter an external load, 1–10 repetitions and RPE between 6 and 10.',
   'לחישוב נדרשים משקל חיצוני, 1–10 חזרות ו־RIR בין 0 ל־4.':'Enter an external load, 1–10 repetitions and RIR between 0 and 4.',
   'להתאמת משקל נדרש RPE יעד בין 6 ל־10.':'A target RPE between 6 and 10 is required.',
   'להתאמת משקל נדרש RIR יעד בין 0 ל־4.':'A target RIR between 0 and 4 is required.',
   'בדקו את מספר החזרות בסט הבא.':'Check the next set: 1–10 repetitions are required.',
   'כבר נשמר ביצוע בסט מאוחר יותר.':'A later set has already been recorded.',
  };
  return <div className="next-set-calculation workout-recommendation" role="status">{comparison}<span>{english?'No load recommendation':'אין המלצת משקל'}</span><small>{english?(reasons[suggestion.text]??'Complete compatible set data before calculating a recommendation.'):suggestion.text}</small></div>;
 }
 const weight=new Intl.NumberFormat(english?'en-GB':'he-IL',{maximumFractionDigits:4}).format(fromKg(suggestion.weight??suggestion.calculatedWeight,unit));
 const change=suggestion.weight!=null?suggestion.weight-(sourceWeight??item.results[index].weight??suggestion.weight):suggestion.relativePercent??0;
 const direction=change>0?'↑':change<0?'↓':'↔';
 const compact=<span className="next-set-calculation compact-next-set">{english?'Next set':'הסט הבא'}: <strong dir="ltr">{weight} {unit} {direction}</strong>{preview&&<small>{english?'Preview':'תצוגה מקדימה'}</small>}</span>;
 if(!expanded)return <span role="status">{compact}</span>;
 return <div className="workout-recommendation" role="status">{compact}{comparison}{suggestion.fatigueLimited&&<small className="workout-performance-note">{english?'Declining performance across three sets: no increase suggested.':'ירידה בביצוע בשלושה סטים: לא מוצעת עלייה במשקל.'}</small>}<small>{english?'Calculated estimate; choose the actual load that suits you.':'אומדן מחושב; המשקל בפועל לבחירתך.'}</small></div>;
}
