import {messagingStore} from './messaging-store.ts';
import {privateDocumentStore} from './private-document-store.ts';
import {careStore,type CareConfig} from './care-store.ts';
import {careConnectionGuard,combineCareGuards} from './care-write-guard.ts';
import {healthConsentGuard} from './consent-server.ts';
import {CONSENT_REVISION} from './intake.ts';
import {inputRecord,textField,validId} from './care.ts';
import {channels,type Channel,type Message} from './messaging.ts';
import {TrainingError} from './training.ts';
import type {StaffIdentity} from './staff.ts';
import {exercises} from './content.ts';
const roles={medical:'clinician',training:'coach',nutrition:'dietitian',scheduling:'coordinator'};
export type LinkedMessage=Message&{read:boolean;documentId:string|null;filename:string|null;videoId:string|null;exerciseId:string|null;sessionId:string|null};
export function communicationStore(db:D1Database,config:CareConfig={}){
 const messages=messagingStore(db,config),files=privateDocumentStore(db,config),care=careStore(db,config);
 function channelGuard(user:StaffIdentity,clientId:string,channel:Channel,write=false){const connection=careConnectionGuard({clientId,...(user.userId===clientId?{}:{email:user.email}),role:roles[channel],scope:channel==='scheduling'?'coordinator':'care',...(channel==='medical'?{grant:'medical_access' as const}:channel==='nutrition'?{grant:'nutrition_access' as const}:{})},config);return write?combineCareGuards(connection,...(channel==='scheduling'?[]:[healthConsentGuard(clientId)])):user.userId===clientId?{sql:'1=1',args:[]}:combineCareGuards(connection,...(channel==='scheduling'?[]:[healthConsentGuard(clientId)]));}
 return {async threads(user:StaffIdentity){const threads=await messages.threads(user);const output=[];for(const thread of threads){const state=await db.prepare("SELECT COALESCE((SELECT MAX(rowid) FROM team_messages WHERE client_id=? AND channel=?),0) AS latest,COALESCE((SELECT resolved_through FROM thread_states WHERE client_id=? AND channel=?),0) AS resolvedThrough").bind(thread.clientId,thread.channel,thread.clientId,thread.channel).first<{latest:number;resolvedThrough:number}>();await files.requireGuard(channelGuard(user,thread.clientId,thread.channel));output.push({...thread,resolved:!!state&&state.latest>0&&state.resolvedThrough>=state.latest});}return output;},
 async list(user:StaffIdentity,clientId:string,channel:Channel,query=''){
  const result=await messages.list(user,clientId,channel),guard=channelGuard(user,clientId,channel);
  const q=textField(query,'חיפוש',120);
  const ids=q?(await db.prepare("SELECT id FROM team_messages WHERE client_id=? AND channel=? AND instr(lower(content),lower(?))>0 ORDER BY rowid DESC LIMIT 100").bind(clientId,channel,q).all<{id:string}>()).results.map(m=>m.id):result.messages.map(m=>m.id);
  const rows=await db.prepare(`SELECT m.id,m.client_id AS clientId,m.channel,m.author_id AS authorId,m.author_name AS authorName,m.author_role AS authorRole,m.content,m.created_at AS createdAt,
   CASE WHEN EXISTS(SELECT 1 FROM message_reads r WHERE r.client_id=m.client_id AND r.channel=m.channel AND CAST(r.read_through AS INTEGER)>=m.rowid AND (CASE WHEN m.author_id=m.client_id THEN r.user_id<>m.client_id ELSE r.user_id=m.client_id END)) THEN 1 ELSE 0 END AS read,
   CASE WHEN d.status='ready' THEN d.id END AS documentId,CASE WHEN d.status='ready' THEN d.filename END AS filename,
   CASE WHEN v.status='ready' THEN v.id END AS videoId,l.exercise_id AS exerciseId,l.session_id AS sessionId
   FROM team_messages m LEFT JOIN message_links l ON l.message_id=m.id LEFT JOIN private_documents d ON d.id=l.document_id AND d.client_id=m.client_id AND d.purpose='message' AND d.channel=m.channel LEFT JOIN media_assets v ON v.id=l.video_id AND v.owner_id=m.client_id AND v.kind='review' WHERE m.client_id=? AND m.channel=? AND m.id IN (SELECT value FROM json_each(?)) ORDER BY m.rowid`).bind(clientId,channel,JSON.stringify(ids)).all<Omit<LinkedMessage,'read'>&{read:number}>();
  const state=await db.prepare("SELECT s.resolved_through,COALESCE((SELECT MAX(rowid) FROM team_messages WHERE client_id=? AND channel=?),0) AS latest FROM thread_states s WHERE s.client_id=? AND s.channel=?").bind(clientId,channel,clientId,channel).first<{resolved_through:number;latest:number}>();
  await files.requireGuard(guard);
  const currentAvailable=await db.prepare(`SELECT CASE WHEN ${channelGuard(user,clientId,channel,true).sql} THEN 1 ELSE 0 END AS allowed`).bind(...channelGuard(user,clientId,channel,true).args).first<{allowed:number}>();
  await files.requireGuard(guard);
  return {...result,messages:rows.results.map(m=>({...m,read:!!m.read})),available:!!currentAvailable?.allowed,resolved:!!state&&state.resolved_through>=state.latest,canResolve:user.userId!==clientId,searchLimited:rows.results.length===100};
 },
 async send(user:StaffIdentity,payload:unknown){
  const p=inputRecord(payload),clientId=textField(p.clientId,'מתאמן',200,1),channel=textField(p.channel,'ערוץ',30,1) as Channel,id=validId(p.id),content=textField(p.content,'הודעה',3000,1);
  const access=await messages.authorize(user,clientId,channel);if(!access.available)throw new TrainingError('אין צוות מורשה בערוץ זה.',403);
  const documentId=p.documentId?validId(p.documentId):null,videoId=p.videoId?validId(p.videoId):null,sessionId=p.sessionId?validId(p.sessionId):null,exerciseId=p.exerciseId?textField(p.exerciseId,'תרגיל',100,1):null;
  if(exerciseId&&!exercises.some(e=>e.id===exerciseId))throw new TrainingError('תרגיל לא מוכר.');
  const guards=[channelGuard(user,clientId,channel,true)];
  if(documentId||videoId)guards.push({sql:"COALESCE((SELECT accepted<>0 AND revision=? FROM user_consents WHERE user_id=? AND consent_id='media' ORDER BY created_at DESC,rowid DESC LIMIT 1),0)",args:[CONSENT_REVISION,clientId]});
  if(documentId){const row=await files.readable(user,documentId);if(row.client_id!==clientId||row.purpose!=='message'||row.channel!==channel||row.uploader_id!==user.userId)throw new TrainingError('הקובץ אינו שייך להודעה זו.',403);guards.push({sql:"EXISTS(SELECT 1 FROM private_documents WHERE id=? AND client_id=? AND purpose='message' AND channel=? AND uploader_id=? AND status='ready')",args:[documentId,clientId,channel,user.userId]});}
  if(videoId)guards.push({sql:"EXISTS(SELECT 1 FROM media_assets WHERE id=? AND owner_id=? AND kind='review' AND status='ready')",args:[videoId,clientId]});
  if(sessionId)guards.push({sql:`EXISTS(SELECT 1 FROM training_sessions WHERE id=? AND owner_id=? ${exerciseId?"AND EXISTS(SELECT 1 FROM json_each(items_json) i WHERE json_extract(i.value,'$.exerciseId')=?)":''})`,args:[sessionId,clientId,...(exerciseId?[exerciseId]:[])]});
  const guard=combineCareGuards(...guards);await files.requireGuard(guard);
  const existing=await db.prepare('SELECT m.author_id,m.client_id,m.channel,m.content,l.document_id,l.video_id,l.exercise_id,l.session_id FROM team_messages m LEFT JOIN message_links l ON l.message_id=m.id WHERE m.id=?').bind(id).first<Record<string,unknown>>();
  const identical=(r:Record<string,unknown>|null)=>r&&r.author_id===user.userId&&r.client_id===clientId&&r.channel===channel&&r.content===content&&(r.document_id??null)===documentId&&(r.video_id??null)===videoId&&(r.exercise_id??null)===exerciseId&&(r.session_id??null)===sessionId;
  if(existing){await files.requireGuard(guard);if(!identical(existing))throw new TrainingError('מזהה ההודעה כבר בשימוש.',409);return {ok:true};}
  const recent=await db.prepare('SELECT COUNT(*) AS n FROM team_messages WHERE author_id=? AND created_at>?').bind(user.userId,new Date(Date.now()-60000).toISOString()).first<{n:number}>();if((recent?.n??0)>=15)throw new TrainingError('נשלחו הודעות רבות. נסו שוב בעוד דקה.',429);
  const own=await db.prepare('SELECT name FROM care_profiles WHERE user_id=?').bind(user.userId).first<{name:string}>(),at=new Date().toISOString();
  const gate="EXISTS(SELECT 1 FROM team_messages WHERE id=? AND author_id=? AND client_id=? AND channel=? AND content=? AND created_at=?)";
  await db.batch([
   db.prepare(`INSERT INTO team_messages(id,client_id,channel,author_id,author_name,author_role,content,created_at) SELECT ?,?,?,?,?,?,?,? WHERE ${guard.sql} ON CONFLICT DO NOTHING`).bind(id,clientId,channel,user.userId,access.staff?.name??own?.name??'מתאמן',access.staff?.role??'trainee',content,at,...guard.args),
   db.prepare(`INSERT INTO message_links(message_id,document_id,video_id,exercise_id,session_id) SELECT ?,?,?,?,? WHERE ${gate} AND ${guard.sql} ON CONFLICT DO NOTHING`).bind(id,documentId,videoId,exerciseId,sessionId,id,user.userId,clientId,channel,content,at,...guard.args),
   db.prepare(`INSERT INTO audit_events(id,actor_id,subject_id,action,created_at) SELECT ?,?,?,?,? WHERE ${gate}`).bind(crypto.randomUUID(),user.userId,clientId,'messages.send',at,id,user.userId,clientId,channel,content,at)
  ]);
  await files.requireGuard(guard);const saved=await db.prepare('SELECT m.author_id,m.client_id,m.channel,m.content,l.document_id,l.video_id,l.exercise_id,l.session_id FROM team_messages m LEFT JOIN message_links l ON l.message_id=m.id WHERE m.id=?').bind(id).first<Record<string,unknown>>();if(!identical(saved))throw new TrainingError('לא ניתן לשמור את ההודעה. רעננו לפני ניסיון נוסף.',409);return {ok:true};
 },
 read:messages.read,
 async resolve(user:StaffIdentity,payload:unknown){const p=inputRecord(payload),clientId=textField(p.clientId,'מתאמן',200,1),channel=textField(p.channel,'ערוץ',30,1) as Channel;const access=await messages.authorize(user,clientId,channel);if(access.self)throw new TrainingError('רק הצוות מסמן שיחה כטופלה.',403);
  const seen=p.messageId?await db.prepare('SELECT rowid AS sequence FROM team_messages WHERE id=? AND client_id=? AND channel=?').bind(validId(p.messageId),clientId,channel).first<{sequence:number}>():await db.prepare('SELECT CAST(read_through AS INTEGER) AS sequence FROM message_reads WHERE user_id=? AND client_id=? AND channel=?').bind(user.userId,clientId,channel).first<{sequence:number}>();
  if(!seen?.sequence)throw new TrainingError('יש לפתוח את השיחה לפני סימון הטיפול.',409);
  const guard=combineCareGuards(channelGuard(user,clientId,channel,true),{sql:'COALESCE((SELECT MAX(rowid) FROM team_messages WHERE client_id=? AND channel=?),0)=?',args:[clientId,channel,seen.sequence]});
  const saved=await db.prepare(`INSERT INTO thread_states(client_id,channel,resolved_through,resolved_by,updated_at) SELECT ?,?,?,?,? WHERE ${guard.sql} ON CONFLICT(client_id,channel) DO UPDATE SET resolved_through=MAX(thread_states.resolved_through,excluded.resolved_through),resolved_by=excluded.resolved_by,updated_at=excluded.updated_at RETURNING client_id`).bind(clientId,channel,seen.sequence,user.userId,new Date().toISOString(),...guard.args).first();
  if(!saved){await files.requireGuard(channelGuard(user,clientId,channel,true));throw new TrainingError('נוספה הודעה חדשה. רעננו וקראו אותה לפני סימון הטיפול.',409);}return {ok:true};}
 };
}
