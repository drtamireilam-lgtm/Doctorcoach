import {estimated1RM,targetRpeForSet,unitLabels,type TrainingSession} from './training.ts';
import {setEstimated1RM} from './set-load.ts';
import {effortName,effortValue} from './effort.ts';
import {csvCell} from './feedback-report.ts';
export const workoutExportHeaders=['תאריך','תרגיל','סט','בוצע','כמות','יחידה','משקל','שיטת מאמץ','יעד מאמץ','מאמץ בפועל','e1RM לפי חזרות','e1RM מותאם מאמץ','כאב לפני','כאב אחרי','כאב במהלך הסט','כאב ביום שאחרי','תאריך היום שאחרי','שינה בתחילת האימון','אנרגיה בתחילת האימון','עומס מורגש בתחילת האימון','סוג פעילות','מזהה אירובי','זמן אירובי בפועל (שניות)','מרחק בפועל (מטר)','קצב (שניות)','יחידת קצב','מהירות (קמ״ש)','שיפוע (%)','התנגדות','תיאור התנגדות','קדנס','דופק ממוצע','RPE אירובי','דופק מרבי','אורך בריכה (מטר)','בריכות שהושלמו','קלוריות מדווחות','סטטוס אירובי','מרשם אירובי JSON','מזהה הופעה','מזהה אימון'];
/** Accept only an already-authorized feed; preserve the original strength column order. */
export function workoutExportRows(history:TrainingSession[]):(string|number)[][]{
 const rows:(string|number)[][]=[workoutExportHeaders];
 for(const s of history){
  const context=[s.before,s.after??'','',s.followup?.pain??'',s.followup?.day??'',s.readiness?.data.sleep??'',s.readiness?.data.energy??'',s.readiness?.data.stress??''];
  for(const i of s.items){
   if(i.cardio){const r=i.cardioResult,m=r?.metrics??{},paceUnit=['rowing_machine','skierg'].includes(i.cardio.activityId)?'seconds/500m':'seconds/km';
    rows.push([s.finishedAt??s.startedAt,i.name,'',r?.status==='completed'?'כן':'לא','','','','','','','','',...context,'cardio',i.cardio.activityId,r?.elapsedSeconds??'',m.distanceMeters??'',m.paceSeconds??'',m.paceSeconds===undefined?'':paceUnit,m.speedKph??'',m.inclinePercent??'',m.resistance??'',m.resistanceLabel??'',m.cadence??'',m.heartRate??'',m.rpe??'',m.maxHeartRate??'',m.poolLengthMeters??'',m.lengths??'',m.calories??'',r?.status??'not_started',JSON.stringify(i.cardio),i.occurrenceId??'',s.id]);continue;}
   for(const [index,r] of i.results.entries())rows.push([s.finishedAt??s.startedAt,i.name,index+1,r.done?'כן':'לא',r.amount,unitLabels[i.unit],r.weight,effortName(i.effortScale),effortValue(targetRpeForSet(i,index),i.effortScale)??'',effortValue(r.actualRpe,i.effortScale)??'',r.done&&i.unit==='reps'?estimated1RM(r.weight,r.amount)??'':'',r.done?setEstimated1RM(r,i.unit)??'':'',...context.map((v,n)=>n===2?r.painDuring??'':v),'strength',...Array.from({length:18},()=>''),i.occurrenceId??'',s.id]);
  }
 }
 return rows;
}
export function workoutExportCsv(history:TrainingSession[]):string{return '\uFEFF'+workoutExportRows(history).map(row=>row.map(csvCell).join(',')).join('\r\n');}
