import {careStore,type CareConfig} from './care-store.ts';
import {careConnectionGuard,combineCareGuards} from './care-write-guard.ts';
import {healthConsentGuard,requireHealthConsent} from './consent-server.ts';
import {CONSENT_REVISION} from './intake.ts';
import {inputRecord,textField,integerField,validId} from './care.ts';
import {TrainingError} from './training.ts';
import {channels,type Channel} from './messaging.ts';
import {documentCategories,MAX_DOCUMENT_BYTES,type PrivateDocument} from './private-documents.ts';
import type {StaffIdentity} from './staff.ts';
type Row={id:string;client_id:string;uploader_id:string;uploader_name:string;purpose:'medical'|'message';channel:string;category:string;filename:string;mime:string;bytes:number;object_key:string;status:string;created_at:string};
const roles={medical:'clinician',training:'coach',nutrition:'dietitian',scheduling:'coordinator'};
export function privateDocumentStore(db:D1Database,config:CareConfig={}){
 const care=careStore(db,config),get=(id:string)=>db.prepare('SELECT * FROM private_documents WHERE id=?').bind(id).first<Row>();
 const audit=(user:StaffIdentity,client:string,action:string)=>db.prepare('INSERT INTO audit_events(id,actor_id,subject_id,action,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),user.userId,client,action,new Date().toISOString()).run();
 async function permission(user:StaffIdentity,clientId:string,purpose:string,channel='',write=false){
  if(purpose!=='medical'&&purpose!=='message')throw new TrainingError('סוג מסמך לא תקין.');
  if(purpose==='message'&&!(channel in channels))throw new TrainingError('ערוץ לא תקין.');
  const role=purpose==='medical'?'clinician':roles[channel as Channel],grant=role==='clinician'?'medical_access' as const:role==='dietitian'?'nutrition_access' as const:undefined;
  const connection=careConnectionGuard({clientId,...(user.userId===clientId?{}:{email:user.email}),role,scope:role==='coordinator'?'coordinator':'care',...(grant?{grant}:{})},config);
  if(user.userId!==clientId){const staff=await care.requireStaff(user);if(staff.role!==role)throw new TrainingError('אין הרשאה למסמך זה.',403);}
  const read=user.userId===clientId?{sql:'1=1',args:[]}:combineCareGuards(connection,healthConsentGuard(clientId));
  return write?combineCareGuards(purpose==='medical'&&user.userId===clientId?{sql:'1=1',args:[]}:connection,healthConsentGuard(clientId),...(purpose==='message'?[{sql:"COALESCE((SELECT accepted<>0 AND revision=? FROM user_consents WHERE user_id=? AND consent_id='media' ORDER BY created_at DESC,rowid DESC LIMIT 1),0)",args:[CONSENT_REVISION,clientId]}]:[])):read;
 }
 async function requireGuard(guard:{sql:string;args:(string|number)[]}){const r=await db.prepare(`SELECT CASE WHEN ${guard.sql} THEN 1 ELSE 0 END AS allowed`).bind(...guard.args).first<{allowed:number}>();if(!r?.allowed)throw new TrainingError('הרשאות המסמך או ההסכמות השתנו.',403);}
 function dto(r:Row,user:StaffIdentity):PrivateDocument{return {id:r.id,clientId:r.client_id,uploaderId:r.uploader_id,uploaderName:r.uploader_name,purpose:r.purpose,channel:r.channel,category:r.category,filename:r.filename,mime:r.mime,bytes:r.bytes,createdAt:r.created_at,canArchive:r.client_id===user.userId};}
 async function confirmReadable(user:StaffIdentity,row:Row){await requireGuard(combineCareGuards(await permission(user,row.client_id,row.purpose,row.channel),{sql:"EXISTS(SELECT 1 FROM private_documents WHERE id=? AND client_id=? AND purpose=? AND channel=? AND status='ready' AND object_key=?)",args:[row.id,row.client_id,row.purpose,row.channel,row.object_key]}));}
 return {permission,requireGuard,get,confirmReadable,
 async list(user:StaffIdentity,clientId:string,purpose='medical',channel=''){
  const guard=await permission(user,clientId,purpose,channel);await requireGuard(guard);
  const rows=await db.prepare("SELECT * FROM private_documents WHERE client_id=? AND purpose=? AND channel=? AND status='ready' ORDER BY created_at DESC LIMIT 100").bind(clientId,purpose,channel).all<Row>();
  await requireGuard(combineCareGuards(guard,{sql:"NOT EXISTS(SELECT 1 FROM json_each(?) captured WHERE NOT EXISTS(SELECT 1 FROM private_documents d WHERE d.id=captured.value AND d.status='ready'))",args:[JSON.stringify(rows.results.map(r=>r.id))]}));await audit(user,clientId,'documents.list');return rows.results.map(r=>dto(r,user));
 },
 async readable(user:StaffIdentity,id:string){const row=await get(id);if(!row||row.status!=='ready')throw new TrainingError('המסמך אינו זמין.',404);await confirmReadable(user,row);return row;},
 async logDownload(user:StaffIdentity,row:Row){await confirmReadable(user,row);await audit(user,row.client_id,'documents.download');await confirmReadable(user,row);},
 async initialize(user:StaffIdentity,payload:unknown){const p=inputRecord(payload),id=validId(p.id),clientId=textField(p.clientId??user.userId,'מתאמן',200,1),purpose=textField(p.purpose,'סוג מסמך',20,1),channel=purpose==='message'?textField(p.channel,'ערוץ',20,1):'';
  const guard=await permission(user,clientId,purpose,channel,true);await requireGuard(guard);
  const filename=textField(p.filename,'שם קובץ',180,1).replace(/[\x00-\x1f\x7f/\\]/g,'_'),category=purpose==='medical'?textField(p.category,'סוג מסמך',30,1):'attachment';if(purpose==='medical'&&!documentCategories.includes(category as typeof documentCategories[number]))throw new TrainingError('בחרו סוג מסמך.');
  const mime=textField(p.mime,'סוג קובץ',100,1);if(!['application/pdf','image/jpeg','image/png'].includes(mime))throw new TrainingError('בחרו PDF, PNG או JPEG.');const bytes=integerField(p.bytes,'גודל קובץ',8,MAX_DOCUMENT_BYTES);
  const retry=(old:Row)=>{if(old.uploader_id!==user.userId||old.client_id!==clientId||old.purpose!==purpose||old.channel!==channel||old.filename!==filename||old.mime!==mime||old.bytes!==bytes||old.category!==category||old.status==='archived')throw new TrainingError('מזהה המסמך כבר בשימוש.',409);return {id,status:old.status};};
  const old=await get(id);if(old){await requireGuard(guard);return retry(old);}
  const staff=await care.staffFor(user.email),profile=await db.prepare('SELECT name FROM care_profiles WHERE user_id=?').bind(user.userId).first<{name:string}>();
  const at=new Date().toISOString(),saved=await db.prepare(`INSERT INTO private_documents(id,client_id,uploader_id,uploader_name,purpose,channel,category,filename,mime,bytes,object_key,status,created_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,? WHERE ${guard.sql} AND (SELECT COUNT(*) FROM private_documents WHERE client_id=?)<100 AND COALESCE((SELECT SUM(bytes) FROM private_documents WHERE client_id=?),0)+?<=209715200 ON CONFLICT DO NOTHING RETURNING id`).bind(id,clientId,user.userId,staff?.name??profile?.name??'DoctorCoach',purpose,channel,category,filename,mime,bytes,'private-documents/'+id,'uploading',at,...guard.args,clientId,clientId,bytes).first();
  if(!saved){await requireGuard(guard);const winner=await get(id);if(winner)return retry(winner);throw new TrainingError('מכסת המסמכים הושלמה.',409);}await audit(user,clientId,'documents.initialize');return {id,status:'uploading'};
 },
 async writable(user:StaffIdentity,id:string){const row=await get(id);if(!row||row.uploader_id!==user.userId||!['uploading','ready'].includes(row.status))throw new TrainingError('אין הרשאה להעלאה.',403);await requireGuard(await permission(user,row.client_id,row.purpose,row.channel,true));return row;},
 async ready(user:StaffIdentity,id:string,key:string){const row=await this.writable(user,id);const guard=await permission(user,row.client_id,row.purpose,row.channel,true);await audit(user,row.client_id,'documents.finalize_attempt');const saved=await db.prepare(`UPDATE private_documents SET status='ready',object_key=? WHERE id=? AND uploader_id=? AND status='uploading' AND ${guard.sql} RETURNING id`).bind(key,id,user.userId,...guard.args).first();if(saved)return true;await requireGuard(guard);const current=await get(id);if(current?.status!=='ready')throw new TrainingError('המסמך השתנה.',409);return false;},
 };
}
