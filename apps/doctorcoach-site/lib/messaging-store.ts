import {careConnectionGuard,combineCareGuards} from './care-write-guard.ts';
import {healthConsentGuard,requireHealthConsent} from './consent-server.ts';
import {careStore} from './care-store.ts';
import type {CareConfig} from './care-store.ts';
import type {StaffIdentity} from './staff.ts';
import {isStaff} from './staff.ts';
import {inputRecord,textField,validId} from './care.ts';
import {TrainingError} from './training.ts';
import {channels} from './messaging.ts';
import type {Channel,Message,Thread} from './messaging.ts';
export type {Channel} from './messaging.ts';
const roles:Record<Channel,string>={medical:'clinician',training:'coach',nutrition:'dietitian',scheduling:'coordinator'};
const columns='id,client_id AS clientId,channel,author_id AS authorId,author_name AS authorName,author_role AS authorRole,content,created_at AS createdAt';
const now=()=>new Date().toISOString();
export function messagingStore(db:D1Database,config:CareConfig={}){
 const care=careStore(db,config);
 async function recipients(clientId:string,channel:Channel){const links=await db.prepare('SELECT staff_email,medical_access,nutrition_access,scope FROM care_connections WHERE client_id=? AND active=1').bind(clientId).all<{staff_email:string;medical_access:number;nutrition_access:number;scope:string}>();const results=await Promise.all(links.results.map(async l=>{const s=await care.staffFor(l.staff_email);return s&&s.role===roles[channel]&&l.scope===(channel==='scheduling'?'coordinator':'care')&&(channel!=='medical'||!!l.medical_access)&&(channel!=='nutrition'||!!l.nutrition_access)?s:null;}));return results.filter((s):s is NonNullable<typeof s>=>!!s);}
 async function authorize(user:StaffIdentity,clientId:string,channel:Channel){if(!(channel in channels))throw new TrainingError('ערוץ לא תקין.');const people=await recipients(clientId,channel);if(user.userId===clientId)return {self:true,staff:null,available:!!people.length};const s=await care.requireStaff(user);if(!people.some(p=>p.email===s.email))throw new TrainingError('אין הרשאה לשיחה זו.',403);return {self:false,staff:s,available:true};}
 async function threads(user:StaffIdentity){const staff=await care.staffFor(user.email);const people=staff?(await db.prepare('SELECT DISTINCT p.user_id AS clientId,p.name FROM care_profiles p JOIN care_connections c ON c.client_id=p.user_id WHERE c.staff_email=? AND c.active=1 ORDER BY p.name').bind(staff.email).all<{clientId:string;name:string}>()).results:[];const output:Thread[]=[];const own=await db.prepare('SELECT name FROM care_profiles WHERE user_id=?').bind(user.userId).first<{name:string}>();people.unshift({clientId:user.userId,name:own?.name??'השיחות שלי'});
 for(const person of people)for(const channel of Object.keys(channels) as Channel[]){
  let access;try{access=await authorize(user,person.clientId,channel);}catch{continue;}
  const guard=user.userId===person.clientId?{sql:'1=1',args:[]}:channelGuard(person.clientId,channel,user.email);
  const stats=await db.prepare(`SELECT MAX(created_at) AS latestAt,SUM(CASE WHEN author_id!=? AND rowid>COALESCE((SELECT CAST(read_through AS INTEGER) FROM message_reads WHERE user_id=? AND client_id=? AND channel=?),0) THEN 1 ELSE 0 END) AS unread FROM team_messages WHERE client_id=? AND channel=? AND ${guard.sql}`).bind(user.userId,user.userId,person.clientId,channel,person.clientId,channel,...guard.args).first<{latestAt:string|null;unread:number|null}>();
  output.push({...person,channel,available:access.available,latestAt:stats?.latestAt??null,unread:stats?.unread??0});
 }
 // Recheck all response permissions together after metadata assembly. An
 // explicit disabled staff record overrides the configured clinician fallback.
 const channelNames=Object.keys(channels) as Channel[];
 const ownGuards=channelNames.map(channel=>channelGuard(user.userId,channel));
 const snapshot=await db.prepare(`SELECT COALESCE((SELECT CASE WHEN active=1 THEN role ELSE '' END FROM care_staff WHERE email=?),?) AS role,COALESCE((SELECT json_group_array(json_object('id',client_id,'scope',scope,'medical',medical_access,'nutrition',nutrition_access)) FROM care_connections WHERE staff_email=? AND active=1),'[]') AS links,${ownGuards.map((guard,index)=>`CASE WHEN ${guard.sql} THEN 1 ELSE 0 END AS ${channelNames[index]}Available`).join(',')}`).bind(user.email.toLowerCase(),isStaff(user,config.clinicianEmails)?'clinician':'',user.email.toLowerCase(),...ownGuards.flatMap(guard=>guard.args)).first<{role:string;links:string;medicalAvailable:number;trainingAvailable:number;nutritionAvailable:number;schedulingAvailable:number}>();
 const links=JSON.parse(snapshot?.links??'[]') as {id:string;scope:string;medical:number;nutrition:number}[];
 for(const thread of output){
  if(thread.clientId===user.userId){thread.available=!!snapshot?.[`${thread.channel}Available`];continue;}
  if(snapshot?.role!==roles[thread.channel]||!links.some(link=>link.id===thread.clientId&&link.scope===(thread.channel==='scheduling'?'coordinator':'care')&&(thread.channel!=='medical'||!!link.medical)&&(thread.channel!=='nutrition'||!!link.nutrition)))throw new TrainingError('הרשאות השיחות השתנו. רעננו לפני צפייה.',403);
 }
 return output.sort((a,b)=>b.unread-a.unread||(b.latestAt??'').localeCompare(a.latestAt??''));}
 function channelGuard(clientId:string,channel:Channel,email?:string){return careConnectionGuard({clientId,...(email?{email}:{}),role:roles[channel],scope:channel==='scheduling'?'coordinator':'care',...(channel==='medical'?{grant:'medical_access' as const}:channel==='nutrition'?{grant:'nutrition_access' as const}:{})},config);}
 function writeGuard(user:StaffIdentity,clientId:string,channel:Channel){
  const connection=careConnectionGuard({clientId,...(user.userId===clientId?{}:{email:user.email}),role:roles[channel],scope:channel==='scheduling'?'coordinator':'care',...(channel==='medical'?{grant:'medical_access' as const}:channel==='nutrition'?{grant:'nutrition_access' as const}:{})},config);
  return channel==='scheduling'?connection:combineCareGuards(connection,healthConsentGuard(clientId));
 }
 async function requireCurrentGuard(guard:{sql:string;args:(string|number)[]}){
  const row=await db.prepare(`SELECT CASE WHEN ${guard.sql} THEN 1 ELSE 0 END AS allowed`).bind(...guard.args).first<{allowed:number}>();
  if(!row?.allowed)throw new TrainingError('הרשאות השיחה או ההסכמות השתנו. רעננו לפני שליחה.',403);
 }
 return {threads,authorize,
 async list(user:StaffIdentity,clientId:string,channel:Channel){
  const a=await authorize(user,clientId,channel);
  // Owners retain their own history after recipient revocation. Staff reads
  // require the current channel role, scope and medical/nutrition grant.
  const guard=user.userId===clientId?{sql:'1=1',args:[]}:careConnectionGuard({clientId,email:user.email,role:roles[channel],scope:channel==='scheduling'?'coordinator':'care',...(channel==='medical'?{grant:'medical_access' as const}:channel==='nutrition'?{grant:'nutrition_access' as const}:{})},config);
  const rows=await db.prepare(`SELECT ${columns} FROM (SELECT rowid AS sequence,* FROM team_messages WHERE client_id=? AND channel=? AND ${guard.sql} ORDER BY rowid DESC LIMIT 100) ORDER BY sequence`).bind(clientId,channel,...guard.args).all<Message>();
  await requireCurrentGuard(guard);
  return {messages:rows.results,available:a.available,selfId:user.userId};
 },
 async send(user:StaffIdentity,payload:unknown){const p=inputRecord(payload);const clientId=textField(p.clientId,'מתאמן',200,1);const channel=textField(p.channel,'ערוץ',30,1) as Channel;const a=await authorize(user,clientId,channel);if(!a.available)throw new TrainingError('טרם חובר איש צוות לערוץ זה. אפשר לפנות לתיאום דרך WhatsApp.',409);if(channel!=='scheduling')await requireHealthConsent(db,clientId);const guard=writeGuard(user,clientId,channel);const id=validId(p.id);const content=textField(p.content,'הודעה',3000,1);const existing=await db.prepare('SELECT author_id,client_id,channel,content FROM team_messages WHERE id=?').bind(id).first<{author_id:string;client_id:string;channel:string;content:string}>();if(existing){if(existing.author_id!==user.userId||existing.client_id!==clientId||existing.channel!==channel||existing.content!==content)throw new TrainingError('מזהה ההודעה כבר בשימוש.',409);await requireCurrentGuard(guard);return {ok:true};}const recent=await db.prepare('SELECT COUNT(*) AS count FROM team_messages WHERE author_id=? AND created_at>?').bind(user.userId,new Date(Date.now()-60000).toISOString()).first<{count:number}>();if((recent?.count??0)>=15)throw new TrainingError('נשלחו הודעות רבות. נסו שוב בעוד דקה.',429);const own=await db.prepare('SELECT name FROM care_profiles WHERE user_id=?').bind(user.userId).first<{name:string}>();const saved=await db.prepare(`INSERT INTO team_messages(id,client_id,channel,author_id,author_name,author_role,content,created_at) SELECT ?,?,?,?,?,?,?,? WHERE ${guard.sql} ON CONFLICT(id) DO NOTHING RETURNING id`).bind(id,clientId,channel,user.userId,a.staff?.name??own?.name??'מתאמן',a.staff?.role??'trainee',content,now(),...guard.args).first();if(!saved){await requireCurrentGuard(guard);const previous=await db.prepare('SELECT author_id,client_id,channel,content FROM team_messages WHERE id=?').bind(id).first<{author_id:string;client_id:string;channel:string;content:string}>();if(!previous||previous.author_id!==user.userId||previous.client_id!==clientId||previous.channel!==channel||previous.content!==content)throw new TrainingError('מזהה ההודעה כבר בשימוש.',409);}return {ok:true};},
 async read(user:StaffIdentity,payload:unknown){const p=inputRecord(payload);const clientId=textField(p.clientId,'מתאמן',200,1);const channel=textField(p.channel,'ערוץ',30,1) as Channel;await authorize(user,clientId,channel);const id=validId(p.messageId);const row=await db.prepare('SELECT rowid AS sequence FROM team_messages WHERE id=? AND client_id=? AND channel=?').bind(id,clientId,channel).first<{sequence:number}>();if(!row)throw new TrainingError('ההודעה אינה זמינה.',404);const guard=user.userId===clientId?{sql:'1=1',args:[]}:careConnectionGuard({clientId,email:user.email,role:roles[channel],scope:channel==='scheduling'?'coordinator':'care',...(channel==='medical'?{grant:'medical_access' as const}:channel==='nutrition'?{grant:'nutrition_access' as const}:{})},config);const saved=await db.prepare(`INSERT INTO message_reads(user_id,client_id,channel,read_through) SELECT ?,?,?,? WHERE ${guard.sql} ON CONFLICT(user_id,client_id,channel) DO UPDATE SET read_through=MAX(CAST(read_through AS INTEGER),CAST(excluded.read_through AS INTEGER)) RETURNING user_id`).bind(user.userId,clientId,channel,String(row.sequence),...guard.args).first();if(!saved)throw new TrainingError('אין עוד הרשאה לשיחה זו.',403);return {ok:true};},
 };
}
