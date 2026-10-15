import {isRecord,TrainingError} from './training.ts';
import type {WorkoutPreference} from './workout-choice.ts';
export function workoutPreferencesStore(db:D1Database){return {
 async get(userId:string):Promise<WorkoutPreference>{const row=await db.prepare('SELECT mode,version FROM workout_preferences WHERE user_id=?').bind(userId).first<WorkoutPreference>();return row?{mode:row.mode,version:row.version}:{mode:'fixed',version:0};},
 async save(userId:string,payload:unknown):Promise<WorkoutPreference>{
  if(!isRecord(payload)||!['fixed','flexible'].includes(String(payload.mode))||!Number.isInteger(payload.version)||Number(payload.version)<0||Number(payload.version)>1000000)throw new TrainingError('העדפת בחירת האימון אינה תקינה.');
  const at=new Date().toISOString();
  const row=payload.version===0?await db.prepare('INSERT INTO workout_preferences(user_id,mode,updated_at) VALUES(?,?,?) ON CONFLICT DO NOTHING RETURNING user_id').bind(userId,payload.mode,at).first():await db.prepare('UPDATE workout_preferences SET mode=?,version=version+1,updated_at=? WHERE user_id=? AND version=? RETURNING user_id').bind(payload.mode,at,userId,payload.version).first();
  if(!row)throw new TrainingError('ההעדפה השתנתה בחלון אחר. רעננו לפני שמירה.',409);
  return this.get(userId);
 }
};}
