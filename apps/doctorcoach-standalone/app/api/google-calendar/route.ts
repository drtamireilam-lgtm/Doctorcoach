import {getChatGPTUser} from '../../chatgpt-auth';
import {serverCalendar,calendarConfig} from '../../../lib/calendar-server';
import {CALENDAR_COOKIE,calendarSameOrigin,requireCalendarOwner} from '../../../lib/google-calendar';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {privateJson} from '../../../lib/private-json';
import {inputRecord} from '../../../lib/care';
import {TrainingError} from '../../../lib/training';
export async function GET(){try{return privateJson(await serverCalendar().status(await getChatGPTUser()));}catch(e){return apiError(e);}}
export async function POST(request:Request){try{calendarSameOrigin(request,calendarConfig());const user=await getChatGPTUser();requireCalendarOwner(user,calendarConfig());const p=inputRecord(await readPayload(request));const store=serverCalendar();
 if(p.action==='credentials'){if(p.clientId!==calendarConfig().clientId)throw new TrainingError('מזהה לקוח Google אינו תואם לחיבור.',400);await store.credentials(user,p.secret,p.revision);return privateJson({saved:true});}
 if(p.action==='connect'){const result=await store.begin(user);return privateJson({url:result.url},{headers:{'Set-Cookie':`${CALENDAR_COOKIE}=${result.state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`}});}
 if(p.action==='disconnect'){await store.disconnect(user);return privateJson({disconnected:true});}
 if(p.action==='retry'){const ids=await store.pendingIds();const results=[];for(const id of ids)results.push(await store.sync(id));return privateJson({results,remaining:(await store.status(user)).pending});}
 throw new TrainingError('פעולה לא מוכרת.');
}catch(e){return apiError(e);}}
