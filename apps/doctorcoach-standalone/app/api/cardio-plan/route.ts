import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {cardioWeeklyStore} from '../../../lib/cardio-weekly-store';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {privateJson} from '../../../lib/private-json';
export async function GET(request:Request){const user=await getChatGPTUser();if(!user)return privateJson({error:'יש להתחבר לחשבון.'},{status:401});try{const q=new URL(request.url).searchParams;return privateJson(await cardioWeeklyStore(getRawDb()).get(user,q.get('week')??undefined,q.get('clientId')??user.userId));}catch(e){return apiError(e);}}
export async function POST(request:Request){const user=await getChatGPTUser();if(!user)return privateJson({error:'יש להתחבר לחשבון.'},{status:401});try{return privateJson(await cardioWeeklyStore(getRawDb()).save(user,await readPayload(request,8000)));}catch(e){return apiError(e);}}
