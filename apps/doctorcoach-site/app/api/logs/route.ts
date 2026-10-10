import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {legacyLogsStore} from '../../../lib/legacy-logs-store';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {privateJson} from '../../../lib/private-json';
const unauthorized=()=>privateJson({error:'יש להתחבר כדי לשמור אימון.'},{status:401});
export async function GET(){const user=await getChatGPTUser();if(!user)return unauthorized();try{return privateJson({logs:await legacyLogsStore(getRawDb()).list(user.userId)});}catch(error){return apiError(error);}}
export async function POST(request:Request){const user=await getChatGPTUser();if(!user)return unauthorized();try{return privateJson({log:await legacyLogsStore(getRawDb()).save(user.userId,await readPayload(request))},{status:201});}catch(error){return apiError(error);}}
