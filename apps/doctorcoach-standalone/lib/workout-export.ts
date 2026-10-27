import {performedCardioSeconds} from './cardio.ts';
import {hasTotalLoad,fromKg} from './load-units.ts';
import {estimated1RM,targetRpeForSet,unitLabels,type TrainingSession,type SetResult} from './training.ts';
import {setEstimated1RM} from './set-load.ts';
import {workoutSection} from './workout-sections.ts';
import {csvCell} from './feedback-report.ts';
import {effortName,effortValue} from './effort.ts';
export const workoutExportHeaders=['תאריך','תרגיל','סט','בוצע','כמות','יחידה','משקל','שיטת מאמץ','יעד מאמץ','מאמץ בפועל','e1RM לפי חזרות','e1RM מותאם מאמץ','כאב לפני','כאב אחרי','כאב במהלך הסט','כאב ביום שאחרי','תאריך היום שאחרי','שינה בתחילת האימון','אנרגיה בתחילת האימון','עומס מורגש בתחילת האימון','סוג סט','מזהה הופעה','צד','יחידת משקל מקור','משקל מקור מתוכנן','בסיס מדידה','משקל ביצוע ביחידת מקור','מזהה אירובי','זמן אירובי בפועל (שניות)','מרחק בפועל (מטר)','קצב (שניות)','יחידת קצב','מהירות (קמ״ש)','שיפוע (%)','התנגדות','תיאור התנגדות','קדנס','דופק ממוצע','RPE אירובי','דופק מרבי','אורך בריכה (מטר)','בריכות שהושלמו','קלוריות מדווחות','סטטוס אירובי','מרשם אירובי JSON','מזהה אימון','אזור דופק','מקורות מדדים JSON'];
export function workoutExportRows(history:TrainingSession[]){
 const rows:(string|number)[][]=[workoutExportHeaders];
 for(const session of history)for(const item of session.items){
  if(item.cardio){
   const result=item.cardioResult,metrics=result?.metrics??{},paceUnit=['rowing_machine','skierg'].includes(item.cardio.activityId)?'seconds/500m':item.cardio.activityId==='swimming'?'seconds/100m':'seconds/km';
   rows.push([session.finishedAt??session.startedAt,item.name,'',result?.status==='completed'?'כן':'לא','','','','','','','','',session.before,session.after??'','',session.followup?.pain??'',session.followup?.day??'',session.readiness?.data.sleep??'',session.readiness?.data.energy??'',session.readiness?.data.stress??'','cardio',item.occurrenceId??'',item.side??'','','','','',item.cardio.activityId,result?performedCardioSeconds(result):'',metrics.distanceMeters??'',metrics.paceSeconds??'',metrics.paceSeconds===undefined?'':paceUnit,metrics.speedKph??'',metrics.inclinePercent??'',metrics.resistance??'',metrics.resistanceLabel??'',metrics.cadence??'',metrics.heartRate??'',metrics.rpe??'',metrics.maxHeartRate??'',metrics.poolLengthMeters??'',metrics.lengths??'',metrics.calories??'',result?.status??'not_started',JSON.stringify(item.cardio),session.id,metrics.heartRateZone??'',JSON.stringify(result?.metricSources??{})]);
   continue;
  }
  function append(result:SetResult,index:number,warmup:boolean){
   const work=!warmup&&workoutSection(item)==='main';
   rows.push([session.finishedAt??session.startedAt,item.name,index+1,result.done?'כן':'לא',result.amount,unitLabels[item.unit],result.weight,warmup?'':effortName(item.effortScale),warmup?'':effortValue(targetRpeForSet(item,index),item.effortScale)??'',warmup?'':effortValue(result.actualRpe,item.effortScale)??'',work&&hasTotalLoad(item)&&result.done&&item.unit==='reps'?estimated1RM(result.weight,result.amount)??'':'',work&&hasTotalLoad(item)&&result.done?setEstimated1RM(result,item.unit)??'':'',session.before,session.after??'',result.painDuring??'',session.followup?.pain??'',session.followup?.day??'',session.readiness?.data.sleep??'',session.readiness?.data.energy??'',session.readiness?.data.stress??'',warmup?'warmup':work?'working':'preparation',item.occurrenceId??'',item.side??'',item.load?.sourceUnit??'kg',item.load?.sourceValue??'',warmup?'warmup-kg':item.load?.basis??'total',warmup?result.weight:fromKg(result.weight,item.load?.sourceUnit??'kg'),...Array.from({length:18},()=>''),session.id,'','']);
  }
  item.warmupResults?.forEach((result,index)=>append(result,index,true));
  item.results.forEach((result,index)=>append(result,index,false));
 }
 return rows;
}

export function workoutExportCsv(history:TrainingSession[]):string{return '\uFEFF'+workoutExportRows(history).map(row=>row.map(csvCell).join(',')).join('\r\n');}
