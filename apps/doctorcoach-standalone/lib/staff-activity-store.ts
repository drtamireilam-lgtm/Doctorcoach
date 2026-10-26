import {activityPrivacy,strengthItemSql} from './activity-privacy.ts';
import type {StaffIdentity} from './staff.ts';
import {currentWeek} from './care.ts';
import {healthConsentGuard} from './consent-server.ts';
import {CONSENT_REVISION} from './intake.ts';
import {trainingAccess} from './training-access.ts';
import type {CareConfig} from './care-store.ts';
import {israelMidnight,type StaffActivity} from './staff-activity.ts';
export async function staffActivity(db:D1Database,clientId:string,config:CareConfig={},now=new Date(),viewer?:StaffIdentity):Promise<StaffActivity|null>{
 const activity=viewer?await activityPrivacy(db,viewer,clientId):null;const consent=healthConsentGuard(clientId);
 if(!(await db.prepare(`SELECT CASE WHEN ${consent.sql} THEN 1 ELSE 0 END allowed`).bind(...consent.args).first<{allowed:number}>())?.allowed)return null;
 const week=currentWeek(now),start=israelMidnight(week),end=now.toISOString();
 const access=await trainingAccess(db,clientId,config);
 const summary=await db.prepare(`SELECT
 COALESCE(SUM(CASE WHEN status='completed' AND COALESCE(finished_at,started_at)<=? THEN 1 ELSE 0 END),0) AS completedTotal,
 COALESCE(SUM(CASE WHEN status='completed' AND COALESCE(finished_at,started_at)>=? AND COALESCE(finished_at,started_at)<=? THEN 1 ELSE 0 END),0) AS completedThisWeek,
 MAX(CASE WHEN status='completed' AND COALESCE(finished_at,started_at)<=? THEN COALESCE(finished_at,started_at) END) AS lastCompletedAt,
 COALESCE(SUM(CASE WHEN status IN ('active','completed') AND program_id=? AND started_at<=? THEN 1 ELSE 0 END),0) AS programSessions
 FROM training_sessions training WHERE owner_id=? AND (?=1 OR ${strengthItemSql('training')})`).bind(end,start,end,end,access.programId??'',end,clientId,activity?.scopes.cardio?1:0).first<{completedTotal:number;completedThisWeek:number;lastCompletedAt:string|null;programSessions:number}>();
 const pending=await db.prepare('SELECT COUNT(*) AS n FROM care_checkins WHERE client_id=? AND reviewed_at IS NULL').bind(clientId).first<{n:number}>();
 await activity?.recheck();return {week,completedThisWeek:summary?.completedThisWeek??0,completedTotal:summary?.completedTotal??0,lastCompletedAt:summary?.lastCompletedAt??null,programTitle:access.programTitle,programStarted:access.programId?!!summary?.programSessions:null,pendingCheckins:pending?.n??0};
}
// Recheck consent for every included summary in the dashboard's final read snapshot.
export function activityConsentGuard(ids:string[]){return {sql:`NOT EXISTS(SELECT 1 FROM json_each(?) people CROSS JOIN json_each(?) consent WHERE NOT COALESCE((SELECT accepted<>0 AND revision=? FROM user_consents WHERE user_id=people.value AND consent_id=consent.value ORDER BY created_at DESC,rowid DESC LIMIT 1),0))`,args:[JSON.stringify(ids),JSON.stringify(['terms','privacy','health','team']),CONSENT_REVISION]};}
