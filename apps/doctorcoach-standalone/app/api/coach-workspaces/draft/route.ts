import {PROGRAM_PAYLOAD_LIMIT} from '../../../../lib/program-payload';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {getRawDb} from '../../../../db/raw';
import {careConfig} from '../../../../lib/care-server';
import {coachWorkspacesStore} from '../../../../lib/coach-workspaces';
import {apiError,readPayload} from '../../../../lib/api-helpers';
import {inputRecord,textField,validId} from '../../../../lib/care';
import {privateJson} from '../../../../lib/private-json';
export async function GET(request:Request){const u=await getChatGPTUser();if(!u)return privateJson({error:'יש להתחבר.'},{status:401});try{const q=new URL(request.url).searchParams;return privateJson(await coachWorkspacesStore(getRawDb(),careConfig()).draft(u,validId(q.get('workspace')),textField(q.get('client'),'מתאמן',200,1)));}catch(e){return apiError(e);}}
export async function POST(request:Request){const u=await getChatGPTUser();if(!u)return privateJson({error:'יש להתחבר.'},{status:401});try{const p=inputRecord(await readPayload(request,PROGRAM_PAYLOAD_LIMIT));return privateJson(await coachWorkspacesStore(getRawDb(),careConfig()).saveDraft(u,validId(p.workspaceId),textField(p.clientId,'מתאמן',200,1),p));}catch(e){return apiError(e);}}
