import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {careConfig} from '../../../lib/care-server';
import {communityStore} from '../../../lib/community-store';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {privateJson} from '../../../lib/private-json';
export async function GET(request:Request){const u=await getChatGPTUser();if(!u)return privateJson({error:'התחברו לשליחת משוב ומעקב אחר המענה.'},{status:401});try{return privateJson(await communityStore(getRawDb(),careConfig().adminEmails).feedback(u,new URL(request.url).searchParams.get('manage')==='1'));}catch(e){return apiError(e);}}
export async function POST(request:Request){const u=await getChatGPTUser();if(!u)return privateJson({error:'יש להתחבר לחשבון.'},{status:401});try{return privateJson(await communityStore(getRawDb(),careConfig().adminEmails).saveFeedback(u,await readPayload(request)));}catch(e){return apiError(e);}}
