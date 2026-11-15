import {TrainingError,isRecord,unitMax,type TrainingSession,type SessionExercise} from './training.ts';
import {workoutSection} from './workout-sections.ts';
export type CompletedSetCorrection={sessionId:string;version:number;requestId:string;exerciseId:string;occurrenceId:string;setIndex:number;amount:number;weight:number;actualRpe:number|null};
export function canCorrectCompletedSet(session:TrainingSession,item:SessionExercise,index:number):boolean {
 return session.status==='completed'&&!session.retrospective&&workoutSection(item)==='main'&&!item.cardio&&item.unit==='reps'&&Number.isInteger(index)&&index>=0&&item.results?.[index]?.done===true;
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const keys=['sessionId','version','requestId','exerciseId','occurrenceId','setIndex','amount','weight','actualRpe'];
export function parseCompletedSetCorrection(value:unknown):CompletedSetCorrection {
 if(!isRecord(value)||Object.keys(value).length!==keys.length||Object.keys(value).some(k=>!keys.includes(k))||keys.some(k=>!(k in value))||
  typeof value.sessionId!=='string'||!value.sessionId||typeof value.exerciseId!=='string'||!value.exerciseId||typeof value.occurrenceId!=='string'||!value.occurrenceId||
  typeof value.requestId!=='string'||!uuid.test(value.requestId)||!Number.isSafeInteger(value.version)||Number(value.version)<0||
  !Number.isInteger(value.setIndex)||Number(value.setIndex)<0||!Number.isInteger(value.amount)||Number(value.amount)<1||Number(value.amount)>unitMax.reps||
  typeof value.weight!=='number'||!Number.isFinite(value.weight)||value.weight<0||value.weight>1000||
  !(value.actualRpe===null||typeof value.actualRpe==='number'&&Number.isFinite(value.actualRpe)&&value.actualRpe>=1&&value.actualRpe<=10&&Number.isInteger(value.actualRpe*2)))
  throw new TrainingError('פרטי תיקון הסט אינם תקינים.');
 return Object.fromEntries(keys.map(k=>[k,value[k]])) as CompletedSetCorrection;
}
