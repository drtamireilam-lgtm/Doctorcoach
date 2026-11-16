import {anatomy3dLabEnabled} from '../../../lib/anatomy-lab';
import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {anatomyPainStore} from '../../../lib/anatomy-pain-store';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {privateJson} from '../../../lib/private-json';
export async function GET(){if(!anatomy3dLabEnabled)return privateJson({error:'Not available'},{status:404});const user=await getChatGPTUser();if(!user)return privateJson({error:'יש להתחבר לחשבון.'},{status:401});try{return privateJson(await anatomyPainStore(getRawDb()).list(user));}catch(e){return apiError(e);}}
export async function POST(request:Request){if(!anatomy3dLabEnabled)return privateJson({error:'Not available'},{status:404});const user=await getChatGPTUser();if(!user)return privateJson({error:'יש להתחבר לחשבון.'},{status:401});try{return privateJson(await anatomyPainStore(getRawDb()).save(user,await readPayload(request)));}catch(e){return apiError(e);}}
