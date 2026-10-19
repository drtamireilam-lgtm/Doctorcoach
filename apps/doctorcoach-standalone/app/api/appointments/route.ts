import {careConfig} from '../../../lib/care-server';
import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {appointmentsStore} from '../../../lib/appointments-store';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {inputRecord} from '../../../lib/care';
import {TrainingError} from '../../../lib/training';
import {privateJson} from '../../../lib/private-json';
import {serverCalendar} from '../../../lib/calendar-server';
export async function GET(request:Request){try{const user=await getChatGPTUser();if(!user)throw new TrainingError('יש להתחבר כדי לצפות בתורים.',401);const manage=new URL(request.url).searchParams.get('manage')==='1';const records=await appointmentsStore(getRawDb(),careConfig().adminEmails).list(user,manage);const statuses=manage?await serverCalendar().statuses(records.map(a=>a.id)):{};return privateJson({appointments:records.map(a=>({...a,...(manage?{calendarStatus:statuses[a.id]??'none'}:{})}))});}catch(e){return apiError(e);}}
export async function POST(request:Request){try{const user=await getChatGPTUser();if(!user)throw new TrainingError('יש להתחבר כדי לשלוח בקשה לתור.',401);const p=inputRecord(await readPayload(request));const store=appointmentsStore(getRawDb(),careConfig().adminEmails);const appointment=p.action==='create'?await store.create(user,p):await store.update(user,p);let calendarSync={status:'disabled'};if(appointment.provider==='tamir'&&['schedule','cancel'].includes(String(p.action))){try{calendarSync=await serverCalendar().sync(appointment.id);}catch{calendarSync={status:'error'};}}return privateJson({appointment,calendarSync});}catch(e){return apiError(e);}}
