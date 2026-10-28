import {nutritionTextGuard,requireNutritionText} from './nutrition-authority.ts';
import {isVideoMime,quickTimeHeader} from './video-format.ts';
import {availableCustomExercises} from './custom-exercises.ts';
import {customId} from './custom-exercise-types.ts';
import {CONSENT_REVISION} from './intake.ts';
import {careStore} from './care-store.ts';
import {careConnectionGuard,combineCareGuards,staffRoleGuard} from './care-write-guard.ts';
import {healthConsentGuard,requireHealthConsent} from './consent-server.ts';
import type {CareConfig} from './care-store.ts';
import type {StaffIdentity} from './staff.ts';
import {inputRecord,integerField,textField,validId} from './care.ts';
import {resolveSessionExercise,withOccurrenceIds,TrainingError} from './training.ts';
import {exercises} from './content.ts';
import {isStaff,isAdmin} from './staff.ts';
export const MAX_VIDEO_BYTES=25*1024*1024;
export type VideoFeedback={id:string;authorName:string;content:string;createdAt:string};
export type VideoAsset={exerciseName?:string;id:string;exerciseId:string;caption:string;sessionId:string|null;setIndex:number|null;occurrenceId?:string|null;mime:string;bytes:number;kind:'demo'|'review';status:string;published:boolean;canDelete:boolean;createdAt:string;feedback:VideoFeedback[]};
export type AssetRow={id:string;owner_id:string;kind:string;exercise_id:string;caption:string;session_id:string|null;set_index:number|null;occurrence_id:string|null;mime:string;bytes:number;object_key:string;status:string;published:number;created_at:string};
export function mediaStore(db:D1Database,config:CareConfig={}){
 const care=careStore(db,config);
 const get=(id:string)=>db.prepare('SELECT * FROM media_assets WHERE id=?').bind(id).first<AssetRow>();
 async function uploadGuard(user:StaffIdentity,kind:string){
  if(kind==='demo'){if(!isAdmin(user,config.adminEmails))throw new TrainingError('ניהול סרטוני הדרכה זמין למנהל מערכת בלבד.',403);const staff=await care.requireStaff(user);return staffRoleGuard(staff.email,staff.role,config);}
  return combineCareGuards(careConnectionGuard({clientId:user.userId},config),healthConsentGuard(user.userId),{sql:"COALESCE((SELECT accepted<>0 AND revision=? FROM user_consents WHERE user_id=? AND consent_id='media' ORDER BY created_at DESC,rowid DESC LIMIT 1),0)",args:[CONSENT_REVISION,user.userId]});
 }
 async function requireGuard(guard:{sql:string;args:(string|number)[]}){const r=await db.prepare(`SELECT CASE WHEN ${guard.sql} THEN 1 ELSE 0 END allowed`).bind(...guard.args).first<{allowed:number}>();if(!r?.allowed)throw new TrainingError('הרשאות ההעלאה או ההסכמות השתנו. רעננו לפני המשך.',403);}
 function setGuard(owner:string,sessionId:string|null,exerciseId:string,index:number|null,occurrenceId:string|null=null){return sessionId?{sql:"EXISTS(SELECT 1 FROM training_sessions s,json_each(s.items_json) i WHERE s.id=? AND s.owner_id=? AND json_extract(i.value,'$.exerciseId')=? AND json_array_length(json_extract(i.value,'$.results'))>? AND (?='' OR COALESCE(json_extract(i.value,'$.occurrenceId'),COALESCE(json_extract(i.value,'$.dayId'),'1')||':'||json_extract(i.value,'$.exerciseId'))=?))",args:[sessionId,owner,exerciseId,index!,occurrenceId??'',occurrenceId??'']}:{sql:'1=1',args:[]};}
 async function requireUser(user:StaffIdentity|null):Promise<StaffIdentity>{if(!user)throw new TrainingError('יש להתחבר כדי לצפות בסרטון.',401);return user;}
 async function readGuard(user:StaffIdentity|null,kind:string,owner:string,publicDemo=false){
  if(kind==='demo'&&publicDemo)return {sql:'1=1',args:[]};
  const u=await requireUser(user);
  if(kind==='demo'){const staff=await care.requireStaff(u);return staffRoleGuard(staff.email,staff.role,config);}
  const access=await care.authorize(u,owner);
  return access.self?{sql:'1=1',args:[]}:combineCareGuards(careConnectionGuard({clientId:owner,email:access.staff!.email,role:access.staff!.role},config),healthConsentGuard(owner),{sql:"COALESCE((SELECT accepted<>0 AND revision=? FROM user_consents WHERE user_id=? AND consent_id='media' ORDER BY created_at DESC,rowid DESC LIMIT 1),0)",args:[CONSENT_REVISION,owner]});
 }
 async function requireReadGuard(guard:{sql:string;args:(string|number)[]}){const row=await db.prepare(`SELECT CASE WHEN ${guard.sql} THEN 1 ELSE 0 END AS allowed`).bind(...guard.args).first<{allowed:number}>();if(!row?.allowed)throw new TrainingError('הרשאות הסרטון או זמינותו השתנו. רעננו לפני צפייה.',403);}
 async function confirmReadable(user:StaffIdentity|null,row:AssetRow){
  const permission=await readGuard(user,row.kind,row.owner_id,row.kind==='demo'&&!!row.published);
  await requireReadGuard(combineCareGuards(permission,{sql:`EXISTS(SELECT 1 FROM media_assets WHERE id=? AND owner_id=? AND kind=? AND status='ready' AND object_key=? AND mime=? AND bytes=? ${row.kind==='demo'&&row.published?'AND published=1':''})`,args:[row.id,row.owner_id,row.kind,row.object_key,row.mime,row.bytes]}));
 }
 async function readable(user:StaffIdentity|null,id:string){const row=await get(id);if(!row||row.status!=='ready')throw new TrainingError('הסרטון אינו זמין.',404);await confirmReadable(user,row);return row;}
 return {
  get,readable,confirmReadable,
  async list(user:StaffIdentity|null,kind:'demo'|'review',clientId?:string,manage=false):Promise<VideoAsset[]>{
   const owner=clientId??user?.userId??'';
   const permission=await readGuard(user,kind,owner,kind==='demo'&&!manage);
   const rows=kind==='demo'?await db.prepare(`SELECT * FROM media_assets WHERE kind='demo' AND status='ready' ${manage?'':'AND published=1'} ORDER BY created_at DESC LIMIT 300`).all<AssetRow>():await db.prepare("SELECT * FROM media_assets WHERE kind='review' AND owner_id=? AND status='ready' ORDER BY created_at DESC LIMIT 30").bind(owner).all<AssetRow>();
   const feedback=kind==='review'?await db.prepare('SELECT f.id,f.asset_id,f.author_name AS authorName,f.content,f.created_at AS createdAt FROM media_feedback f JOIN media_assets m ON m.id=f.asset_id WHERE m.owner_id=? AND m.status=? ORDER BY f.created_at DESC').bind(owner,'ready').all<VideoFeedback&{asset_id:string}>():{results:[]};
   // Validate every captured asset and the viewer together after feedback reads.
   const availability={sql:`NOT EXISTS(SELECT 1 FROM json_each(?) captured WHERE NOT EXISTS(SELECT 1 FROM media_assets m WHERE m.id=captured.value AND m.kind=? AND m.status='ready' ${kind==='review'?'AND m.owner_id=?':manage?'':'AND m.published=1'}))`,args:[JSON.stringify(rows.results.map(r=>r.id)),kind,...(kind==='review'?[owner]:[])]};
   await requireReadGuard(combineCareGuards(permission,availability));
   const customIds=rows.results.map(r=>r.exercise_id).filter(customId);const names=customIds.length?(await db.prepare('SELECT id,definition_json FROM custom_exercises WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(customIds)).all<{id:string;definition_json:string}>()).results:[];const customNames=new Map(names.map(r=>[r.id,JSON.parse(r.definition_json).name as string]));if(customIds.length)await requireReadGuard(combineCareGuards(permission,availability));
   return rows.results.map(r=>({...customNames.has(r.exercise_id)?{exerciseName:customNames.get(r.exercise_id)}:{},id:r.id,exerciseId:r.exercise_id,caption:r.caption,sessionId:r.session_id,setIndex:r.set_index,occurrenceId:r.occurrence_id,mime:r.mime,bytes:r.bytes,kind:r.kind as 'demo'|'review',status:r.status,published:!!r.published,canDelete:r.kind==='demo'?isAdmin(user,config.adminEmails):user?.userId===r.owner_id,createdAt:r.created_at,feedback:feedback.results.filter(f=>f.asset_id===r.id).map(({asset_id,...f})=>f)}));
  },
  async initialize(user:StaffIdentity,payload:unknown){
   const p=inputRecord(payload),id=validId(p.id);
   if(p.kind!=='demo'&&p.kind!=='review')throw new TrainingError('סוג סרטון לא מוכר.');
   const permission=await uploadGuard(user,p.kind);await requireGuard(permission);
   const custom=typeof p.exerciseId==='string'&&customId(p.exerciseId)?(await availableCustomExercises(db,user.userId,p.kind==='review'?user.userId:undefined)).find(e=>e.id===p.exerciseId):undefined;
   if(!exercises.some(e=>e.id===p.exerciseId)&&!custom||!isVideoMime(String(p.mime)))throw new TrainingError('בחרו תרגיל וקובץ MP4, MOV או WebM.');
   if(custom&&p.kind==='demo'&&!(await db.prepare("SELECT 1 ok FROM custom_exercises WHERE id=? AND state='published'").bind(custom.id).first()))throw new TrainingError('סרטון הדרכה כללי דורש תרגיל שפורסם בספרייה הכללית.',403);
   let sessionId:string|null=null,setIndex:number|null=null,occurrenceId:string|null=null;if(p.sessionId!==undefined&&p.sessionId!==null){if(p.kind!=='review')throw new TrainingError('קישור לסט זמין לסרטון ביצוע אישי בלבד.');sessionId=validId(p.sessionId);const session=await db.prepare('SELECT items_json FROM training_sessions WHERE id=? AND owner_id=?').bind(sessionId,user.userId).first<{items_json:string}>();if(!session)throw new TrainingError('האימון לא נמצא.',404);const item=resolveSessionExercise(withOccurrenceIds(JSON.parse(session.items_json) as import('./training.ts').SessionExercise[]),p);occurrenceId=item.occurrenceId!;if(!item)throw new TrainingError('התרגיל אינו באימון.');setIndex=integerField(p.setIndex,'מספר סט',0,item.results.length-1);}const bytes=integerField(p.bytes,'גודל קובץ',32,MAX_VIDEO_BYTES);const caption=textField(p.caption,'תיאור הסרטון',500,2);
   const link=setGuard(user.userId,sessionId,String(p.exerciseId),setIndex,occurrenceId),guard=combineCareGuards(permission,link);
   const retry=(existing:AssetRow)=>{if(existing.owner_id!==user.userId||existing.status==='deleted'||existing.kind!==p.kind||existing.exercise_id!==p.exerciseId||existing.caption!==caption||existing.bytes!==bytes||existing.mime!==p.mime||existing.session_id!==sessionId||existing.set_index!==setIndex||(existing.occurrence_id??null)!==occurrenceId)throw new TrainingError('מזהה הסרטון כבר משויך לפרטים אחרים.',409);return {id,status:existing.status};};
   const existing=await get(id);if(existing){await requireGuard(guard);return retry(existing);}
   const saved=await db.prepare(`INSERT INTO media_assets(id,owner_id,kind,exercise_id,caption,mime,bytes,object_key,status,created_at,session_id,set_index,occurrence_id)
    SELECT ?,?,?,?,?,?,?,?,?,?,?,?,? WHERE ${guard.sql} AND (SELECT COUNT(*) FROM media_assets WHERE owner_id=? AND kind=? AND status!='deleted')<? ON CONFLICT(id) DO NOTHING RETURNING id`)
    .bind(id,user.userId,p.kind,p.exerciseId,caption,p.mime,bytes,`videos/${id}`,'uploading',new Date().toISOString(),sessionId,setIndex,occurrenceId,...guard.args,user.userId,p.kind,p.kind==='demo'?300:30).first();
   if(!saved){await requireGuard(guard);const winner=await get(id);if(winner)return retry(winner);throw new TrainingError('הגעתם למכסת הסרטונים. הסירו סרטון ישן לפני העלאה חדשה.',409);}
   return {id,status:'uploading'};
  },
  async writable(user:StaffIdentity,id:string){
   const row=await get(id);if(!row||row.owner_id!==user.userId||!['uploading','ready'].includes(row.status))throw new TrainingError('אין הרשאה להעלאה זו.',403);
   await requireGuard(combineCareGuards(await uploadGuard(user,row.kind),setGuard(user.userId,row.session_id,row.exercise_id,row.set_index,row.occurrence_id)));
   return row;
  },
  async ready(user:StaffIdentity,id:string,objectKey?:string){
   const row=await get(id);if(!row||row.owner_id!==user.userId||!['uploading','ready'].includes(row.status))throw new TrainingError('אין הרשאה להעלאה זו.',403);
   const guard=combineCareGuards(await uploadGuard(user,row.kind),setGuard(user.userId,row.session_id,row.exercise_id,row.set_index,row.occurrence_id));
   const saved=await db.prepare(`UPDATE media_assets SET status='ready',object_key=? WHERE id=? AND owner_id=? AND kind=? AND status='uploading' AND ${guard.sql} RETURNING id`).bind(objectKey??row.object_key,id,user.userId,row.kind,...guard.args).first();
   if(saved)return true;
   await requireGuard(guard);const current=await get(id);
   if(current?.owner_id!==user.userId||current.kind!==row.kind||current.status!=='ready')throw new TrainingError('הסרטון אינו זמין להשלמת העלאה.',409);
   return false;
  },
  async publish(user:StaffIdentity,payload:unknown){
   const guard=await uploadGuard(user,'demo'),p=inputRecord(payload);
   if(typeof p.published!=='boolean')throw new TrainingError('יש לבחור מצב פרסום.');
   if(p.published&&p.rightsConfirmed!==true)throw new TrainingError('יש לאשר זכויות לפרסום הסרטון.');
   const row=await db.prepare(`UPDATE media_assets SET published=? WHERE id=? AND kind='demo' AND status='ready' AND ${guard.sql} RETURNING id`).bind(p.published?1:0,validId(p.id),...guard.args).first();
   if(!row){await requireGuard(guard);throw new TrainingError('סרטון ההדרכה לא נמצא.',404);}
  },
  async feedback(user:StaffIdentity,payload:unknown){
   const p=inputRecord(payload),row=await readable(user,validId(p.assetId));
   if(row.kind!=='review')throw new TrainingError('משוב ניתן לסרטון מתאמן בלבד.');
   const access=await care.authorize(user,row.owner_id);
   if(access.self||!access.staff)throw new TrainingError('משוב נכתב על ידי הצוות המטפל.',403);
   await requireHealthConsent(db,row.owner_id);
   const id=validId(p.id),content=textField(p.content,'משוב',2000,2);
   await requireNutritionText(db,user,row.owner_id,content,config);
   const permission=combineCareGuards(careConnectionGuard({clientId:row.owner_id,email:access.staff.email,role:access.staff.role},config),healthConsentGuard(row.owner_id),nutritionTextGuard(user,row.owner_id,content,config),
    {sql:"COALESCE((SELECT accepted<>0 AND revision=? FROM user_consents WHERE user_id=? AND consent_id='media' ORDER BY created_at DESC,rowid DESC LIMIT 1),0)",args:[CONSENT_REVISION,row.owner_id]});
   const guard=combineCareGuards(permission,{sql:"EXISTS(SELECT 1 FROM media_assets WHERE id=? AND owner_id=? AND kind='review' AND status='ready')",args:[row.id,row.owner_id]});
   const saved=await db.prepare(`INSERT INTO media_feedback(id,asset_id,author_id,author_name,content,created_at) SELECT ?,?,?,?,?,? WHERE ${guard.sql} ON CONFLICT(id) DO NOTHING RETURNING id`)
    .bind(id,row.id,user.userId,access.staff.name,content,new Date().toISOString(),...guard.args).first();
   if(!saved){
    const allowed=await db.prepare(`SELECT CASE WHEN ${permission.sql} THEN 1 ELSE 0 END allowed`).bind(...permission.args).first<{allowed:number}>();
    if(!allowed?.allowed)throw new TrainingError('הרשאות המשוב או ההסכמות השתנו. רעננו לפני שמירה.',403);
    const current=await get(row.id);
    if(!current||current.owner_id!==row.owner_id||current.kind!=='review'||current.status!=='ready')throw new TrainingError('הסרטון אינו זמין למשוב.',404);
    const previous=await db.prepare('SELECT asset_id,author_id,content FROM media_feedback WHERE id=?').bind(id).first<{asset_id:string;author_id:string|null;content:string}>();
    if(!previous||previous.asset_id!==row.id||previous.author_id!==user.userId||previous.content!==content)throw new TrainingError('מזהה המשוב כבר משויך לפרטים אחרים.',409);
   }
  },
  async replacementTarget(user:StaffIdentity,id:string){const guard=await uploadGuard(user,'demo');await requireGuard(guard);const row=await get(id);if(!row||row.kind!=='demo'||row.status!=='ready')throw new TrainingError('סרטון ההדרכה אינו זמין להחלפה.',404);return row;},
  async replace(user:StaffIdentity,previous:AssetRow,key:string,mime:string,bytes:number){
   const guard=await uploadGuard(user,'demo');
   if(!isVideoMime(mime)||!Number.isInteger(bytes)||bytes<32||bytes>MAX_VIDEO_BYTES)throw new TrainingError('קובץ סרטון לא תקין.');
   const saved=await db.prepare(`UPDATE media_assets SET object_key=?,mime=?,bytes=? WHERE id=? AND kind='demo' AND status='ready' AND object_key=? AND published=? AND ${guard.sql} RETURNING id`).bind(key,mime,bytes,previous.id,previous.object_key,previous.published,...guard.args).first();
   if(!saved){await requireGuard(guard);throw new TrainingError('הסרטון השתנה בזמן ההחלפה. רעננו ונסו שוב.',409);}return true;
  },
  async remove(user:StaffIdentity,id:string){const row=await get(id);if(!row)throw new TrainingError('הסרטון לא נמצא.',404);const guard=row.kind==='demo'?await uploadGuard(user,'demo'):{sql:'owner_id=?',args:[user.userId]};if(row.kind!=='demo'&&row.owner_id!==user.userId)throw new TrainingError('רק מי שהעלה את הסרטון יכול להסירו.',403);const removed=await db.prepare(`UPDATE media_assets SET status='deleted',published=0 WHERE id=? AND object_key=? AND ${guard.sql} RETURNING id`).bind(id,row.object_key,...guard.args).first();if(!removed){if(row.kind==='demo')await requireGuard(guard);throw new TrainingError('הסרטון השתנה. רעננו לפני הסרה.',409);}return row.object_key;},
 };
}
export async function readVideoBody(request:Request,expected:number,mime:string):Promise<Uint8Array>{if(!request.body)throw new TrainingError('הקובץ ריק.');const reader=request.body.getReader();const chunks:Uint8Array[]=[];let size=0;try{while(true){const result=await reader.read();if(result.done)break;size+=result.value.byteLength;if(size>expected||size>MAX_VIDEO_BYTES){await reader.cancel();throw new TrainingError('הקובץ גדול מהגודל שאושר.',413);}chunks.push(result.value);}}finally{reader.releaseLock();}if(size!==expected)throw new TrainingError('העלאת הקובץ לא הסתיימה. נסו שוב.');const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}const mp4=new TextDecoder().decode(bytes.slice(4,8))==='ftyp';const webm=bytes[0]===0x1a&&bytes[1]===0x45&&bytes[2]===0xdf&&bytes[3]===0xa3;if(!isVideoMime(mime)||(mime==='video/mp4'&&!mp4)||(mime==='video/webm'&&!webm)||(mime==='video/quicktime'&&!quickTimeHeader(bytes)))throw new TrainingError('תוכן הקובץ אינו תואם לפורמט שנבחר.');return bytes;}
export function videoRange(header:string|null,size:number):{offset:number;length:number}|undefined{if(!header)return;const match=/^bytes=(\d*)-(\d*)$/.exec(header);if(!match||(!match[1]&&!match[2]))throw new TrainingError('טווח הסרטון אינו תקין.',416);const offset=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));const end=match[1]?(match[2]?Math.min(size-1,Number(match[2])):size-1):size-1;if(!Number.isSafeInteger(offset)||offset<0||offset>=size||end<offset)throw new TrainingError('טווח הסרטון אינו זמין.',416);return {offset,length:end-offset+1};}
