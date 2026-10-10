import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {careConfig} from '../../../lib/care-server';
import {communityStore} from '../../../lib/community-store';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {privateJson} from '../../../lib/private-json';
export async function GET(request:Request){try{return privateJson(await communityStore(getRawDb(),careConfig().adminEmails).stories(await getChatGPTUser(),new URL(request.url).searchParams.get('mode')??'public'));}catch(e){return apiError(e);}}
export async function POST(request:Request){const u=await getChatGPTUser();if(!u)return privateJson({error:'יש להתחבר לחשבון.'},{status:401});try{return privateJson(await communityStore(getRawDb(),careConfig().adminEmails).saveStory(u,await readPayload(request)));}catch(e){return apiError(e);}}
