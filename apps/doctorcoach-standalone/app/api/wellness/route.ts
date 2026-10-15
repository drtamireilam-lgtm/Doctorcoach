import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {serverCare,careConfig} from '../../../lib/care-server';
import {wellnessStore} from '../../../lib/wellness-store';
import {inputRecord,textField} from '../../../lib/care';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {privateJson} from '../../../lib/private-json';
export async function GET(request:Request){const user=await getChatGPTUser();if(!user)return privateJson({error:'יש להתחבר לחשבון.'},{status:401});try{return privateJson(await wellnessStore(getRawDb(),careConfig()).bundle(user,new URL(request.url).searchParams.get('client')??user.userId));}catch(e){return apiError(e);}}
export async function POST(request:Request){const user=await getChatGPTUser();if(!user)return privateJson({error:'יש להתחבר לחשבון.'},{status:401});try{const p=inputRecord(await readPayload(request));const target=p.clientId?textField(p.clientId,'מתאמן',200,1):user.userId;await serverCare().authorize(user,target);return privateJson(await wellnessStore(getRawDb(),careConfig()).save(user,target,p));}catch(e){return apiError(e);}}
