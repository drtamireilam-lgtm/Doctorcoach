import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {appointmentsStore} from '../../../lib/appointments-store';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {inputRecord} from '../../../lib/care';
import {TrainingError} from '../../../lib/training';
import {privateJson} from '../../../lib/private-json';
import {serverCalendar} from '../../../lib/calendar-server';
const clinicalEmails=()=>[env.DOCTORCOACH_ADMIN_EMAILS,env.DOCTORCOACH_CLINICIAN_EMAILS].filter(Boolean).join(',');
const store=()=>appointmentsStore(getRawDb(),[clinicalEmails(),env.DOCTORCOACH_OPERATIONS_EMAILS].filter(Boolean).join(','),{clinicalEmails:clinicalEmails(),operationsEmails:env.DOCTORCOACH_OPERATIONS_EMAILS,rootAdminEmails:env.DOCTORCOACH_ADMIN_EMAILS??''});
export async function GET(request:Request){try{
 const user=await getChatGPTUser();if(!user)throw new TrainingError('יש להתחבר כדי לצפות בתורים.',401);
 const params=new URL(request.url).searchParams,manage=params.get('manage')==='1';
 const filters=manage?{view:params.get('view')??undefined,query:params.get('query')??undefined,dateFrom:params.get('from')??undefined,dateTo:params.get('to')??undefined,status:params.get('status')??undefined,offset:Number(params.get('offset')??0)}:{};
 const records=await store().list(user,manage,filters);
 const statuses=manage?await serverCalendar().statuses(records.map(a=>a.id)):{};
 return privateJson({pendingCount:manage?await store().pendingCount(user):undefined,
  canComplete:clinicalEmails().split(',').some(e=>e.trim().toLowerCase()===user.email.toLowerCase()),
  nextOffset:manage&&records.length===100?(filters.offset??0)+100:null,
  appointments:records.map(a=>({...a,...(manage?{calendarStatus:statuses[a.id]??'none'}:{})}))});
}catch(e){return apiError(e);}}
export async function POST(request:Request){try{
 const user=await getChatGPTUser();if(!user)throw new TrainingError('יש להתחבר כדי לשלוח בקשה לתור.',401);
 const p=inputRecord(await readPayload(request));
 const appointment=p.action==='create'?await store().create(user,p):await store().update(user,p);
 let calendarSync={status:'disabled'};
 if(appointment.provider==='tamir'&&['schedule','cancel'].includes(String(p.action))){
  try{calendarSync=await serverCalendar().sync(appointment.id);}catch{calendarSync={status:'error'};}
 }
 return privateJson({appointment,calendarSync});
}catch(e){return apiError(e);}}
