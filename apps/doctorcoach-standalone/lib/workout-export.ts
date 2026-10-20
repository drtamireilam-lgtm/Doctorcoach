import {hasTotalLoad,fromKg} from './load-units.ts';
import {estimated1RM,targetRpeForSet,unitLabels,type TrainingSession,type SetResult} from './training.ts';
import {setEstimated1RM} from './set-load.ts';
import {workoutSection} from './workout-sections.ts';
import {effortName,effortValue} from './effort.ts';
export function workoutExportRows(history:TrainingSession[]){
 const headers=['תאריך','תרגיל','סט','בוצע','כמות','יחידה','משקל','שיטת מאמץ','יעד מאמץ','מאמץ בפועל','e1RM לפי חזרות','e1RM מותאם מאמץ','כאב לפני','כאב אחרי','כאב במהלך הסט','כאב ביום שאחרי','תאריך היום שאחרי','שינה בתחילת האימון','אנרגיה בתחילת האימון','עומס מורגש בתחילת האימון','סוג סט','מזהה הופעה','צד','יחידת משקל מקור','משקל מקור מתוכנן','בסיס מדידה','משקל ביצוע ביחידת מקור'];
 const rows:(string|number)[][]=[headers];
 for(const session of history)for(const item of session.items){
  function append(result:SetResult,index:number,warmup:boolean){
   const work=!warmup&&workoutSection(item)==='main';
   rows.push([session.finishedAt??session.startedAt,item.name,index+1,result.done?'כן':'לא',result.amount,unitLabels[item.unit],result.weight,warmup?'':effortName(item.effortScale),warmup?'':effortValue(targetRpeForSet(item,index),item.effortScale)??'',warmup?'':effortValue(result.actualRpe,item.effortScale)??'',work&&hasTotalLoad(item)&&result.done&&item.unit==='reps'?estimated1RM(result.weight,result.amount)??'':'',work&&hasTotalLoad(item)&&result.done?setEstimated1RM(result,item.unit)??'':'',session.before,session.after??'',result.painDuring??'',session.followup?.pain??'',session.followup?.day??'',session.readiness?.data.sleep??'',session.readiness?.data.energy??'',session.readiness?.data.stress??'',warmup?'warmup':work?'working':'preparation',item.occurrenceId??'',item.side??'',item.load?.sourceUnit??'kg',item.load?.sourceValue??'',warmup?'warmup-kg':item.load?.basis??'total',warmup?result.weight:fromKg(result.weight,item.load?.sourceUnit??'kg')]);
  }
  item.warmupResults?.forEach((result,index)=>append(result,index,true));
  item.results.forEach((result,index)=>append(result,index,false));
 }
 return rows;
}
