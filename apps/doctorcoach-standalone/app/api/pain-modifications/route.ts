import {inputRecord} from '../../../lib/care';
import {getChatGPTUser} from '../../chatgpt-auth';
import {careConfig} from '../../../lib/care-server';
import {getRawDb} from '../../../db/raw';
import {painModificationStore} from '../../../lib/pain-modification-store';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {privateJson} from '../../../lib/private-json';
import {anatomy3dLabEnabled} from '../../../lib/anatomy-lab';
export async function GET(request:Request){if(!anatomy3dLabEnabled)return privateJson({error:'Not available'},{status:404});const user=await getChatGPTUser();if(!user)return privateJson({error:'Sign in required'},{status:401});try{const url=new URL(request.url),store=painModificationStore(getRawDb(),careConfig());return privateJson(url.searchParams.get('coaches')==='1'?await store.coaches(user):await store.list(user,url.searchParams.get('clientId')??user.userId));}catch(e){return apiError(e);}}
export async function POST(request:Request){if(!anatomy3dLabEnabled)return privateJson({error:'Not available'},{status:404});const user=await getChatGPTUser();if(!user)return privateJson({error:'Sign in required'},{status:401});try{const p=inputRecord(await readPayload(request)),store=painModificationStore(getRawDb(),careConfig());if(p.action!=='review'&&p.action!=='request')return privateJson({error:'Invalid action'},{status:400});return privateJson(p.action==='review'?await store.review(user,p):p.action==='request'?await store.request(user,p):{error:'Invalid action'});}catch(e){return apiError(e);}}

