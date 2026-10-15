import type {StaffIdentity} from './staff.ts';
import {inputRecord,validId} from './care.ts';
import {TrainingError} from './training.ts';

type AccountRequest = {id:string; user_id:string; kind:string; state:string; created_at:string};

/** Privacy requests remain available independently of onboarding and health consent. */
export async function requestAccount(db:D1Database,user:StaffIdentity,payload:unknown) {
  const p=inputRecord(payload),id=validId(p.id),kind=String(p.kind);
  if(!['export','correction','deletion'].includes(kind))throw new TrainingError('סוג בקשה אינו תקין.');
  if(kind==='deletion'&&p.confirmed!==true)throw new TrainingError('יש לאשר את בקשת מחיקת החשבון.');
  if(await db.prepare('SELECT user_id FROM account_deletions WHERE request_id=?').bind(id).first())throw new TrainingError('מזהה הבקשה אינו זמין. רעננו ונסו שוב.',409);
  const previous=await db.prepare('SELECT id,user_id,kind,state,created_at FROM account_requests WHERE id=?').bind(id).first<AccountRequest>();
  if(previous&&(previous.user_id!==user.userId||previous.kind!==kind||previous.state!=='pending'))throw new TrainingError('מזהה הבקשה אינו זמין. רעננו ונסו שוב.',409);
  const at=new Date().toISOString();
  await db.batch([
    db.prepare("INSERT INTO account_requests(id,user_id,kind,created_at,updated_at) SELECT ?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM account_requests WHERE user_id=? AND kind=? AND state='pending') ON CONFLICT(id) DO NOTHING").bind(id,user.userId,kind,at,at,user.userId,kind),
    db.prepare("UPDATE account_requests SET requester_email=? WHERE user_id=? AND kind=? AND state='pending'").bind(user.email,user.userId,kind),
    // A deterministic receipt makes retries idempotent. The ownership gate prevents
    // an unrelated request ID from creating an audit record or returning success.
    db.prepare("INSERT INTO audit_events(id,actor_id,subject_id,action,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM account_requests WHERE id=? AND user_id=? AND kind=? AND state='pending') ON CONFLICT(id) DO NOTHING").bind('account-request-'+id,user.userId,user.userId,'account_request_'+kind,at,id,user.userId,kind),
  ]);
  const row=await db.prepare("SELECT id,user_id,kind,state,created_at FROM account_requests WHERE user_id=? AND kind=? AND state='pending' ORDER BY created_at,id LIMIT 1").bind(user.userId,kind).first<AccountRequest>();
  if(!row)throw new TrainingError('לא ניתן לשמור את הבקשה. רעננו ונסו שוב.',409);
  return {ok:true,request:{id:row.id,kind:row.kind,state:row.state,createdAt:row.created_at},permanentDeletion:false};
}
