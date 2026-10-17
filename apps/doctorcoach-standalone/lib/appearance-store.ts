import {TrainingError,isRecord} from './training.ts';
import {isAppearance,type Appearance} from './appearance.ts';
export function appearanceStore(db:D1Database){return {
 async get(userId:string):Promise<{appearance:Appearance|null;version:number}>{
  const row=await db.prepare('SELECT mode,palette,version FROM appearance_preferences WHERE user_id=?').bind(userId).first<{mode:string;palette:string;version:number}>();
  return {appearance:row&&isAppearance(row)?{mode:row.mode,palette:row.palette}:null,version:row?.version??0};
 },
 async save(userId:string,payload:unknown){
  if(!isRecord(payload)||!isAppearance(payload.appearance)||!Number.isSafeInteger(payload.version)||Number(payload.version)<0||Number(payload.version)>1000000)throw new TrainingError('העדפת התצוגה אינה תקינה.');
  const {mode,palette}=payload.appearance,at=new Date().toISOString();
  const row=payload.version===0?await db.prepare('INSERT INTO appearance_preferences(user_id,mode,palette,updated_at) VALUES(?,?,?,?) ON CONFLICT DO NOTHING RETURNING user_id').bind(userId,mode,palette,at).first():await db.prepare('UPDATE appearance_preferences SET mode=?,palette=?,version=version+1,updated_at=? WHERE user_id=? AND version=? RETURNING user_id').bind(mode,palette,at,userId,payload.version).first();
  if(!row)throw new TrainingError('התצוגה השתנתה בחלון אחר. טענו את ההעדפה השמורה ונסו שוב.',409);
  return this.get(userId);
 }
};}
