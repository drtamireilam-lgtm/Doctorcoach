import {inputRecord,integerField,textField,validId} from './care.ts';
import {TrainingError} from './training.ts';
import {rehabStages,parseMilestones} from './rehab-journey.ts';
export const bodyRegions=['כתף','מרפק','שורש כף יד','צוואר','גב תחתון','ירך','ברך','קרסול'] as const;
export type WellnessKind='assessment'|'plan'|'daily'|'weekly'|'weeklyReview'|'rehab'|'episode'|'return'|'readiness';
export type WellnessRecord={id:string;kind:WellnessKind;slot:string;day:string;data:Record<string,string|number|boolean|null>;version:number;authorName:string;updatedAt:string};
export type ReturnPlanRevision=WellnessRecord&{baseline:boolean};
export type WellnessBundle={records:WellnessRecord[];returnHistory?:ReturnPlanRevision[];returnHistoryTotal?:number;returnHistoryTotals?:Record<string,number>;self:boolean;canNutrition:boolean;canPlan:boolean;canReturn:boolean;today:string;summary:{weight:number|null;adherence:number|null;lastDay:string;planUpdatedAt:string|null}|null;nutritionShared:boolean};
export function todayIsrael(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function dayField(value:unknown){const day=textField(value,'תאריך',10,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||Number.isNaN(Date.parse(day+'T12:00:00Z'))||new Date(day+'T12:00:00Z').toISOString().slice(0,10)!==day||day>todayIsrael()||day<'2000-01-01')throw new TrainingError('בחרו תאריך תקין שאינו בעתיד.');return day;}
function numberField(v:unknown,label:string,min:number,max:number,required=false):number|null {if((v===null||v===''||v===undefined)&&!required)return null;if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new TrainingError(`${label}: הזינו מספר בין ${min} ל־${max}.`);return v;}
function pick(v:unknown,label:string,values:readonly string[]){if(typeof v!=='string'||!values.includes(v))throw new TrainingError(`${label}: בחרו ערך מהרשימה.`);return v;}
export function parseWellness(kind:WellnessKind,input:unknown):WellnessRecord['data'] {
 const p=inputRecord(input);const text=(key:string,label:string,max=2000,min=0)=>textField(p[key]??'',label,max,min);const num=(key:string,label:string,min:number,max:number,required=false)=>numberField(p[key],label,min,max,required);
 switch(kind){
 case 'assessment':return {goal:text('goal','מטרת הליווי',1500,2),routine:text('routine','שגרת אכילה'),preferences:text('preferences','העדפות ומגבלות'),allergies:text('allergies','אלרגיות'),history:text('history','רקע תזונתי'),shareTeam:p.shareTeam===true};
 case 'plan':return {mode:pick(p.mode,'סוג תוכנית',['flexible','macros']),principles:text('principles','עקרונות התוכנית',5000,2),calories:num('calories','קלוריות',500,10000),protein:num('protein','חלבון',0,600),carbs:num('carbs','פחמימות',0,1500),fat:num('fat','שומן',0,500),trainingDay:text('trainingDay','יום אימון'),restDay:text('restDay','יום מנוחה')};
 case 'daily':return {weight:num('weight','משקל',20,400),waist:num('waist','היקף מותניים',30,250),hip:num('hip','היקף ירך/אגן',30,250),adherence:integerField(p.adherence,'התמדה בתוכנית',0,10),dayType:pick(p.dayType,'סוג יום',['training','rest']),note:text('note','דיווח תזונה',1500)};
 case 'readiness':return {sleep:num('sleep','שעות שינה',0,24,true),energy:integerField(p.energy,'אנרגיה',0,10),stress:integerField(p.stress,'עומס מורגש',0,10),note:text('note','תחושה היום',1000)};
 case 'weekly':return {success:text('success','מה עבד השבוע',2000,2),difficulty:text('difficulty','מה היה קשה'),question:text('question','שאלה לדיאטן')};
 case 'weeklyReview':return {response:text('response','מענה הדיאטן',4000,2)};
 case 'rehab':return {...(p.episodeId?{episodeId:validId(p.episodeId)}:{}),region:pick(p.region,'אזור בגוף',bodyRegions),side:pick(p.side,'צד',['ימין','שמאל','מרכז']),motion:text('motion','תנועה שנמדדה',100,2),pain:integerField(p.pain,'כאב',0,10),rom:num('rom','טווח תנועה במעלות',0,360),functionScore:integerField(p.functionScore,'תפקוד',0,10),response:pick(p.response,'תגובה לאימון',['לפני אימון','אחרי אימון','למחרת','ללא אימון']),note:text('note','הערה',1500)};
 case 'episode':return {label:text('label','שם הפציעה או הבעיה',150,2),region:pick(p.region,'אזור בגוף',bodyRegions),side:pick(p.side,'צד',['ימין','שמאל','מרכז']),status:pick(p.status,'מצב',['active','closed'])};
 case 'return':return {...(p.episodeId?{episodeId:validId(p.episodeId)}:{}),stage:pick(p.stage,'שלב חזרה',rehabStages),goal:text('goal','יעד',1500,2),criteria:text('criteria','תנאים להתקדמות',3000,2),limits:text('limits','מגבלות והנחיות',3000),milestones:parseMilestones(p.milestones)};
 default:throw new TrainingError('סוג רשומה לא מוכר.');
 }
}
