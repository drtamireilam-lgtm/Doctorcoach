import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {appointmentsStore} from '../../../lib/appointments-store';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {inputRecord} from '../../../lib/care';
import {TrainingError} from '../../../lib/training';
import {privateJson} from '../../../lib/private-json';
export async function GET(request:Request){try{const user=await getChatGPTUser();if(!user)throw new TrainingError('יש להתחבר כדי לצפות בתורים.',401);return privateJson({appointments:await appointmentsStore(getRawDb(),env.DOCTORCOACH_ADMIN_EMAILS).list(user,new URL(request.url).searchParams.get('manage')==='1')});}catch(e){return apiError(e);}}
export async function POST(request:Request){try{const user=await getChatGPTUser();if(!user)throw new TrainingError('יש להתחבר כדי לשלוח בקשה לתור.',401);const p=inputRecord(await readPayload(request));const store=appointmentsStore(getRawDb(),env.DOCTORCOACH_ADMIN_EMAILS);return privateJson({appointment:p.action==='create'?await store.create(user,p):await store.update(user,p)});}catch(e){return apiError(e);}}
