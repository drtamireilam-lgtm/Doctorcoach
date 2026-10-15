import {getChatGPTUser} from '../../../chatgpt-auth';
import {getRawDb} from '../../../../db/raw';
import {careConfig} from '../../../../lib/care-server';
import {coachWorkspacesStore} from '../../../../lib/coach-workspaces';
import {apiError,readPayload} from '../../../../lib/api-helpers';
import {inputRecord,textField,validId} from '../../../../lib/care';
import {privateJson} from '../../../../lib/private-json';
export async function POST(request:Request){const u=await getChatGPTUser();if(!u)return privateJson({error:'יש להתחבר.'},{status:401});try{const p=inputRecord(await readPayload(request,64000));await coachWorkspacesStore(getRawDb(),careConfig()).assign(u,validId(p.workspaceId),textField(p.clientId,'מתאמן',200,1),p);return privateJson({ok:true});}catch(e){return apiError(e);}}
