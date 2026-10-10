import {careStore,type CareConfig} from './care-store.ts';
import {careConnectionGuard,combineCareGuards} from './care-write-guard.ts';
import {healthConsentGuard,requireHealthConsent} from './consent-server.ts';
import {wellnessStore} from './wellness-store.ts';
import {inputRecord,integerField,currentWeek} from './care.ts';
import {weeklyProgress,shiftDay} from './weekly-progress.ts';
import {TrainingError,type TrainingSession} from './training.ts';
import type {WellnessRecord} from './wellness.ts';
import {israelDay} from './workout-context.ts';
import type {StaffIdentity} from './staff.ts';
export function validWeek(value:unknown){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T12:00:00Z'))||new Date(value+'T12:00:00Z').getUTCDay()!==0||shiftDay(value,0)!==value||value<'2020-01-01'||value>currentWeek())throw new TrainingError('בחרו שבוע תקין שאינו בעתיד.');return value;}
export function weeklyProgressStore(db:D1Database,config:CareConfig={}){
 const care=careStore(db,config);
 return {
 async report(user:StaffIdentity,clientId:string,week= currentWeek()){
  validWeek(week);const a=await care.authorize(user,clientId);
  const bundle=await wellnessStore(db,config).bundle(user,clientId);
  const measurementRows=await db.prepare("SELECT id,kind,slot,day,content_json,version,author_name,updated_at FROM wellness_records WHERE client_id=? AND kind IN ('rehab','readiness') AND day>=? AND day<?").bind(clientId,shiftDay(week,-7),shiftDay(week,7)).all<{id:string;kind:'rehab'|'readiness';slot:string;day:string;content_json:string;version:number;author_name:string;updated_at:string}>();
  const measurements=measurementRows.results.map(r=>({id:r.id,kind:r.kind,slot:r.slot,day:r.day,data:JSON.parse(r.content_json),version:r.version,authorName:r.author_name,updatedAt:r.updated_at}));
  const stageRows=await db.prepare("SELECT id,day,content_json,version,updated_at FROM return_plan_revisions WHERE client_id=? AND day<=? AND updated_at<? ORDER BY updated_at DESC,version DESC").bind(clientId,shiftDay(week,6),shiftDay(week,8)+'T00:00:00Z').all<{id:string;day:string;content_json:string;version:number;updated_at:string}>();
  const stages:WellnessRecord[]=stageRows.results.map(r=>({id:r.id,kind:'return',slot:'history',day:r.day,data:JSON.parse(r.content_json),version:r.version,authorName:'',updatedAt:r.updated_at}));
  for(const r of bundle.records)if(r.kind==='return')stages.push(r);
  const rows=await db.prepare("SELECT * FROM training_sessions WHERE owner_id=? AND status='completed' AND finished_at>=? AND finished_at<? ORDER BY finished_at").bind(clientId,shiftDay(week,-8)+'T00:00:00Z',shiftDay(week,8)+'T00:00:00Z').all<Record<string,unknown>>();
  const goals=await db.prepare('SELECT week,planned_sessions AS planned,version FROM weekly_goals WHERE client_id=? AND week IN (?,?)').bind(clientId,week,shiftDay(week,-7)).all<{week:string;planned:number;version:number}>();
  const sessions=rows.results.map(r=>({id:r.id,status:r.status,startedAt:r.started_at,finishedAt:r.finished_at,items:JSON.parse(String(r.items_json)),before:r.pain_before,after:r.pain_after,plannedSets:r.planned_sets,completedSets:r.completed_sets,version:r.version,readiness:r.readiness_json?JSON.parse(String(r.readiness_json)):null,followup:r.followup_json?JSON.parse(String(r.followup_json)):null})) as TrainingSession[];
  if(!a.self){const guard=combineCareGuards(careConnectionGuard({clientId,email:a.staff!.email,role:a.staff!.role},config),healthConsentGuard(clientId));const allowed=await db.prepare(`SELECT CASE WHEN ${guard.sql} THEN 1 ELSE 0 END AS allowed`).bind(...guard.args).first<{allowed:number}>();if(!allowed?.allowed)throw new TrainingError('אין עוד הרשאה לדוח.',403);}
  return {...weeklyProgress(sessions,[...measurements,...stages],week,goals.results.find(g=>g.week===week)?.planned??null,goals.results.find(g=>g.week===shiftDay(week,-7))?.planned??null),goalVersion:goals.results.find(g=>g.week===week)?.version??0,self:a.self};
 },
 async saveGoal(user:StaffIdentity,payload:unknown){const p=inputRecord(payload),week=validWeek(p.week),planned=integerField(p.planned,'אימונים מתוכננים',0,21),version=integerField(p.version,'גרסה',0,1000000);await requireHealthConsent(db,user.userId);const guard=healthConsentGuard(user.userId);const row=version===0?await db.prepare(`INSERT INTO weekly_goals(client_id,week,planned_sessions,updated_at) SELECT ?,?,?,? WHERE ${guard.sql} ON CONFLICT DO NOTHING RETURNING client_id`).bind(user.userId,week,planned,new Date().toISOString(),...guard.args).first():await db.prepare(`UPDATE weekly_goals SET planned_sessions=?,version=version+1,updated_at=? WHERE client_id=? AND week=? AND version=? AND ${guard.sql} RETURNING client_id`).bind(planned,new Date().toISOString(),user.userId,week,version,...guard.args).first();if(!row){await requireHealthConsent(db,user.userId);throw new TrainingError('התכנון השתנה. רעננו לפני שמירה.',409);}return {ok:true};}
 };
}
