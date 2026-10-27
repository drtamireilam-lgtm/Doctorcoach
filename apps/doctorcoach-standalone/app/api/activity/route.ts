import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {activityStore} from '../../../lib/activity-store';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {privateJson} from '../../../lib/private-json';
export async function GET(request:Request){const user=await getChatGPTUser();if(!user)return privateJson({error:'יש להתחבר לחשבון.'},{status:401});try{return privateJson(await activityStore(getRawDb()).feed(user,new URL(request.url).searchParams.get('clientId')??user.userId));}catch(e){return apiError(e);}}
export async function POST(request:Request){const user=await getChatGPTUser();if(!user)return privateJson({error:'יש להתחבר לחשבון.'},{status:401});try{return privateJson(await activityStore(getRawDb()).mutate(user,await readPayload(request,64000)));}catch(e){return apiError(e);}}
