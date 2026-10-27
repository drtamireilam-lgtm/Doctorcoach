import {TrainingError} from './training.ts';
import {validId} from './care.ts';
import {isStaff,type StaffIdentity,isAdmin} from './staff.ts';
const prefix='privacy-deletion-journal/v1/';
export type DeletionReceipt={version:1;userId:string;requestId:string;reviewerId:string;startedAt:string};
type JournalBucket={
 get(key:string):Promise<{text():Promise<string>}|null>;
 put(key:string,value:string,options?:{httpMetadata:{contentType:string;cacheControl:string}}):Promise<unknown>;
 list(options:{prefix:string;cursor?:string}):Promise<{objects:{key:string}[];truncated:boolean;cursor?:string}>;
};
function receipt(value:unknown):DeletionReceipt {
 const p=value as DeletionReceipt;
 if(!p||p.version!==1||typeof p.userId!=='string'||!p.userId||p.userId.length>256||typeof p.reviewerId!=='string'||!p.reviewerId||p.reviewerId.length>256||typeof p.startedAt!=='string'||!Number.isFinite(Date.parse(p.startedAt)))throw new TrainingError('Invalid deletion journal.',503);
 validId(p.requestId);
 return {version:1,userId:p.userId,requestId:p.requestId,reviewerId:p.reviewerId,startedAt:p.startedAt};
}
async function key(userId:string){
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(userId));
 return prefix+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('')+'.json';
}
export function deletionJournal(bucket:JournalBucket|null){
 function storage(){if(!bucket)throw new TrainingError('Deletion journal unavailable.',503);return bucket;}
 async function readKey(k:string){
  const object=await storage().get(k);if(!object)return null;
  const raw=await object.text();if(raw.length>2048)throw new TrainingError('Invalid deletion journal.',503);
  let value:unknown;try{value=JSON.parse(raw);}catch{throw new TrainingError('Invalid deletion journal.',503);}
  const p=receipt(value);if(await key(p.userId)!==k)throw new TrainingError('Invalid deletion journal key.',503);return p;
 }
 return {
  async read(userId:string){return readKey(await key(userId));},
  async record(value:DeletionReceipt){
   const p=receipt(value),k=await key(p.userId),old=await readKey(k);
   if(old){if(old.requestId!==p.requestId||old.reviewerId!==p.reviewerId||old.startedAt!==p.startedAt)throw new TrainingError('Conflicting deletion journal.',409);return;}
   await storage().put(k,JSON.stringify(p),{httpMetadata:{contentType:'application/json',cacheControl:'private, no-store'}});
   const saved=await readKey(k);if(!saved||JSON.stringify(saved)!==JSON.stringify(p))throw new TrainingError('Deletion journal verification failed.',503);
  },
  async page(cursor?:string){
   const page=await storage().list({prefix,...(cursor?{cursor}:{})});
   const receipts:DeletionReceipt[]=[];
   for(const object of page.objects){if(!object.key.startsWith(prefix))throw new TrainingError('Invalid journal listing.',503);const p=await readKey(object.key);if(!p)throw new TrainingError('Incomplete journal listing.',503);receipts.push(p);}
   if(page.truncated&&!page.cursor)throw new TrainingError('Incomplete journal listing.',503);
   return {receipts,cursor:page.truncated?page.cursor:null};
  },
 };
}
export type DeletionJournal=ReturnType<typeof deletionJournal>;
/** Rebuild the write/access barrier only. Never delete clinical data automatically. */
export async function restoreDeletionBarrier(db:D1Database,p:DeletionReceipt,reopen=false){
 const r=receipt(p);
 const old=await db.prepare('SELECT request_id AS requestId FROM account_deletions WHERE user_id=?').bind(r.userId).first<{requestId:string}>();
 if(old&&old.requestId!==r.requestId)throw new TrainingError('Conflicting restored deletion.',409);
 await db.prepare("INSERT INTO account_deletions(user_id,request_id,state,reviewer_id,started_at) VALUES(?,?,'deleting',?,?) ON CONFLICT(user_id) DO NOTHING").bind(r.userId,r.requestId,r.reviewerId,r.startedAt).run();
 if(reopen)await db.prepare("UPDATE account_deletions SET state='deleting',completed_at=NULL WHERE user_id=? AND request_id=?").bind(r.userId,r.requestId).run();
}
export async function reconcileDeletionPage(db:D1Database,journal:DeletionJournal,actor:StaffIdentity,adminEmails:string|undefined,payload:unknown){
 if(!isAdmin(actor,adminEmails))throw new TrainingError('Administrator required.',403);
 const p=payload as {confirmed?:boolean;cursor?:unknown};
 if(p?.confirmed!==true||p.cursor!==undefined&&(typeof p.cursor!=='string'||p.cursor.length>2048))throw new TrainingError('Confirm recovery reconciliation.',400);
 const page=await journal.page(p.cursor as string|undefined);
 for(const r of page.receipts)await restoreDeletionBarrier(db,r,true);
 return {locked:page.receipts.length,nextCursor:page.cursor,complete:page.cursor===null};
}
