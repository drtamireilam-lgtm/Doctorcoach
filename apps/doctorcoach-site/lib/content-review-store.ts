import matrix from './prepared/injury-matrix.json' with {type:'json'};
import {exercises} from './content.ts';
import {exerciseAliases} from './rehab-exercises.ts';
import {careStore} from './care-store.ts';
import {staffRoleGuard} from './care-write-guard.ts';
import type {CareConfig} from './care-store.ts';
import type {StaffIdentity} from './staff.ts';
import {inputRecord,textField,integerField} from './care.ts';
import {TrainingError} from './training.ts';
export type ContentReview={injuryId:string;contentHash:string;state:string;notes:string;reviewerName:string;version:number;updatedAt:string};
const columns='injury_id AS injuryId,content_hash AS contentHash,state,notes,reviewer_name AS reviewerName,version,updated_at AS updatedAt';
const keys=['train_around_recommended','train_around_modify','rehab','avoid_if_provocative'] as const;
export async function reviewCatalog(){return Promise.all(matrix.map(async mapping=>{const ids=[...new Set(keys.flatMap(k=>mapping[k]))];const details=ids.map(id=>({sourceId:id,exercise:exercises.find(e=>e.id===(exerciseAliases[id]??id))??null}));const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({mapping,details})));return {mapping,details,contentHash:Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('')};}));}
export function contentReviewStore(db:D1Database,config:CareConfig={}){
 async function clinician(user:StaffIdentity){const s=await careStore(db,config).requireStaff(user);if(s.role!=='clinician')throw new TrainingError('אישור תוכן קליני זמין לרופא בלבד.',403);return s;}
 return {
 async list(user:StaffIdentity){
  const staff=await clinician(user),guard=staffRoleGuard(staff.email,'clinician',config);
  const records=(await db.prepare(`SELECT ${columns} FROM content_reviews WHERE ${guard.sql}`).bind(...guard.args).all<ContentReview>()).results;
  const items=(await reviewCatalog()).map(item=>{const review=records.find(r=>r.injuryId===item.mapping.injury_id)??null;return {...item,review,state:review?(review.contentHash===item.contentHash?review.state:'changed'):'pending'};});
  const allowed=await db.prepare(`SELECT CASE WHEN ${guard.sql} THEN 1 ELSE 0 END AS allowed`).bind(...guard.args).first<{allowed:number}>();
  if(!allowed?.allowed)throw new TrainingError('הרשאת אישור התוכן השתנתה בזמן הטעינה. רעננו לפני צפייה.',403);
  return {items};
 },
 async save(user:StaffIdentity,payload:unknown){const s=await clinician(user);const p=inputRecord(payload);const id=textField(p.injuryId,'מיפוי',100,1);const item=(await reviewCatalog()).find(x=>x.mapping.injury_id===id);if(!item)throw new TrainingError('המיפוי לא נמצא.',404);if(p.contentHash!==item.contentHash)throw new TrainingError('התוכן השתנה. רעננו וקראו את הגרסה המעודכנת.',409);if(!['approved','changes_requested'].includes(String(p.state)))throw new TrainingError('מצב בדיקה לא תקין.');if(p.state==='approved'&&(p.confirmed!==true||item.details.some(d=>!d.exercise)))throw new TrainingError('יש לבדוק את כל התרגילים ולאשר את הבדיקה.');const version=integerField(p.version,'גרסה',0,1000000);const notes=textField(p.notes,'הערות הבדיקה',4000,5);const at=new Date().toISOString();
 const guard=staffRoleGuard(s.email,'clinician',config);
 const row=version===0
 ?await db.prepare(`INSERT INTO content_reviews(injury_id,content_hash,state,notes,reviewer_id,reviewer_name,version,updated_at) SELECT ?,?,?,?,?,?,1,? WHERE ${guard.sql} ON CONFLICT(injury_id) DO NOTHING RETURNING ${columns}`).bind(id,item.contentHash,p.state,notes,user.userId,s.name,at,...guard.args).first<ContentReview>()
 :await db.prepare(`UPDATE content_reviews SET content_hash=?,state=?,notes=?,reviewer_id=?,reviewer_name=?,version=version+1,updated_at=? WHERE injury_id=? AND version=? AND ${guard.sql} RETURNING ${columns}`).bind(item.contentHash,p.state,notes,user.userId,s.name,at,id,version,...guard.args).first<ContentReview>();
 if(row)return row;
 const allowed=await db.prepare(`SELECT CASE WHEN ${guard.sql} THEN 1 ELSE 0 END allowed`).bind(...guard.args).first<{allowed:number}>();
 if(!allowed?.allowed)throw new TrainingError('הרשאת אישור התוכן השתנתה. רעננו לפני שמירה.',403);
 throw new TrainingError('הבדיקה עודכנה במקביל. רעננו לפני שמירה.',409);
 }
 };
}
