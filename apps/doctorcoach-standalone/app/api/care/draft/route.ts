import {getChatGPTUser} from '../../../chatgpt-auth';
import {serverCare} from '../../../../lib/care-server';
import {getRawDb} from '../../../../db/raw';
import {coachDraftStore} from '../../../../lib/coach-drafts';
import {apiError,readPayload} from '../../../../lib/api-helpers';
import {inputRecord,textField} from '../../../../lib/care';
import {privateJson} from '../../../../lib/private-json';
export async function GET(request:Request){const user=await getChatGPTUser();if(!user)return privateJson({error:'יש להתחבר.'},{status:401});try{const client=textField(new URL(request.url).searchParams.get('client'),'מתאמן',200,1);return privateJson(await coachDraftStore(getRawDb(),serverCare()).get(user,client));}catch(e){return apiError(e);}}
export async function POST(request:Request){const user=await getChatGPTUser();if(!user)return privateJson({error:'יש להתחבר.'},{status:401});try{const p=inputRecord(await readPayload(request,64000));return privateJson(await coachDraftStore(getRawDb(),serverCare()).save(user,textField(p.clientId,'מתאמן',200,1),p));}catch(e){return apiError(e);}}
