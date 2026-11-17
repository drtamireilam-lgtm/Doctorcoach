import {healthConsentGuard} from './consent-server.ts';
import {programAuthorGuard,type ProgramAuthorConfig} from './program-author.ts';
import {inputRecord,validId,validEmail,textField} from './care.ts';
import {TrainingError} from './training.ts';
import {exercises} from './content.ts';
import type {StaffIdentity} from './staff.ts';
import type {AnatomyPainRecord} from './anatomy-pain.ts';
export type PainModificationRequest={reportId:string;coachEmail:string;exerciseId:string;occurrenceId?:string;candidateExerciseId?:string;notes:string};
export type PainModificationReview={id:string;ownerId:string;coachEmail:string;report:AnatomyPainRecord;request:PainModificationRequest;state:'pending'|'approved'|'rejected'|'modified';version:number;decision:{candidateExerciseId?:string;notes:string}|null;createdAt:string;updatedAt:string};
type Row={id:string;owner_id:string;coach_email:string;report_json:string;request_json:string;state:PainModificationReview['state'];version:number;decision_json:string|null;created_at:string;updated_at:string};
const decode=(r:Row):PainModificationReview=>({id:r.id,ownerId:r.owner_id,coachEmail:r.coach_email,report:JSON.parse(r.report_json),request:JSON.parse(r.request_json),state:r.state,version:r.version,decision:r.decision_json?JSON.parse(r.decision_json):null,createdAt:r.created_at,updatedAt:r.updated_at});
export function painReviewGuard(ownerId:string,coachEmail:string,config:ProgramAuthorConfig={},reviewerId?:string){
 const consent=healthConsentGuard(ownerId),author=programAuthorGuard(config);
 return {sql:`(${consent.sql}) AND NOT EXISTS(SELECT 1 FROM account_deletions WHERE user_id=?) AND (EXISTS(SELECT 1 FROM care_connections c LEFT JOIN care_staff s ON s.email=c.staff_email WHERE c.client_id=? AND c.staff_email=? AND c.active=1 AND c.scope='care' AND ${author.sql}) OR EXISTS(SELECT 1 FROM workspace_clients m JOIN coach_workspaces w ON w.id=m.workspace_id WHERE m.client_id=? AND m.state='active' AND w.owner_email=? ${reviewerId?'AND w.owner_id=?':''} AND w.state='active' AND w.license_until>strftime('%Y-%m-%dT%H:%M:%fZ','now') AND NOT EXISTS(SELECT 1 FROM care_staff disabled WHERE disabled.email=w.owner_email AND disabled.active=0)))`,args:[...consent.args,ownerId,ownerId,coachEmail,...author.args,ownerId,coachEmail,...reviewerId?[reviewerId]:[]]};
}
export function painModificationStore(db:D1Database,config:ProgramAuthorConfig={}){
 async function allowed(owner:string,email:string,reviewerId?:string){const g=painReviewGuard(owner,email,config,reviewerId);const row=await db.prepare(`SELECT CASE WHEN ${g.sql} THEN 1 ELSE 0 END allowed`).bind(...g.args).first<{allowed:number}>();if(!row?.allowed)throw new TrainingError('Review access changed. Refresh and check current consent and coach connection.',403);}
 async function list(user:StaffIdentity,clientId=user.userId){
  const email=user.email.toLowerCase(),self=clientId===user.userId;
  const rows=await db.prepare(`SELECT * FROM pain_modification_reviews WHERE owner_id=? ${self?'':'AND coach_email=?'} ORDER BY created_at DESC LIMIT 100`).bind(clientId,...self?[]:[email]).all<Row>();
  const result: PainModificationReview[]=[];for(const row of rows.results){try{await allowed(row.owner_id,row.coach_email,self?undefined:user.userId);result.push(decode(row));}catch(e){if(!(e instanceof TrainingError))throw e;}}
  return {ownerId:clientId,reviews:result};
 }
 async function coaches(user:StaffIdentity){
  const consent=healthConsentGuard(user.userId),author=programAuthorGuard(config);
  const rows=await db.prepare(`SELECT email,MIN(name) AS name FROM (SELECT c.staff_email AS email,COALESCE(s.name,c.staff_email) AS name FROM care_connections c LEFT JOIN care_staff s ON s.email=c.staff_email WHERE c.client_id=? AND c.active=1 AND c.scope='care' AND ${author.sql} UNION ALL SELECT w.owner_email AS email,w.owner_email AS name FROM workspace_clients m JOIN coach_workspaces w ON w.id=m.workspace_id WHERE m.client_id=? AND m.state='active' AND w.state='active' AND w.license_until>strftime('%Y-%m-%dT%H:%M:%fZ','now') AND NOT EXISTS(SELECT 1 FROM care_staff disabled WHERE disabled.email=w.owner_email AND disabled.active=0)) WHERE (${consent.sql}) AND NOT EXISTS(SELECT 1 FROM account_deletions WHERE user_id=?) GROUP BY email`).bind(user.userId,...author.args,user.userId,...consent.args,user.userId).all<{email:string;name:string}>();return {ownerId:user.userId,coaches:rows.results};
 }
 async function request(user:StaffIdentity,payload:unknown){const p=inputRecord(payload);if(p.ownerId!==undefined&&p.ownerId!==user.userId||p.clientId!==undefined&&p.clientId!==user.userId)throw new TrainingError('Owner mismatch',403);if(p.shareConfirmed!==true)throw new TrainingError('Confirm sharing this report with the selected coach.');
  const id=validId(p.id),reportId=validId(p.reportId),coachEmail=validEmail(p.coachEmail),exerciseId=textField(p.exerciseId,'Exercise',150,1),candidateExerciseId=p.candidateExerciseId?textField(p.candidateExerciseId,'Candidate',150,1):undefined,occurrenceId=p.occurrenceId?textField(p.occurrenceId,'Occurrence',200,1):undefined,notes=textField(p.notes??'','Notes',1500);
  if(!exercises.some(e=>e.id===exerciseId)||candidateExerciseId&&!exercises.some(e=>e.id===candidateExerciseId))throw new TrainingError('Choose a catalog exercise.');
  const requestData:PainModificationRequest={reportId,coachEmail,exerciseId,...occurrenceId?{occurrenceId}:{},...candidateExerciseId?{candidateExerciseId}:{},notes},json=JSON.stringify(requestData),g=painReviewGuard(user.userId,coachEmail,config),at=new Date().toISOString();
  await allowed(user.userId,coachEmail);
  await db.prepare(`INSERT INTO pain_modification_reviews(id,owner_id,coach_email,request_json,actor_id,report_json,created_at,updated_at) SELECT ?,?,?,?,?,json_object('id',w.id,'data',json(w.content_json),'createdAt',w.updated_at),?,? FROM wellness_records w WHERE w.id=? AND w.client_id=? AND w.kind='painLocation' AND ${g.sql} ON CONFLICT DO NOTHING`).bind(id,user.userId,coachEmail,json,user.userId,at,at,reportId,user.userId,...g.args).run();
  const row=await db.prepare('SELECT * FROM pain_modification_reviews WHERE id=? AND owner_id=? AND coach_email=?').bind(id,user.userId,coachEmail).first<Row>();if(!row||row.request_json!==json)throw new TrainingError('Request changed or report is unavailable.',409);await allowed(user.userId,coachEmail);return decode(row);
 }
 async function review(user:StaffIdentity,payload:unknown){const p=inputRecord(payload),id=validId(p.id),email=user.email.toLowerCase();if(!['approved','rejected','modified'].includes(String(p.decision))||!Number.isInteger(p.version)||Number(p.version)<1)throw new TrainingError('Invalid review decision');
  const notes=textField(p.notes??'','Review notes',1500,1),candidateExerciseId=p.candidateExerciseId?textField(p.candidateExerciseId,'Candidate',150,1):undefined;
  if(candidateExerciseId&&!exercises.some(e=>e.id===candidateExerciseId)||p.decision==='modified'&&!candidateExerciseId)throw new TrainingError('Choose a catalog exercise.');
  const row=await db.prepare('SELECT * FROM pain_modification_reviews WHERE id=? AND coach_email=?').bind(id,email).first<Row>();if(!row)throw new TrainingError('Review unavailable',403);const g=painReviewGuard(row.owner_id,email,config,user.userId);await allowed(row.owner_id,email,user.userId);
  const decision=JSON.stringify({...candidateExerciseId?{candidateExerciseId}:{},notes}),at=new Date().toISOString();
  if(row.version===Number(p.version)+1&&row.state===p.decision&&row.decision_json===decision)return decode(row);
  const updated=await db.prepare(`UPDATE pain_modification_reviews SET state=?,decision_json=?,version=version+1,updated_at=?,actor_id=? WHERE id=? AND coach_email=? AND state='pending' AND version=? AND ${g.sql} ${p.decision==='rejected'?'':"AND NOT EXISTS(SELECT 1 FROM medical_reviews WHERE client_id=? AND state IN ('pending','in_review'))"} RETURNING *`).bind(String(p.decision),decision,at,user.userId,id,email,Number(p.version),...g.args,...p.decision==='rejected'?[]:[row.owner_id]).first<Row>();
  if(!updated)throw new TrainingError('Review changed, permissions were revoked, or medical review is pending.',409);await allowed(row.owner_id,email,user.userId);return decode(updated);
 }
 return {list,coaches,request,review};
}

