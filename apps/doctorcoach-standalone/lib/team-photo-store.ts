import {isStaff,type StaffIdentity,isAdmin} from './staff.ts';
import {TrainingError} from './training.ts';
import {photoMembers,type PhotoMember} from './team-profiles.ts';
import {readDocumentBody} from './private-documents.ts';
export const MAX_TEAM_PHOTO_BYTES=5*1024*1024;
export type TeamPhoto={memberId:PhotoMember;version:number;url:string|null};
type Row={member_id:PhotoMember;object_key:string;mime:string;bytes:number;version:number;updated_at:string};
type Bucket={put(key:string,bytes:Uint8Array,options:{httpMetadata:{contentType:string}}):Promise<unknown>;delete(key:string):Promise<unknown>};
export function photoMember(id:string):PhotoMember{if(!photoMembers.includes(id as PhotoMember))throw new TrainingError('פרופיל הצוות אינו זמין.',404);return id as PhotoMember;}
export async function readTeamPhotoBody(request:Request){
 const mime=request.headers.get('Content-Type')??'',raw=request.headers.get('X-File-Size')??'';
 const size=Number(raw);
 if(!/^\d+$/.test(raw)||!Number.isSafeInteger(size)||size<8||size>MAX_TEAM_PHOTO_BYTES||!['image/jpeg','image/png'].includes(mime))throw new TrainingError('בחרו תמונת JPEG או PNG עד 5MB.');
 return {mime,bytes:await readDocumentBody(request,size,mime)};
}
export function teamPhotoStore(db:D1Database,admins?:string){
 const requireAdmin=(user:StaffIdentity|null)=>{if(!isAdmin(user,admins))throw new TrainingError('ניהול תמונות הצוות זמין למנהלים בלבד.',user?403:401);};
 const row=(id:PhotoMember)=>db.prepare('SELECT * FROM team_photos WHERE member_id=?').bind(id).first<Row>();
 return {requireAdmin,
 async list(){return Promise.all(photoMembers.map(async memberId=>{const r=await row(memberId);return {memberId,version:r?.version??0,url:r?`/api/team-photos/${memberId}?v=${r.version}`:null} as TeamPhoto;}));},
 async readable(id:string){const member=photoMember(id),r=await row(member);if(!r||!r.object_key.startsWith(`team-photos/${member}/`))throw new TrainingError('לא הועלתה תמונה לפרופיל הזה.',404);return r;},
 async upload(user:StaffIdentity|null,bucket:Bucket,id:string,version:number,mime:string,bytes:Uint8Array,confirmed:boolean){
  requireAdmin(user);const member=photoMember(id);
  if(!confirmed)throw new TrainingError('יש לאשר פרסום תמונת פרופיל באתר.');
  if(!Number.isSafeInteger(version)||version<0||!['image/jpeg','image/png'].includes(mime)||bytes.length<8||bytes.length>MAX_TEAM_PHOTO_BYTES)throw new TrainingError('פרטי תמונת הפרופיל אינם תקינים.');
  const old=await row(member);if((old?.version??0)!==version)throw new TrainingError('התמונה עודכנה. רעננו לפני החלפה.',409);
  const key=`team-photos/${member}/${crypto.randomUUID()}`;
  try{
   await bucket.put(key,bytes,{httpMetadata:{contentType:mime}});
   requireAdmin(user);
   const saved=await db.prepare("INSERT INTO team_photos(member_id,object_key,mime,bytes,version,updated_at,updated_by) SELECT ?,?,?,?,?,?,? WHERE ?=0 OR EXISTS(SELECT 1 FROM team_photos WHERE member_id=? AND version=?) ON CONFLICT(member_id) DO UPDATE SET object_key=excluded.object_key,mime=excluded.mime,bytes=excluded.bytes,version=excluded.version,updated_at=excluded.updated_at,updated_by=excluded.updated_by WHERE team_photos.version=? RETURNING version").bind(member,key,mime,bytes.length,version+1,new Date().toISOString(),user!.userId,version,member,version,version).first<{version:number}>();
   if(!saved)throw new TrainingError('התמונה עודכנה. רעננו לפני החלפה.',409);
   return {memberId:member,version:saved.version,url:`/api/team-photos/${member}?v=${saved.version}`} as TeamPhoto;
  }catch(error){
   // A transport error may occur after a successful commit. Never delete a
   // referenced portrait; an uncertain orphan is safer than a broken profile.
   try{const current=await row(member);if(current?.object_key===key)return {memberId:member,version:current.version,url:`/api/team-photos/${member}?v=${current.version}`} as TeamPhoto;await bucket.delete(key).catch(()=>{});}catch{/* Preserve the object when the database outcome is unknown. */}
   throw error;
  }
 },
 };
}
