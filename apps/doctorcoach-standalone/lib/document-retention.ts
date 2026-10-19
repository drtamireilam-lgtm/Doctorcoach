import {privateDocumentStore} from './private-document-store.ts';
import type {CareConfig} from './care-store.ts';
import {inputRecord,integerField,validId} from './care.ts';
import {TrainingError} from './training.ts';
import {isStaff,type StaffIdentity} from './staff.ts';
export function documentRetentionStore(db:D1Database,config:CareConfig={}){
 const docs=privateDocumentStore(db,config);
 function admin(u:StaffIdentity){if(!isStaff(u,config.adminEmails)||(config.exclusiveMedical&&!isStaff(u,config.clinicianEmails)))throw new TrainingError('הרשאת מנהל נדרשת.',403);}
 return {
 async list(u:StaffIdentity,manage=false){if(manage){admin(u);return {requests:(await db.prepare("SELECT l.document_id AS id,d.client_id AS clientId,l.delete_status AS deleteStatus,l.requested_at AS requestedAt,l.reviewed_at AS reviewedAt,l.version FROM document_lifecycle l JOIN private_documents d ON d.id=l.document_id WHERE l.delete_status IN ('requested','reviewed') ORDER BY l.requested_at LIMIT 100").all()).results};}return {documents:(await db.prepare("SELECT d.id,d.filename,d.status,d.created_at AS createdAt,COALESCE(l.version,0) AS version,COALESCE(l.delete_status,'none') AS deleteStatus,l.requested_at AS requestedAt FROM private_documents d LEFT JOIN document_lifecycle l ON l.document_id=d.id WHERE d.client_id=? AND d.purpose='medical' AND d.status IN ('ready','archived') ORDER BY d.created_at DESC LIMIT 100").bind(u.userId).all()).results};},
 async change(u:StaffIdentity,payload:unknown){const p=inputRecord(payload),id=validId(p.id),version=integerField(p.version,'גרסה',0,1000000),action=p.action;
 if(!['archive','restore','request_delete','withdraw_delete','review'].includes(String(action)))throw new TrainingError('פעולת מסמך לא מוכרת.');if(p.confirmed!==true)throw new TrainingError('יש לאשר את פעולת המסמך.');
 const row=await docs.get(id);if(!row||row.purpose!=='medical'||!['ready','archived'].includes(row.status))throw new TrainingError('המסמך אינו זמין.',404);
 if(action==='review')admin(u);else if(row.client_id!==u.userId)throw new TrainingError('רק בעל התיק יכול לנהל את שמירת המסמך.',403);
 const old=await db.prepare('SELECT version,delete_status FROM document_lifecycle WHERE document_id=?').bind(id).first<{version:number;delete_status:string}>();if((old?.version??0)!==version)throw new TrainingError('מצב המסמך השתנה. רעננו לפני פעולה נוספת.',409);const deletion=old?.delete_status??'none';
 if(action==='archive'&&(row.status!=='ready'||deletion!=='none')||action==='restore'&&(row.status!=='archived'||deletion!=='none')||action==='request_delete'&&deletion!=='none'||action==='withdraw_delete'&&deletion==='none'||action==='review'&&deletion!=='requested')throw new TrainingError('פעולה זו אינה זמינה במצב המסמך הנוכחי.',409);
 const next=action==='request_delete'?'requested':action==='withdraw_delete'?'none':action==='review'?'reviewed':deletion,status=action==='restore'?'ready':action==='review'?row.status:'archived',at=new Date().toISOString(),receipt=crypto.randomUUID();
 const guard="EXISTS(SELECT 1 FROM private_documents WHERE id=? AND client_id=? AND purpose='medical' AND status=?)";
 const mutation=version===0?db.prepare(`INSERT INTO document_lifecycle(document_id,version,delete_status,requested_at,updated_at,last_action_id) SELECT ?,1,?,?,?,? WHERE ${guard} ON CONFLICT DO NOTHING`).bind(id,next,action==='request_delete'?at:null,at,receipt,id,row.client_id,row.status):db.prepare(`UPDATE document_lifecycle SET version=version+1,delete_status=?,requested_at=CASE WHEN ?='request_delete' THEN ? WHEN ?='withdraw_delete' THEN NULL ELSE requested_at END,reviewed_at=CASE WHEN ?='review' THEN ? WHEN ?='withdraw_delete' THEN NULL ELSE reviewed_at END,updated_at=?,last_action_id=? WHERE document_id=? AND version=? AND ${guard}`).bind(next,action,at,action,action,at,action,at,receipt,id,version,id,row.client_id,row.status);
 const gate='EXISTS(SELECT 1 FROM document_lifecycle WHERE document_id=? AND version=? AND last_action_id=?)';
 await db.batch([mutation,db.prepare(`UPDATE private_documents SET status=? WHERE id=? AND client_id=? AND purpose='medical' AND status=? AND ${gate}`).bind(status,id,row.client_id,row.status,id,version+1,receipt),db.prepare(`INSERT INTO audit_events(id,actor_id,subject_id,action,created_at) SELECT ?,?,?,?,? WHERE ${gate}`).bind(receipt,u.userId,row.client_id,'documents.'+action,at,id,version+1,receipt)]);
 const saved=await db.prepare('SELECT last_action_id FROM document_lifecycle WHERE document_id=?').bind(id).first<{last_action_id:string}>();if(saved?.last_action_id!==receipt)throw new TrainingError('מצב המסמך השתנה. רעננו לפני פעולה נוספת.',409);return {ok:true,permanentDeletion:false};
 }
 };
}
