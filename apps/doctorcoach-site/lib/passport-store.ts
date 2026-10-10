import {careStore,type CareConfig} from './care-store.ts';
import {careConnectionGuard,combineCareGuards} from './care-write-guard.ts';
import {healthConsentGuard,requireHealthConsent} from './consent-server.ts';
import {privateDocumentStore} from './private-document-store.ts';
import {inputRecord,textField,integerField} from './care.ts';
import {TrainingError} from './training.ts';
import type {StaffIdentity} from './staff.ts';
import type {Answers} from './intake.ts';
export const passportFields=['allergies'] as const;
export type PassportDetails=Record<typeof passportFields[number],string>;
export function passportStore(db:D1Database,config:CareConfig={}){
 const care=careStore(db,config),documents=privateDocumentStore(db,config);
 return {
 async get(user:StaffIdentity,clientId:string){
  const guard=await documents.permission(user,clientId,'medical');await documents.requireGuard(guard);
  const [profile,intake,details,notes,reviews,episodes,files]=await Promise.all([
   db.prepare('SELECT name FROM care_profiles WHERE user_id=?').bind(clientId).first<{name:string}>(),
   db.prepare('SELECT answers_json,updated_at FROM user_intakes WHERE user_id=?').bind(clientId).first<{answers_json:string;updated_at:string}>(),
   db.prepare('SELECT content_json,version,updated_at FROM passport_details WHERE client_id=?').bind(clientId).first<{content_json:string;version:number;updated_at:string}>(),
   db.prepare("SELECT id,author_name AS authorName,content,created_at AS createdAt FROM care_notes WHERE client_id=? AND kind='medical' AND shared=1 ORDER BY created_at DESC LIMIT 100").bind(clientId).all<{id:string;authorName:string;content:string;createdAt:string}>(),
   db.prepare("SELECT id,response,reviewer,updated_at AS updatedAt,state FROM medical_reviews WHERE client_id=? ORDER BY updated_at DESC LIMIT 50").bind(clientId).all<{id:string;response:string;reviewer:string;updatedAt:string;state:string}>(),
   db.prepare("SELECT id,content_json,updated_at FROM wellness_records WHERE client_id=? AND kind='episode' ORDER BY updated_at DESC").bind(clientId).all<{id:string;content_json:string;updated_at:string}>(),documents.list(user,clientId)
  ]);
  await documents.requireGuard(guard);await db.prepare('INSERT INTO audit_events(id,actor_id,subject_id,action,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),user.userId,clientId,'passport.read',new Date().toISOString()).run();await documents.requireGuard(guard);
  return {clientId,name:profile?.name??'',self:user.userId===clientId,answers:intake?JSON.parse(intake.answers_json) as Answers:{},answersUpdatedAt:intake?.updated_at??null,details:details?JSON.parse(details.content_json) as PassportDetails:null,version:details?.version??0,updatedAt:details?.updated_at??null,notes:notes.results,reviews:reviews.results,episodes:episodes.results.map(e=>({id:e.id,data:JSON.parse(e.content_json) as Record<string,string>,updatedAt:e.updated_at})),documents:files};
 },
 async save(user:StaffIdentity,payload:unknown){const p=inputRecord(payload),version=integerField(p.version,'גרסה',0,1000000),raw=inputRecord(p.details);const data=Object.fromEntries(passportFields.map(key=>[key,textField(raw[key]??'',key,2000)]));await requireHealthConsent(db,user.userId);const guard=healthConsentGuard(user.userId),at=new Date().toISOString(),json=JSON.stringify(data);
  const mutation=version===0?db.prepare(`INSERT INTO passport_details(client_id,content_json,updated_at) SELECT ?,?,? WHERE ${guard.sql} ON CONFLICT DO NOTHING`).bind(user.userId,json,at,...guard.args):db.prepare(`UPDATE passport_details SET content_json=?,version=version+1,updated_at=? WHERE client_id=? AND version=? AND ${guard.sql}`).bind(json,at,user.userId,version,...guard.args);
  const gate="EXISTS(SELECT 1 FROM passport_details WHERE client_id=? AND version=? AND content_json=? AND updated_at=?)";
  await db.batch([mutation,db.prepare(`INSERT INTO audit_events(id,actor_id,subject_id,action,created_at) SELECT ?,?,?,?,? WHERE ${gate}`).bind(crypto.randomUUID(),user.userId,user.userId,'passport.update',at,user.userId,version+1,json,at)]);
  const current=await db.prepare('SELECT version,content_json,updated_at FROM passport_details WHERE client_id=?').bind(user.userId).first<{version:number;content_json:string;updated_at:string}>();if(current?.version!==version+1||current.content_json!==json||current.updated_at!==at){await requireHealthConsent(db,user.userId);throw new TrainingError('התיק עודכן בחלון אחר. רעננו לפני שמירה.',409);}return {ok:true};
 }
 };
}
export type MedicalPassport=Awaited<ReturnType<ReturnType<typeof passportStore>['get']>>;
