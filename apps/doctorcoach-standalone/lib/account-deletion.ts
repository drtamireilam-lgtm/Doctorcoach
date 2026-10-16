import {isStaff,type StaffIdentity} from './staff.ts';
import {inputRecord,validId} from './care.ts';
import {TrainingError} from './training.ts';
import {type DeletionJournal} from './deletion-journal.ts';
type Bucket={delete(key:string):Promise<unknown>;list(options:{prefix:string;cursor?:string}):Promise<{objects:{key:string}[];truncated:boolean;cursor?:string}>};
type RequestRow={id:string;user_id:string;requester_email:string|null;kind:string;state:string};
type Job={user_id:string;request_id:string;state:string;started_at:string;completed_at:string|null};
// Exact ownership predicates only. Shared catalogs and staff records are excluded.
export const deletionScopes=[
 ['care_tasks','client_id'],['workspace_client_events','client_id'],['workspace_messages','client_id'],['workspace_chat_reads','client_id'],['workspace_programs','client_id'],['workspace_drafts','client_id'],['workspace_clients','client_id'],['coach_program_templates','owner_id'],['import_exercise_mappings','owner_id'],['google_calendar_connection','owner_id'],['google_calendar_states','user_id'],
 ['pilot_redemptions','user_id'],['program_items','owner_id'],['workout_logs','owner_id'],['exercise_favorites','owner_id'],
 ['training_sessions','owner_id'],['care_profiles','user_id'],['care_connections','client_id'],
 ['care_notes','client_id'],['care_programs','client_id'],['care_checkins','client_id'],
 ['media_assets','owner_id'],['care_appointments','client_id'],['wellness_records','client_id'],
 ['return_plan_revisions','client_id'],['trainee_feedback','owner_id'],['success_stories','owner_id'],
 ['user_intakes','user_id'],['user_consents','user_id'],['medical_reviews','client_id'],
 ['team_messages','client_id'],['message_reads','user_id'],['account_requests','user_id'],
 ['audit_events','subject_id'],['training_access','user_id'],['staff_personal_access','user_id'],['self_program_splits','owner_id'],['workout_preferences','user_id'],['progress_layouts','user_id'],['coach_program_drafts','client_id'],
 ['membership_orders','user_id'],['weekly_goals','client_id'],['notification_preferences','user_id'],
 ['notification_dismissals','user_id'],['passport_details','client_id'],['private_documents','client_id'],
 ['thread_states','client_id'],['billing_sandbox_orders','user_id'],['push_devices','user_id'],
] as const;
export async function deletionStatus(db:D1Database,userId:string){return db.prepare('SELECT request_id AS requestId,state,started_at AS startedAt,completed_at AS completedAt FROM account_deletions WHERE user_id=?').bind(userId).first<{requestId:string;state:string;startedAt:string;completedAt:string|null}>();}
export function accountDeletionStore(db:D1Database,bucket:Bucket|null,adminEmails?:string,enabled=false,journal:DeletionJournal|null=null){
 async function resolve(actor:StaffIdentity,id:string){
  if(!isStaff(actor,adminEmails))throw new TrainingError('הרשאת מנהל נדרשת.',403);
  const job=await db.prepare('SELECT * FROM account_deletions WHERE request_id=?').bind(id).first<Job>();
  const r=await db.prepare('SELECT id,user_id,requester_email,kind,state FROM account_requests WHERE id=?').bind(id).first<RequestRow>();
  if(job){if(r&&r.user_id!==job.user_id)throw new TrainingError('מזהה הבקשה אינו זמין. רעננו ונסו שוב.',409);return {job,r,target:job.user_id};}
  if(!r||r.kind!=='deletion'||r.state!=='pending')throw new TrainingError('בקשת מחיקה פעילה לא נמצאה.',404);
  if(!r.requester_email)throw new TrainingError('יש לאמת מחדש את זהות מבקש המחיקה באמצעות שליחת הבקשה מהחשבון שלו.',409);
  if(r.user_id===actor.userId||isStaff({userId:r.user_id,email:r.requester_email},adminEmails)||await db.prepare('SELECT email FROM care_staff WHERE email=?').bind(r.requester_email.toLowerCase()).first())throw new TrainingError('חשבונות צוות ומנהל דורשים תהליך נפרד; המחיקה נחסמה.',403);
  const authored=await db.prepare("SELECT 1 AS protected WHERE EXISTS(SELECT 1 FROM coach_program_drafts WHERE coach_id=?) OR EXISTS(SELECT 1 FROM content_reviews WHERE reviewer_id=?) OR EXISTS(SELECT 1 FROM care_invites WHERE created_by=?) OR EXISTS(SELECT 1 FROM media_assets WHERE owner_id=? AND kind='demo') OR EXISTS(SELECT 1 FROM custom_exercises WHERE owner_id=? OR reviewer_id=?) OR EXISTS(SELECT 1 FROM coach_workspaces WHERE owner_id=?)").bind(r.user_id,r.user_id,r.user_id,r.user_id,r.user_id,r.user_id,r.user_id).first();
  if(authored)throw new TrainingError('חשבונות צוות ומנהל דורשים תהליך נפרד; המחיקה נחסמה.',403);
  return {job:null,r,target:r.user_id};
 }
 async function fileRows(target:string){return (await db.prepare('SELECT id,object_key FROM media_assets WHERE owner_id=? UNION ALL SELECT id,object_key FROM private_documents WHERE client_id=?').bind(target,target).all<{id:string;object_key:string}>()).results;}
 return {
  async preview(actor:StaffIdentity,id:string){const {job,target}=await resolve(actor,validId(id));const counts:Record<string,number>={};for(const [table,col] of deletionScopes)counts[table]=(await db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${col}=?`).bind(target).first<{n:number}>())?.n??0;
   const rows=await fileRows(target);return {requestId:id,state:job?.state??'pending',enabled,counts,fileCount:rows.length};},
  async execute(actor:StaffIdentity,payload:unknown){
   if(!isStaff(actor,adminEmails))throw new TrainingError('הרשאת מנהל נדרשת.',403);
   if(!enabled)throw new TrainingError('מחיקה בפועל חסומה עד לאישור מדיניות השמירה והפעלת השירות.',503);
   const p=inputRecord(payload),id=validId(p.id);
   if(p.confirmed!==true||p.retentionReviewed!==true||p.externalReviewed!==true||p.confirmation!==id||p.retentionDecision!=='no_hold')throw new TrainingError('נדרשים אישור מפורש, בדיקת חובות שמירה ובדיקת ספקים חיצוניים. אם נדרשת שמירה, אין לבצע מחיקה במסלול זה.',400);
   const {job,r,target}=await resolve(actor,id);
   if(job?.state==='deleted')return {ok:true,state:'deleted',alreadyCompleted:true};
   // A working bucket is mandatory, even for apparently empty metadata, before locking.
   if(!bucket)throw new TrainingError('אחסון הקבצים אינו זמין; המחיקה לא החלה.',503);
   if(!journal)throw new TrainingError('Deletion journal unavailable.',503);
   if(!job){const at=new Date().toISOString();
    await db.batch([
     db.prepare("INSERT INTO account_deletions(user_id,request_id,state,reviewer_id,started_at) SELECT ?,?,'deleting',?,? WHERE EXISTS(SELECT 1 FROM account_requests WHERE id=? AND user_id=? AND kind='deletion' AND state='pending' AND requester_email=?) AND NOT EXISTS(SELECT 1 FROM care_staff WHERE email=lower(?)) AND NOT EXISTS(SELECT 1 FROM coach_program_drafts WHERE coach_id=?) AND NOT EXISTS(SELECT 1 FROM content_reviews WHERE reviewer_id=?) AND NOT EXISTS(SELECT 1 FROM care_invites WHERE created_by=?) AND NOT EXISTS(SELECT 1 FROM media_assets WHERE owner_id=? AND kind='demo') AND NOT EXISTS(SELECT 1 FROM custom_exercises WHERE owner_id=? OR reviewer_id=?) AND NOT EXISTS(SELECT 1 FROM coach_workspaces WHERE owner_id=?) ON CONFLICT(user_id) DO NOTHING").bind(target,id,actor.userId,at,id,target,r!.requester_email,r!.requester_email,target,target,target,target,target,target,target),
     db.prepare('DELETE FROM user_consents WHERE user_id=? AND EXISTS(SELECT 1 FROM account_deletions WHERE user_id=? AND request_id=?)').bind(target,target,id),
     db.prepare('DELETE FROM care_connections WHERE client_id=? AND EXISTS(SELECT 1 FROM account_deletions WHERE user_id=? AND request_id=?)').bind(target,target,id),
     db.prepare('DELETE FROM push_devices WHERE user_id=? AND EXISTS(SELECT 1 FROM account_deletions WHERE user_id=? AND request_id=?)').bind(target,target,id),
    ]);
   }
   const lock=await db.prepare('SELECT * FROM account_deletions WHERE user_id=? AND request_id=?').bind(target,id).first<Job>();
   if(!lock)throw new TrainingError('בקשת המחיקה השתנתה. רעננו לפני המשך.',409);
   if(lock.state==='deleted')return {ok:true,state:'deleted',alreadyCompleted:true};
   await journal.record({version:1,userId:target,requestId:id,reviewerId:(await db.prepare('SELECT reviewer_id AS reviewerId FROM account_deletions WHERE user_id=?').bind(target).first<{reviewerId:string}>())!.reviewerId,startedAt:lock.started_at});
   // Metadata remains while storage is being purged, making retries safe after failure.
   // Only exact persisted keys and per-asset UUID prefixes; never list/delete a bucket root.
   const rows=await fileRows(target);
   for(const row of rows){validId(row.id);if(row.object_key!==`videos/${row.id}`&&row.object_key!==`private-documents/${row.id}`&&!row.object_key.startsWith(`videos/${row.id}/`))throw new TrainingError('מפתח אחסון לא צפוי; המחיקה נעצרה לבדיקה.',409);
    await bucket.delete(row.object_key);let cursor:string|undefined;
    do{const page=await bucket.list({prefix:`videos/${row.id}/`,...(cursor?{cursor}:{})});for(const object of page.objects){if(!object.key.startsWith(`videos/${row.id}/`))throw new TrainingError('תוצאת אחסון לא צפויה.',409);await bucket.delete(object.key);}cursor=page.truncated?page.cursor:undefined;if(page.truncated&&!cursor)throw new TrainingError('לא ניתן להשלים את סריקת הקבצים.',503);}while(cursor);
   }
   const q=(sql:string)=>db.prepare(sql).bind(target);
   const dependents=[
    q('DELETE FROM care_task_events WHERE task_id IN (SELECT id FROM care_tasks WHERE client_id=?)'),
    db.prepare('DELETE FROM message_links WHERE message_id IN (SELECT id FROM team_messages WHERE client_id=?) OR document_id IN (SELECT id FROM private_documents WHERE client_id=?) OR video_id IN (SELECT id FROM media_assets WHERE owner_id=?)').bind(target,target,target),
    q('DELETE FROM media_feedback WHERE asset_id IN (SELECT id FROM media_assets WHERE owner_id=?)'),
    q('DELETE FROM media_feedback WHERE author_id=?'),
    q('DELETE FROM document_lifecycle WHERE document_id IN (SELECT id FROM private_documents WHERE client_id=?)'),
    q('DELETE FROM billing_sandbox_events WHERE order_id IN (SELECT id FROM billing_sandbox_orders WHERE user_id=?)'),
    q('DELETE FROM billing_sandbox_transactions WHERE order_id IN (SELECT id FROM billing_sandbox_orders WHERE user_id=?)'),
    q('DELETE FROM message_reads WHERE client_id=?'),q('DELETE FROM audit_events WHERE actor_id=?'),
    q('DELETE FROM care_invites WHERE consumed_by=?'),
   ];
   await db.batch([...dependents,...deletionScopes.map(([table,col])=>q(`DELETE FROM ${table} WHERE ${col}=?`)),db.prepare("UPDATE account_deletions SET state='deleted',completed_at=? WHERE user_id=? AND request_id=? AND state='deleting'").bind(new Date().toISOString(),target,id)]);
   return {ok:true,state:'deleted',alreadyCompleted:false};
  },
 };
}
