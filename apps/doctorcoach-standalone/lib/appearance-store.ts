import {TrainingError,isRecord} from './training.ts';
import {isAppearance,canonicalAppearance,type Appearance} from './appearance.ts';
export function appearanceStore(db:D1Database){return {
 async get(userId:string):Promise<{appearance:Appearance|null;version:number}>{
  const row=await db.prepare('SELECT mode,palette,custom_json,version FROM appearance_preferences WHERE user_id=?').bind(userId).first<{mode:string;palette:string;custom_json:string|null;version:number}>();
  if(!row)return {appearance:null,version:0};
  let value:unknown={mode:row.mode,palette:row.palette};
  if(row.custom_json!==null){try{value={...value as object,custom:JSON.parse(row.custom_json)};}catch{throw new TrainingError('לא ניתן לקרוא את העדפת התצוגה השמורה.',500);}}
  if(!isAppearance(value))throw new TrainingError('העדפת התצוגה השמורה אינה תקינה.',500);
  return {appearance:canonicalAppearance(value),version:row.version};
 },
 async save(userId:string,payload:unknown){
  if(!isRecord(payload)||!isAppearance(payload.appearance)||!Number.isSafeInteger(payload.version)||Number(payload.version)<0||Number(payload.version)>1000000)throw new TrainingError('העדפת התצוגה אינה תקינה.');
  if(payload.expectedOwnerId!==undefined&&payload.expectedOwnerId!==userId)throw new TrainingError('החשבון השתנה. טענו מחדש את העיצוב לפני שמירה.',409);
  const a=canonicalAppearance(payload.appearance),at=new Date().toISOString(),custom=a.custom?JSON.stringify(a.custom):null;
  const row=payload.version===0?await db.prepare('INSERT INTO appearance_preferences(user_id,mode,palette,custom_json,updated_at) VALUES(?,?,?,?,?) ON CONFLICT DO NOTHING RETURNING user_id').bind(userId,a.mode,a.palette,custom,at).first():await db.prepare('UPDATE appearance_preferences SET mode=?,palette=?,custom_json=?,version=version+1,updated_at=? WHERE user_id=? AND version=? RETURNING user_id').bind(a.mode,a.palette,custom,at,userId,payload.version).first();
  if(!row)throw new TrainingError('התצוגה השתנתה בחלון אחר. טענו את ההעדפה השמורה ונסו שוב.',409);
  return this.get(userId);
 }
};}
