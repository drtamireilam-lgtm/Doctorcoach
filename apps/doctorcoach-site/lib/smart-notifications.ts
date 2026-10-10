import type {NotificationCategory} from './notification-preferences.ts';
import {currentWeek} from './care.ts';
import {shiftDay} from './weekly-progress.ts';
import {israelDay,followupDay} from './workout-context.ts';
import {todayIsrael} from './wellness.ts';
export type SmartNotification={id:string;category:NotificationCategory;section:string;text:string};
export async function smartNotifications(db:D1Database,userId:string):Promise<SmartNotification[]>{
 const items:SmartNotification[]=[],week=currentWeek(),previous=shiftDay(week,-7),today=todayIsrael();
 const active=await db.prepare("SELECT id FROM training_sessions WHERE owner_id=? AND status='active'").bind(userId).first<{id:string}>();
 if(active)items.push({id:'training:'+active.id,category:'training',section:'workout',text:'יש אימון פתוח. השלימו את הדיווחים או סיימו את האימון.'});
 const followup=await db.prepare("SELECT id,finished_at FROM training_sessions WHERE owner_id=? AND status='completed' AND followup_json IS NULL AND finished_at>=? ORDER BY finished_at DESC LIMIT 10").bind(userId,shiftDay(today,-2)+'T00:00:00Z').all<{id:string;finished_at:string}>();
 for(const s of followup.results)if(followupDay(s.finished_at)===today)items.push({id:'followup:'+s.id,category:'rehab',section:'history',text:'דיווח היום שאחרי זמין בהיסטוריית האימונים.'});
 const summary=await db.prepare("SELECT finished_at FROM training_sessions WHERE owner_id=? AND status='completed' AND finished_at>=? AND finished_at<?").bind(userId,shiftDay(previous,-1)+'T00:00:00Z',shiftDay(week,1)+'T00:00:00Z').all<{finished_at:string}>();
 if(summary.results.some(s=>israelDay(s.finished_at)>=previous&&israelDay(s.finished_at)<week))items.push({id:'weekly:'+previous,category:'progress',section:'history',text:'סיכום התקדמות שבועי זמין לצפייה.'});
 const goal=await db.prepare('SELECT planned_sessions AS n FROM weekly_goals WHERE client_id=? AND week=?').bind(userId,week).first<{n:number}>();
 if(goal&&goal.n>0){const count=await db.prepare("SELECT finished_at FROM training_sessions WHERE owner_id=? AND status='completed' AND finished_at>=?").bind(userId,shiftDay(week,-1)+'T00:00:00Z').all<{finished_at:string}>();if(count.results.filter(s=>israelDay(s.finished_at)>=week&&israelDay(s.finished_at)<=today).length>=goal.n)items.push({id:'goal:'+week,category:'progress',section:'history',text:'הגעתם למספר האימונים שתכננתם לשבוע זה.'});}
 const documents=await db.prepare("SELECT id FROM private_documents WHERE client_id=? AND uploader_id<>? AND status='ready' AND purpose='medical' AND created_at>=? ORDER BY created_at DESC LIMIT 10").bind(userId,userId,shiftDay(today,-7)).all<{id:string}>();
 for(const d of documents.results)items.push({id:'document:'+d.id,category:'team',section:'care',text:'מסמך חדש זמין בתיק שלי.'});
 const rom=await db.prepare("SELECT MAX(day) AS day FROM wellness_records WHERE client_id=? AND kind='rehab' AND json_extract(content_json,'$.rom') IS NOT NULL").bind(userId).first<{day:string|null}>();
 const episode=await db.prepare("SELECT id FROM wellness_records WHERE client_id=? AND kind='episode' AND json_extract(content_json,'$.status')='active' LIMIT 1").bind(userId).first<{id:string}>();
 if(episode&&rom?.day&&rom.day<=shiftDay(today,-7))items.push({id:'rom:'+episode.id+':'+week,category:'rehab',section:'recovery',text:'אם הונחיתם למדוד טווח תנועה, אפשר לעדכן את המעקב.'});
 return items;
}
