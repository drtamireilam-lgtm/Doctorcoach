import {isStaff} from './staff.ts';
import type {StaffIdentity} from './staff.ts';
import {inputRecord,integerField,textField,validId} from './care.ts';
import {TrainingError} from './training.ts';
export type FeedbackItem={id:string;context:string;category:string;content:string;state:string;response:string;version:number;createdAt:string};
export type Story={id:string;displayName:string;content:string;consent:boolean;published:boolean;version:number;updatedAt:string};
export function communityStore(db:D1Database,adminEmails?:string){
 const requireAdmin=(user:StaffIdentity)=>{if(!isStaff(user,adminEmails))throw new TrainingError('הפעולה זמינה למנהל הצוות.',403);};
 const feedbackSelect='SELECT id,context,category,content,state,response,version,created_at AS createdAt FROM trainee_feedback';
 const storiesSelect='SELECT id,display_name AS displayName,content,consent,published,version,updated_at AS updatedAt FROM success_stories';
 async function requireCurrentStories(rows:{id:string;version:number}[],publicList:boolean){
  const row=await db.prepare(`SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM json_each(?) captured WHERE NOT EXISTS(SELECT 1 FROM success_stories s WHERE s.id=json_extract(captured.value,'$.id') AND s.version=json_extract(captured.value,'$.version') AND s.consent=1 ${publicList?'AND s.published=1':''})) THEN 1 ELSE 0 END AS allowed`).bind(JSON.stringify(rows.map(({id,version})=>({id,version})))).first<{allowed:number}>();
  if(!row?.allowed)throw new TrainingError('הסיפורים או ההסכמה לפרסום השתנו בזמן הטעינה. רעננו לפני צפייה.',409);
 }
 return {
  async feedback(user:StaffIdentity,manage=false){if(manage)requireAdmin(user);return {items:(await db.prepare(`${feedbackSelect} ${manage?'':'WHERE owner_id=?'} ORDER BY created_at DESC LIMIT 200`).bind(...(manage?[]:[user.userId])).all<FeedbackItem>()).results};},
  async saveFeedback(user:StaffIdentity,input:unknown){const p=inputRecord(input),id=validId(p.id),stamp=new Date().toISOString();
   if(p.action==='review'){requireAdmin(user);if(!['new','reviewing','resolved'].includes(String(p.state)))throw new TrainingError('בחרו מצב תקין.');const row=await db.prepare('UPDATE trainee_feedback SET state=?,response=?,version=version+1,updated_at=? WHERE id=? AND version=? RETURNING id').bind(p.state,textField(p.response,'מענה',3000),stamp,id,integerField(p.version,'גרסה',1,1000000)).first();if(!row)throw new TrainingError('הפנייה עודכנה. רעננו לפני שמירה.',409);}
   else {
    const category=textField(p.category,'סוג פנייה',40,1);
    if(!['שיפור','לא ברור','בקשה להסבר','בעיה טכנית'].includes(category))throw new TrainingError('בחרו סוג פנייה.');
    const context=textField(p.context,'הקשר',200,1),content=textField(p.content,'משוב',3000,3);
    const saved=await db.prepare(`INSERT INTO trainee_feedback(id,owner_id,context,category,content,created_at,updated_at)
     SELECT ?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM trainee_feedback WHERE owner_id=? AND created_at>?)<20 ON CONFLICT(id) DO NOTHING RETURNING id`)
     .bind(id,user.userId,context,category,content,stamp,stamp,user.userId,new Date(Date.now()-3600000).toISOString()).first();
    if(!saved){
     const previous=await db.prepare('SELECT owner_id,context,category,content FROM trainee_feedback WHERE id=?').bind(id).first<{owner_id:string;context:string;category:string;content:string}>();
     if(previous){
      if(previous.owner_id!==user.userId)throw new TrainingError('הפנייה אינה זמינה לחשבון זה.',403);
      if(previous.context!==context||previous.category!==category||previous.content!==content)throw new TrainingError('מזהה הפנייה כבר משויך לפרטים אחרים.',409);
     }else throw new TrainingError('נשלחו פניות רבות. נסו שוב בהמשך.',429);
    }
   }
   return {ok:true};
  },
  async stories(user:StaffIdentity|null,mode='public'){
   if(mode==='public'){
    const rows=await db.prepare('SELECT id,display_name AS displayName,content,updated_at AS updatedAt,version FROM success_stories WHERE consent=1 AND published=1 ORDER BY updated_at DESC LIMIT 50').all<{id:string;displayName:string;content:string;updatedAt:string;version:number}>();
    await requireCurrentStories(rows.results,true);
    return {items:rows.results.map(({version,...story})=>story)};
   }
   if(!user)throw new TrainingError('יש להתחבר.',401);if(mode==='manage')requireAdmin(user);
   const rows=await db.prepare(`${storiesSelect} ${mode==='manage'?'WHERE consent=1':'WHERE owner_id=?'} ORDER BY updated_at DESC LIMIT 100`).bind(...(mode==='manage'?[]:[user.userId])).all<Story>();
   if(mode==='manage')await requireCurrentStories(rows.results,false);
   return {items:rows.results.map(r=>({...r,consent:!!r.consent,published:!!r.published}))};
  },
  async saveStory(user:StaffIdentity,input:unknown){const p=inputRecord(input),id=validId(p.id),version=integerField(p.version,'גרסה',0,1000000),stamp=new Date().toISOString();let result;
   if(p.action==='publish'){requireAdmin(user);if(typeof p.published!=='boolean')throw new TrainingError('מצב פרסום אינו תקין.');result=await db.prepare('UPDATE success_stories SET published=?,version=version+1,updated_at=? WHERE id=? AND version=? AND consent=1 RETURNING id').bind(p.published?1:0,stamp,id,version).first();}
   else if(p.action==='revoke'){result=await db.prepare('UPDATE success_stories SET consent=0,published=0,consent_at=NULL,version=version+1,updated_at=? WHERE id=? AND owner_id=? RETURNING id').bind(stamp,id,user.userId).first();}
   else {const name=textField(p.displayName,'שם להצגה',80,1),content=textField(p.content,'הסיפור שלך',4000,10),consent=p.consent===true;
    if(version===0)result=await db.prepare('INSERT INTO success_stories(id,owner_id,display_name,content,consent,consent_at,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT DO NOTHING RETURNING id').bind(id,user.userId,name,content,consent?1:0,consent?stamp:null,stamp).first();
    else result=await db.prepare('UPDATE success_stories SET display_name=?,content=?,consent=?,consent_at=?,published=0,version=version+1,updated_at=? WHERE id=? AND owner_id=? AND version=? RETURNING id').bind(name,content,consent?1:0,consent?stamp:null,stamp,id,user.userId,version).first();
   }
   if(!result)throw new TrainingError('הסיפור עודכן או שההסכמה אינה זמינה. רעננו לפני פעולה נוספת.',409);return {ok:true};
  }
 };
}
