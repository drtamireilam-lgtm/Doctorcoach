import type {NotificationCategory} from './notification-preferences.ts';
import {currentWeek} from './care.ts';
import {shiftDay} from './weekly-progress.ts';
import {israelDay,followupDay} from './workout-context.ts';
export type SmartNotification={id:string;category:NotificationCategory;section:string;text:string};
export async function smartNotifications(db:D1Database,userId:string,now=new Date()):Promise<SmartNotification[]>{
 const items:SmartNotification[]=[],week=currentWeek(now),previous=shiftDay(week,-7),today=israelDay(now.toISOString());
 const active=await db.prepare("SELECT id FROM training_sessions WHERE owner_id=? AND status='active'").bind(userId).first<{id:string}>();
 if(active)items.push({id:'training:'+active.id,category:'training',section:'workout',text:'יש אימון פתוח. השלימו את הדיווחים או סיימו את האימון.'});
 const followup=await db.prepare("SELECT id,finished_at FROM training_sessions WHERE owner_id=? AND status='completed' AND followup_json IS NULL AND finished_at>=? ORDER BY finished_at DESC LIMIT 10").bind(userId,shiftDay(today,-2)+'T00:00:00Z').all<{id:string;finished_at:string}>();
 for(const s of followup.results)if(followupDay(s.finished_at)===today)items.push({id:'followup:'+s.id,category:'rehab',section:'history',text:'דיווח היום שאחרי זמין בהיסטוריית האימונים.'});
 const summary=await db.prepare("SELECT finished_at FROM training_sessions WHERE owner_id=? AND status='completed' AND finished_at>=? AND finished_at<?").bind(userId,shiftDay(previous,-1)+'T00:00:00Z',shiftDay(week,1)+'T00:00:00Z').all<{finished_at:string}>();
 const tracked=await db.prepare("SELECT id FROM wellness_records WHERE client_id=? AND kind IN ('rehab','readiness','daily') AND day>=? AND day<? LIMIT 1").bind(userId,previous,week).first();
 if(tracked||summary.results.some(s=>israelDay(s.finished_at)>=previous&&israelDay(s.finished_at)<week))items.push({id:'weekly:'+previous,category:'progress',section:'history',text:'סיכום התקדמות שבועי זמין לצפייה.'});
 const goal=await db.prepare('SELECT planned_sessions AS n FROM weekly_goals WHERE client_id=? AND week=?').bind(userId,week).first<{n:number}>();
 if(goal&&goal.n>0){const count=await db.prepare("SELECT finished_at FROM training_sessions WHERE owner_id=? AND status='completed' AND finished_at>=?").bind(userId,shiftDay(week,-1)+'T00:00:00Z').all<{finished_at:string}>();const completed=count.results.filter(s=>israelDay(s.finished_at)>=week&&israelDay(s.finished_at)<=today).length;if(completed>=goal.n)items.push({id:'goal:'+week,category:'progress',section:'history',text:'הגעתם למספר האימונים שתכננתם לשבוע זה.'});else if(today>=shiftDay(week,4))items.push({id:'goal-pending:'+week,category:'training',section:'history',text:'השבוע טרם הגעתם למספר האימונים שתכננתם. אפשר לבדוק את התכנון בהתקדמות.'});}
 const documents=await db.prepare("SELECT id FROM private_documents WHERE client_id=? AND uploader_id<>? AND status='ready' AND purpose='medical' AND created_at>=? ORDER BY created_at DESC LIMIT 10").bind(userId,userId,shiftDay(today,-7)).all<{id:string}>();
 for(const d of documents.results)items.push({id:'document:'+d.id,category:'team',section:'care',text:'מסמך חדש זמין בתיק שלי.'});
 // Measure each explicitly linked episode separately. A recent measurement
 // for another injury must not silence this episode's reminder.
 const episodes=await db.prepare("SELECT e.id,(SELECT MAX(r.day) FROM wellness_records r WHERE r.client_id=e.client_id AND r.kind='rehab' AND json_extract(r.content_json,'$.episodeId')=e.id AND json_extract(r.content_json,'$.rom') IS NOT NULL AND json_extract(r.content_json,'$.region')=json_extract(e.content_json,'$.region') AND json_extract(r.content_json,'$.side')=json_extract(e.content_json,'$.side')) AS day FROM wellness_records e WHERE e.client_id=? AND e.kind='episode' AND json_extract(e.content_json,'$.status')='active' ORDER BY e.id").bind(userId).all<{id:string;day:string|null}>();
 // Keep the bell compact and avoid exposing injury names in notification text.
 if(episodes.results.some(e=>e.day&&e.day<=shiftDay(today,-7)))items.push({id:'rom:'+week,category:'rehab',section:'recovery',text:'אם הונחיתם למדוד טווח תנועה, אפשר לעדכן את המעקב.'});
 return items;
}
