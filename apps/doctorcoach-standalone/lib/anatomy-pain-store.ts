import {parseAnatomyPain,type AnatomyPainBundle,type AnatomyPainRecord} from './anatomy-pain.ts';
import {requireHealthConsent,healthConsentGuard} from './consent-server.ts';
import {inputRecord,validId} from './care.ts';
import {TrainingError} from './training.ts';
import {painExerciseResolver,type PainCatalog} from './anatomy-pain-exercises.ts';
import type {ProgramAuthorConfig} from './program-author.ts';
import type {StaffIdentity} from './staff.ts';

function sameRequest(stored:string,data:ReturnType<typeof parseAnatomyPain>){const old=parseAnatomyPain(JSON.parse(stored));if(!data.occurrenceId)delete old.occurrenceId;return JSON.stringify(old)===JSON.stringify(data);}
export function anatomyPainStore(db:D1Database,config:ProgramAuthorConfig={}){
 const resolver=painExerciseResolver(db,config);
 function guard(user:StaffIdentity){const c=healthConsentGuard(user.userId);return {sql:`(${c.sql}) AND NOT EXISTS(SELECT 1 FROM account_deletions WHERE user_id=?)`,args:[...c.args,user.userId]};}
 async function list(user:StaffIdentity,all=false):Promise<AnatomyPainBundle>{
  await requireHealthConsent(db,user.userId);const g=guard(user);
  const rows=await db.prepare(`SELECT id,content_json,updated_at FROM wellness_records WHERE client_id=? AND kind='painLocation' AND ${g.sql} ORDER BY json_extract(content_json,'$.occurredAt') DESC,updated_at DESC,id DESC ${all?'':'LIMIT 100'}`).bind(user.userId,...g.args).all<{id:string;content_json:string;updated_at:string}>();
  const allowed=await db.prepare(`SELECT CASE WHEN ${g.sql} THEN 1 ELSE 0 END allowed`).bind(...g.args).first<{allowed:number}>();if(!allowed?.allowed)throw new TrainingError('ההרשאות השתנו. רעננו את התיק לפני צפייה.',403);
  return {ownerId:user.userId,records:rows.results.map(r=>({id:r.id,data:JSON.parse(r.content_json),createdAt:r.updated_at})) as AnatomyPainRecord[]};
 }
 return {async catalog(user:StaffIdentity):Promise<PainCatalog>{await requireHealthConsent(db,user.userId);const result=await resolver.catalog(user),g=guard(user);const allowed=await db.prepare(`SELECT CASE WHEN (${g.sql}) AND (${result.guard.sql}) THEN 1 ELSE 0 END allowed`).bind(...g.args,...result.guard.args).first<{allowed:number}>();if(!allowed?.allowed)throw new TrainingError('ההרשאות השתנו. רעננו את רשימת התרגילים.',403);return {ownerId:user.userId,exercises:result.exercises};},list:(user:StaffIdentity)=>list(user),export:(user:StaffIdentity)=>list(user,true),async save(user:StaffIdentity,payload:unknown):Promise<AnatomyPainBundle>{
  const p=inputRecord(payload);if(p.ownerId!==undefined&&p.ownerId!==user.userId||p.clientId!==undefined&&p.clientId!==user.userId)throw new TrainingError('דיווח כאב נשמר בחשבון האישי בלבד.',403);
  await requireHealthConsent(db,user.userId);const id=validId(p.id),data=parseAnatomyPain(p.data),g=guard(user);
  const previous=await db.prepare(`SELECT content_json FROM wellness_records WHERE id=? AND client_id=? AND kind='painLocation' AND ${g.sql}`).bind(id,user.userId,...g.args).first<{content_json:string}>();
  if(previous){if(!sameRequest(previous.content_json,data))throw new TrainingError('מזהה הדיווח כבר נשמר עם תוכן אחר.',409);return list(user);}
  const resolved=await resolver.resolve(user,data),exerciseGuard=resolved.guard.sql,exerciseArgs=resolved.guard.args;
  const stored={...data,...resolved.occurrenceId?{occurrenceId:resolved.occurrenceId}:{},...resolved.option?{exerciseNameHe:resolved.option.he,exerciseNameEn:resolved.option.en}:{}},json=JSON.stringify(stored);
  const saved=await db.prepare(`INSERT INTO wellness_records(id,client_id,kind,slot,day,content_json,author_name,updated_at) SELECT ?,?,'painLocation',?,?,?,'דיווח אישי',? WHERE ${g.sql} AND ${exerciseGuard} ON CONFLICT DO NOTHING RETURNING id`).bind(id,user.userId,id,data.occurredAt.slice(0,10),json,new Date().toISOString(),...g.args,...exerciseArgs).first();
  if(!saved){await requireHealthConsent(db,user.userId);const previous=await db.prepare(`SELECT content_json FROM wellness_records WHERE id=? AND client_id=? AND kind='painLocation' AND ${g.sql} AND ${exerciseGuard}`).bind(id,user.userId,...g.args,...exerciseArgs).first<{content_json:string}>();if(!previous||!sameRequest(previous.content_json,data))throw new TrainingError('השמירה לא אושרה. ההרשאה, התרגיל או מזהה הדיווח השתנו.',409);}
  return list(user);
 }};
}
