import {activityPrivacy,activityGrantSnapshot,strengthItemSql} from './activity-privacy.ts';
import {trainingSessionFromRow} from './training-store.ts';
import {careStore,type CareConfig} from './care-store.ts';
import {staffRoleGuard} from './care-write-guard.ts';
import {CONSENT_REVISION} from './intake.ts';
import {inputRecord,validId,integerField} from './care.ts';
import {TrainingError} from './training.ts';
import type {StaffIdentity} from './staff.ts';
export type StaffQueueItem={kind:'workout'|'checkin'|'video';id:string;clientId:string;clientName:string;at:string;version:number;title:string;pain:number|null;note:string;reviewedAt:string|null};
export function staffReviewQueueStore(db:D1Database,config:CareConfig={}){
 const care=careStore(db,config);
 async function context(user:StaffIdentity){const staff=await care.requireStaff(user);if(!['coach','clinician'].includes(staff.role))throw new TrainingError('מעקב האימונים זמין למאמן או לרופא משויך בלבד.',403);const role=staffRoleGuard(staff.email,staff.role,config);return {staff,role};}
 function eligible(email:string,role:{sql:string;args:(string|number)[]}){return {sql:`SELECT p.user_id AS client_id,p.name FROM care_profiles p JOIN care_connections c ON c.client_id=p.user_id WHERE c.staff_email=? AND c.scope='care' AND c.active=1 AND (${role.sql}) AND NOT EXISTS(SELECT 1 FROM json_each(?) consent WHERE NOT COALESCE((SELECT accepted<>0 AND revision=? FROM user_consents WHERE user_id=p.user_id AND consent_id=consent.value ORDER BY created_at DESC,rowid DESC LIMIT 1),0))`,args:[email,...role.args,JSON.stringify(['terms','privacy','health','team']),CONSENT_REVISION]};}
 return {
 async list(user:StaffIdentity){
  const {staff,role}=await context(user),allowed=eligible(staff.email,role);const people=await db.prepare(`WITH eligible AS (${allowed.sql}) SELECT client_id FROM eligible`).bind(...allowed.args).all<{client_id:string}>();const grants=await activityGrantSnapshot(db,user,people.results.map(p=>p.client_id));
  const rows=await db.prepare(`WITH eligible AS (${allowed.sql}), events AS (
   SELECT 'workout' kind,s.id,e.client_id AS clientId,e.name AS clientName,s.finished_at AS at,s.version,'אימון שהושלם' title,
    MAX(COALESCE(s.pain_before,0),COALESCE(s.pain_after,0),COALESCE(json_extract(s.followup_json,'$.pain'),0),COALESCE((SELECT MAX(CAST(json_extract(result.value,'$.painDuring') AS REAL)) FROM json_each(s.items_json) item,json_each(item.value,'$.results') result WHERE json_extract(result.value,'$.done')=1),0)) pain,
    CASE WHEN s.owner_id NOT IN (SELECT value FROM json_each(?)) AND EXISTS(SELECT 1 FROM json_each(s.items_json) cardio_item WHERE json_extract(cardio_item.value,'$.exerciseId') LIKE 'cardio:%') THEN '' ELSE COALESCE(json_extract(s.finish_feedback_json,'$.note'),'') END note,r.reviewed_at AS reviewedAt
   FROM training_sessions s JOIN eligible e ON e.client_id=s.owner_id LEFT JOIN staff_workout_reviews r ON r.session_id=s.id AND r.staff_id=? AND r.staff_role=? AND r.session_version=s.version
   WHERE s.status='completed' AND s.finished_at<=? AND (s.owner_id IN (SELECT value FROM json_each(?)) OR ${strengthItemSql('s')})
   UNION ALL
   SELECT 'checkin',k.id,e.client_id,e.name,k.created_at,0,'דיווח שממתין למענה',k.pain,'',NULL FROM care_checkins k JOIN eligible e ON e.client_id=k.client_id WHERE k.reviewed_at IS NULL
   UNION ALL
   SELECT 'video',m.id,e.client_id,e.name,m.created_at,0,'סרטון שממתין למשוב',NULL,'',NULL FROM media_assets m JOIN eligible e ON e.client_id=m.owner_id WHERE m.kind='review' AND m.status='ready' AND NOT EXISTS(SELECT 1 FROM media_feedback f WHERE f.asset_id=m.id) AND COALESCE((SELECT accepted<>0 AND revision=? FROM user_consents WHERE user_id=m.owner_id AND consent_id='media' ORDER BY created_at DESC,rowid DESC LIMIT 1),0)
  ) SELECT * FROM events ORDER BY (reviewedAt IS NULL) DESC,(pain>0 OR note<>'') DESC,at DESC,id LIMIT 101`).bind(...allowed.args,JSON.stringify(grants.cardioOwners),user.userId,staff.role,new Date().toISOString(),JSON.stringify(grants.cardioOwners),CONSENT_REVISION).all<StaffQueueItem>();
  const revoked=await db.prepare(`WITH eligible AS (${allowed.sql}) SELECT COUNT(*) AS n FROM json_each(?) captured WHERE captured.value NOT IN (SELECT client_id FROM eligible)`).bind(...allowed.args,JSON.stringify([...new Set(rows.results.map(r=>r.clientId))])).first<{n:number}>();if(revoked?.n)throw new TrainingError('Workout relationships changed during queue read',403);await grants.recheck();return {items:rows.results.slice(0,100),limited:rows.results.length>100};
 },
 async session(user:StaffIdentity,id:string){
  const {staff,role}=await context(user),allowed=eligible(staff.email,role);validId(id);
  const row=await db.prepare(`WITH eligible AS (${allowed.sql}) SELECT s.* FROM training_sessions s JOIN eligible e ON e.client_id=s.owner_id WHERE s.id=? AND s.status='completed' AND s.finished_at<=?`).bind(...allowed.args,id,new Date().toISOString()).first<Parameters<typeof trainingSessionFromRow>[0]&{owner_id:string}>();
  if(!row)throw new TrainingError('האימון אינו זמין בהרשאות הנוכחיות.',404);
  const activity=await activityPrivacy(db,user,String(row.owner_id));const result=activity.sanitize({session:trainingSessionFromRow(row)});const stillAllowed=await db.prepare(`WITH eligible AS (${allowed.sql}) SELECT 1 FROM eligible WHERE client_id=?`).bind(...allowed.args,row.owner_id).first();if(!stillAllowed)throw new TrainingError('Workout relationship changed during read',403);await activity.recheck();return result;
 },
 async review(user:StaffIdentity,payload:unknown){
  const {staff,role}=await context(user),p=inputRecord(payload),id=validId(p.id),version=integerField(p.version,'גרסה',1,1000000);
  if(p.confirmed!==true)throw new TrainingError('יש לאשר שבדקת את האימון.');
  const allowed=eligible(staff.email,role),at=new Date().toISOString();
  const row=await db.prepare(`WITH eligible AS (${allowed.sql}) INSERT INTO staff_workout_reviews(staff_id,staff_role,client_id,session_id,session_version,reviewed_at)
   SELECT ?,?,s.owner_id,s.id,s.version,? FROM training_sessions s JOIN eligible e ON e.client_id=s.owner_id WHERE s.id=? AND s.version=? AND s.status='completed' AND s.finished_at<=?
   ON CONFLICT(staff_id,staff_role,session_id) DO UPDATE SET session_version=excluded.session_version,reviewed_at=excluded.reviewed_at RETURNING session_id`).bind(...allowed.args,user.userId,staff.role,at,id,version,at).first();
  if(!row)throw new TrainingError('האימון או ההרשאות השתנו. רעננו לפני סימון בדיקה.',409);
  return {ok:true};
 }
 };
}
