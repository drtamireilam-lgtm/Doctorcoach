import { defaultPrescription, isRecord, parsePlanItem, withOccurrenceIds, TrainingError } from './training.ts';
import { exercises } from './content.ts';
import type { PlanItem, TrainingFeed } from './training.ts';
export type CareRole = 'clinician'|'coach'|'dietitian'|'coordinator';
export type CareStaff = {email:string;name:string;role:CareRole};
export type CareProfile = {userId:string;name:string;goal:string;experience:string;equipment:string;days:number;medical?:{painAreas:string;injuryHistory:string;medicalHistory:string};version:number;updatedAt:string};
export type CareConnection = {id:string;name:string;role:CareRole};
export type CareNote = {id:string;authorName:string;kind:'medical'|'training'|'nutrition';content:string;shared:boolean;mentionEmail?:string;createdAt:string};
export type CareProgram = {id:string;title:string;authorName:string;items:PlanItem[];createdAt:string;appliedAt:string|null};
export type CareCheckin = {id:string;week:string;sessions:number;pain:number;functionScore:number;effort:number;content:string;response:string;reviewer:string|null;reviewedAt:string|null;createdAt:string};
export type CareBundle = {profile:CareProfile|null;connections:CareConnection[];notes:CareNote[];programs:CareProgram[];activeProgramId:string|null;checkins:CareCheckin[];training:TrainingFeed;canViewMedical:boolean;canViewNutrition:boolean;viewerRole:CareRole|null;canManagePrograms?:boolean;canManageTeamAssignments?:boolean;assignableCoaches?:CareStaff[];week:string};
export type CareClient = {userId:string;name:string;goal:string;updatedAt:string;pendingCheckins:number;pendingVideos:number};
export const roleNames:Record<CareRole,string>={clinician:'רופא',coach:'מאמן',dietitian:'דיאטן קליני',coordinator:'תיאום תורים'};
export function textField(value:unknown,label:string,max=1000,min=0):string {
  if(typeof value!=='string'||value.trim().length<min||value.trim().length>max)throw new TrainingError(`${label}: יש להזין ${min}–${max} תווים.`);
  return value.trim();
}
export function inputRecord(value:unknown):Record<string,unknown>{if(!isRecord(value))throw new TrainingError('פרטי הבקשה אינם תקינים.');return value;}
export function integerField(value:unknown,label:string,min:number,max:number):number{if(typeof value!=='number'||!Number.isInteger(value)||value<min||value>max)throw new TrainingError(`${label}: יש לבחור מספר בין ${min} ל־${max}.`);return value;}
export function validId(value:unknown):string {if(typeof value!=='string'||!/^[0-9a-f-]{36}$/i.test(value))throw new TrainingError('מזהה הבקשה אינו תקין.');return value;}
export function validEmail(value:unknown):string {const email=textField(value,'דוא״ל',254,5).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new TrainingError('כתובת הדוא״ל אינה תקינה.');return email;}
export function parseProfile(input:unknown){const p=inputRecord(input);const m=inputRecord(p.medical);return {name:textField(p.name,'שם',100,2),goal:textField(p.goal,'מטרה',1000,3),experience:textField(p.experience,'ניסיון',500),equipment:textField(p.equipment,'ציוד',500),days:integerField(p.days,'אימונים בשבוע',0,7),medical:{painAreas:textField(m.painAreas,'אזורי כאב',1000),injuryHistory:textField(m.injuryHistory,'פציעות קודמות',2000),medicalHistory:textField(m.medicalHistory,'מידע רפואי',2000)},version:integerField(p.version,'גרסה',0,1000000)};}
export function parseAssignedItems(value:unknown,customs:import('./custom-exercise-types.ts').CustomExercise[]=[]):PlanItem[]{
 if(!Array.isArray(value)||value.length<1||value.length>30)throw new TrainingError('התוכנית צריכה לכלול 1–30 תרגילים.');
 const ids=new Set<string>();
 const result=value.map(v=>{
  const custom=isRecord(v)?customs.find(e=>e.id===v.exerciseId):undefined;
  const item=parsePlanItem(v,custom?{...defaultPrescription(custom.id),unit:custom.unit,workoutSection:custom.kind==='מתיחה'?'stretch':'main',customExercise:custom}:undefined);
  const dayId=isRecord(v)?v.dayId:undefined;
  if(dayId!==undefined&&(typeof dayId!=='string'||!/^[1-7]$/.test(dayId)))throw new TrainingError('בחרו יום אימון בין 1 ל־7.');
  const key=item.occurrenceId;
  if(!exercises.some(e=>e.id===item.exerciseId)&&!custom)throw new TrainingError('יש לבחור תרגיל מוכר מהספרייה.');
  if(key!==undefined){if(ids.has(key))throw new TrainingError('מזהה הופעת תרגיל כפול בתוכנית.');ids.add(key);}
  const alternatives=isRecord(v)?v.approvedSubstitutions:undefined;
  if(alternatives!==undefined&&(!Array.isArray(alternatives)||alternatives.length>10||new Set(alternatives).size!==alternatives.length||alternatives.some(id=>typeof id!=='string'||id===item.exerciseId||!exercises.some(e=>e.id===id)||defaultPrescription(id).unit!==item.unit)))throw new TrainingError('בחרו עד 10 חלופות מוכרות ושונות, באותה יחידת מידה וללא כפילויות.');
  return {...item,...(typeof dayId==='string'?{dayId}:{}),...(Array.isArray(alternatives)&&alternatives.length?{approvedSubstitutions:alternatives as string[]}: {})};
 });
 return withOccurrenceIds(result);
}
export function currentWeek(now=new Date()):string{const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);const date=new Date(day+'T00:00:00Z');date.setUTCDate(date.getUTCDate()-date.getUTCDay());return date.toISOString().slice(0,10);}
export async function inviteHash(code:unknown):Promise<string>{const normalized=textField(code,'קוד הזמנה',80,12).replace(/[\s-]/g,'').toUpperCase();const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(normalized));return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');}
