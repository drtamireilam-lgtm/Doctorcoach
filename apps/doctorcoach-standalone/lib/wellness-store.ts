import {requireNutritionCredential,nutritionCredentialGuard} from './nutrition-authority.ts';
import {requireWellnessWriteAccess,wellnessWriteGuard} from './wellness-write-guard.ts';
import {healthConsentGuard,requireHealthConsent} from './consent-server.ts';
import {careStore} from './care-store.ts';
import {careConnectionGuard,combineCareGuards} from './care-write-guard.ts';
import type {CareConfig} from './care-store.ts';
import type {StaffIdentity} from './staff.ts';
import {inputRecord,integerField,textField,validId} from './care.ts';
import {TrainingError} from './training.ts';
import {dayField,parseWellness,todayIsrael} from './wellness.ts';
import type {WellnessBundle,WellnessKind,WellnessRecord} from './wellness.ts';
type Row={id:string;kind:WellnessKind;slot:string;day:string;content_json:string;version:number;author_name:string;updated_at:string};
const rowRecord=(r:Row):WellnessRecord=>({id:r.id,kind:r.kind,slot:r.slot,day:r.day,data:JSON.parse(r.content_json),version:r.version,authorName:r.author_name,updatedAt:r.updated_at});
export function wellnessStore(db:D1Database,config:CareConfig={}){
 const care=careStore(db,config);
 async function bundle(user:StaffIdentity,clientId:string):Promise<WellnessBundle>{
  const a=await care.authorize(user,clientId);
  const credential=nutritionCredentialGuard(user.email),nutritionVerified=!!(a.nutrition&&!a.self&&(await db.prepare(`SELECT CASE WHEN ${credential.sql} THEN 1 ELSE 0 END allowed`).bind(...credential.args).first<{allowed:number}>())?.allowed);
  const assessment=await db.prepare("SELECT * FROM wellness_records WHERE client_id=? AND kind='assessment'").bind(clientId).first<Row>();
  const shared=!!assessment&&JSON.parse(assessment.content_json).shareTeam===true;
  const result=await db.prepare(`SELECT * FROM wellness_records WHERE client_id=? ${a.nutrition?'':"AND kind IN ('rehab','return','readiness','episode')"} ORDER BY day DESC,updated_at DESC LIMIT 730`).bind(clientId).all<Row>();
  let summary:WellnessBundle['summary']=null;
  if(a.self||a.nutrition||shared){
   const last=await db.prepare("SELECT * FROM wellness_records WHERE client_id=? AND kind='daily' ORDER BY day DESC LIMIT 1").bind(clientId).first<Row>();
   const plan=await db.prepare("SELECT updated_at FROM wellness_records WHERE client_id=? AND kind='plan'").bind(clientId).first<{updated_at:string}>();
   if(last){const d=JSON.parse(last.content_json);const weightRow=await db.prepare("SELECT content_json FROM wellness_records WHERE client_id=? AND kind='daily' AND json_extract(content_json,'$.weight') IS NOT NULL ORDER BY day DESC LIMIT 1").bind(clientId).first<{content_json:string}>();summary={weight:weightRow?JSON.parse(weightRow.content_json).weight:null,adherence:d.adherence??null,lastDay:last.day,planUpdatedAt:plan?.updated_at??null};}
  }
  // Keep singleton plans visible even after a long tracking history.
  const singles=await db.prepare(`SELECT * FROM wellness_records WHERE client_id=? AND kind IN (${a.nutrition?"'assessment','plan','return','episode'":"'return','episode'"})`).bind(clientId).all<Row>();
  // Retain each episode's latest explicit measurement even beyond the general log limit.
  const latest=await db.prepare(`SELECT * FROM (
   SELECT w.*, ROW_NUMBER() OVER (
    PARTITION BY json_extract(w.content_json,'$.episodeId')
    ORDER BY w.day DESC,w.updated_at DESC,w.id DESC
   ) AS position FROM wellness_records w
   JOIN wellness_records e ON e.id=json_extract(w.content_json,'$.episodeId')
    AND e.client_id=w.client_id AND e.kind='episode'
    AND json_extract(e.content_json,'$.region')=json_extract(w.content_json,'$.region')
    AND json_extract(e.content_json,'$.side')=json_extract(w.content_json,'$.side')
   WHERE w.client_id=? AND w.kind='rehab'
  ) WHERE position=1`).bind(clientId).all<Row>();
  const unique=new Map([...result.results,...singles.results,...latest.results].map(r=>[r.id,rowRecord(r)]));
  const revisions=await db.prepare("SELECT id,'return' AS kind,'current' AS slot,day,content_json,version,author_name,updated_at,baseline FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY record_id ORDER BY version DESC) AS position FROM return_plan_revisions WHERE client_id=?) WHERE position<=50 ORDER BY version DESC").bind(clientId).all<Row&{baseline:number}>();
  const totals=await db.prepare("SELECT COALESCE(json_extract(content_json,'$.episodeId'),'current') AS slot,COUNT(*) AS total FROM return_plan_revisions WHERE client_id=? GROUP BY slot").bind(clientId).all<{slot:string;total:number}>();
  const count=await db.prepare('SELECT COUNT(*) AS total FROM return_plan_revisions WHERE client_id=?').bind(clientId).first<{total:number}>();
  if(!a.self){
   const options={clientId,email:a.staff!.email,role:a.staff!.role};
   // Validate captured capabilities and optional team sharing together after
   // the last data read. Discard the whole response when access was withdrawn.
   const guard=combineCareGuards(careConnectionGuard(options,config),
    ...(a.medical?[careConnectionGuard({...options,grant:'medical_access'},config)]:[]),
    ...(a.nutrition?[careConnectionGuard({...options,grant:'nutrition_access'},config)]:[]),...(nutritionVerified?[credential]:[]),
    ...(shared&&!a.nutrition?[{sql:"EXISTS(SELECT 1 FROM wellness_records WHERE client_id=? AND kind='assessment' AND json_extract(content_json,'$.shareTeam')=1)",args:[clientId]}]:[]));
   const allowed=await db.prepare(`SELECT CASE WHEN ${guard.sql} THEN 1 ELSE 0 END AS allowed`).bind(...guard.args).first<{allowed:number}>();
   if(!allowed?.allowed)throw new TrainingError('הרשאות התיק או השיתוף השתנו בזמן הטעינה. רעננו לפני צפייה.',403);
  }
  return {returnHistoryTotals:Object.fromEntries(totals.results.map(r=>[r.slot,r.total])),records:[...unique.values()],returnHistory:revisions.results.map(r=>({...rowRecord(r),baseline:!!r.baseline})),returnHistoryTotal:count?.total??0,self:a.self,canNutrition:a.nutrition,canPlan:!a.self&&a.nutrition&&nutritionVerified,canReturn:!a.self&&a.medical,today:todayIsrael(),summary,nutritionShared:shared};
 }
 return {bundle,async save(user:StaffIdentity,clientId:string,payload:unknown){
  const a=await care.authorize(user,clientId),p=inputRecord(payload),kind=textField(p.kind,'סוג רשומה',30,1) as WellnessKind;
  requireWellnessWriteAccess(a,kind);
  if(['plan','weeklyReview'].includes(kind))await requireNutritionCredential(db,user.email);
  await requireHealthConsent(db,clientId);
  const data=parseWellness(kind,p.data),day=dayField(p.day),version=integerField(p.version,'גרסה',0,1000000);
  if(kind==='plan'&&data.mode==='macros'&&['calories','protein','carbs','fat'].some(k=>data[k]===null))throw new TrainingError('בתוכנית לפי ערכים יש למלא קלוריות וחלבון, פחמימות ושומן.');
  const id=validId(p.id);
  // Older clients editing the existing return plan must not erase milestones.
  if(kind==='return'&&version>0&&inputRecord(p.data).milestones===undefined){
   const previous=await db.prepare("SELECT content_json FROM wellness_records WHERE id=? AND client_id=? AND kind='return'").bind(id,clientId).first<{content_json:string}>();
   if(previous)data.milestones=JSON.parse(previous.content_json).milestones??'[]';
  }
  if(kind==='return'){
   const previous=await db.prepare("SELECT content_json FROM wellness_records WHERE id=? AND client_id=? AND kind='return'").bind(id,clientId).first<{content_json:string}>();
   const old=previous?JSON.parse(previous.content_json):null;
   if(old&&inputRecord(p.data).episodeId===undefined&&old.episodeId)data.episodeId=old.episodeId;
   if(old&&(old.episodeId??'')!==(data.episodeId??''))throw new TrainingError('לא ניתן להעביר מסלול קיים לפציעה אחרת.',409);
   if(data.episodeId){const episode=await db.prepare("SELECT content_json FROM wellness_records WHERE id=? AND client_id=? AND kind='episode'").bind(data.episodeId,clientId).first<{content_json:string}>();if(!episode||JSON.parse(episode.content_json).status!=='active')throw new TrainingError('בחרו פציעה פעילה בתיק האישי.',409);}
  }
  if(kind==='rehab'){
   const previous=await db.prepare("SELECT content_json FROM wellness_records WHERE id=? AND client_id=? AND kind='rehab'").bind(id,clientId).first<{content_json:string}>();
   const old=previous?JSON.parse(previous.content_json):null;
   if(old&&inputRecord(p.data).episodeId===undefined&&old.episodeId)data.episodeId=old.episodeId;
   if(old?.episodeId&&old.episodeId!==data.episodeId)throw new TrainingError('מדידה מקושרת אינה מועברת לפציעה אחרת.',409);
   if(data.episodeId){
    const episode=await db.prepare("SELECT content_json FROM wellness_records WHERE id=? AND client_id=? AND kind='episode'").bind(data.episodeId,clientId).first<{content_json:string}>();
    const e=episode?JSON.parse(episode.content_json):null;
    if(!e||e.status!=='active')throw new TrainingError('בחרו פציעה פעילה בתיק האישי.',409);
    if(e.region!==data.region||e.side!==data.side)throw new TrainingError('אזור וצד המדידה צריכים להתאים לפציעה שנבחרה.',409);
   }
  }
  if(kind==='episode'&&version>0){
   const previous=await db.prepare("SELECT content_json FROM wellness_records WHERE id=? AND client_id=? AND kind='episode'").bind(id,clientId).first<{content_json:string}>();
   const old=previous?JSON.parse(previous.content_json):null;
   if(old&&(old.region!==data.region||old.side!==data.side)&&await db.prepare("SELECT id FROM wellness_records WHERE client_id=? AND kind='rehab' AND json_extract(content_json,'$.episodeId')=? LIMIT 1").bind(clientId,id).first())throw new TrainingError('לפציעה זו קיימות מדידות מקושרות. אזור וצד נשמרים; לפציעה אחרת יש לפתוח מעקב נפרד.',409);
  }
  const slot=kind==='return'?String(data.episodeId??'current'):['assessment','plan'].includes(kind)?'current':['weekly','weeklyReview'].includes(kind)?day:['rehab','episode'].includes(kind)?id:day;
  if(['weekly','weeklyReview'].includes(kind)&&new Date(day+'T12:00:00Z').getUTCDay()!==0)throw new TrainingError('דיווח שבועי נשמר לפי תאריך יום ראשון של השבוע.');
  if(kind==='weeklyReview'&&!await db.prepare("SELECT id FROM wellness_records WHERE client_id=? AND kind='weekly' AND slot=?").bind(clientId,slot).first())throw new TrainingError('לא נמצא דיווח שבועי למענה.',404);
  const author=a.staff?.name??'דיווח אישי',stamp=new Date().toISOString(),access=wellnessWriteGuard(user,clientId,kind,config),consent=healthConsentGuard(clientId),guard={sql:`${access.sql} AND ${consent.sql}`,args:[...access.args,...consent.args]};
  const saved=version===0?await db.prepare(`INSERT INTO wellness_records(id,client_id,kind,slot,day,content_json,author_name,updated_at) SELECT ?,?,?,?,?,?,?,? WHERE ${guard.sql} AND (?='' OR EXISTS(SELECT 1 FROM wellness_records WHERE id=? AND client_id=? AND kind='episode' AND json_extract(content_json,'$.status')='active' AND (?<>'rehab' OR (json_extract(content_json,'$.region')=? AND json_extract(content_json,'$.side')=?)))) ON CONFLICT DO NOTHING RETURNING id`).bind(id,clientId,kind,slot,day,JSON.stringify(data),author,stamp,...guard.args,['return','rehab'].includes(kind)?String(data.episodeId??''):'',String(data.episodeId??''),clientId,kind,String(data.region??''),String(data.side??'')).first():await db.prepare(`UPDATE wellness_records SET content_json=?,day=?,author_name=?,updated_at=?,version=version+1 WHERE id=? AND client_id=? AND kind=? AND slot=? AND version=? AND ${guard.sql} AND (?<>'episode' OR NOT EXISTS(SELECT 1 FROM wellness_records WHERE client_id=? AND kind='rehab' AND json_extract(content_json,'$.episodeId')=? AND (json_extract(content_json,'$.region')<>? OR json_extract(content_json,'$.side')<>?))) AND (?='' OR EXISTS(SELECT 1 FROM wellness_records WHERE id=? AND client_id=? AND kind='episode' AND json_extract(content_json,'$.status')='active' AND (?<>'rehab' OR (json_extract(content_json,'$.region')=? AND json_extract(content_json,'$.side')=?)))) RETURNING id`).bind(JSON.stringify(data),day,author,stamp,id,clientId,kind,slot,version,...guard.args,kind,clientId,id,String(data.region??''),String(data.side??''),['return','rehab'].includes(kind)?String(data.episodeId??''):'',String(data.episodeId??''),clientId,kind,String(data.region??''),String(data.side??'')).first();
  if(!saved){if(['plan','weeklyReview'].includes(kind))await requireNutritionCredential(db,user.email);requireWellnessWriteAccess(await care.authorize(user,clientId),kind);await requireHealthConsent(db,clientId);const previous=await db.prepare('SELECT content_json FROM wellness_records WHERE id=? AND client_id=? AND kind=? AND slot=?').bind(id,clientId,kind,slot).first<{content_json:string}>();if(!previous||previous.content_json!==JSON.stringify(data))throw new TrainingError('הרשומה עודכנה או שכבר קיים דיווח לתאריך זה. רעננו ובחרו את הדיווח לעריכה.',409);}
  return bundle(user,clientId);
 }};
}
