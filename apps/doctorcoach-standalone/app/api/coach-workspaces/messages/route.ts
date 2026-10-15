import {getChatGPTUser} from '../../../chatgpt-auth';
import {getRawDb} from '../../../../db/raw';
import {workspaceChatStore} from '../../../../lib/workspace-chat';
import {apiError,readPayload} from '../../../../lib/api-helpers';
import {inputRecord} from '../../../../lib/care';
import {privateJson} from '../../../../lib/private-json';
export async function GET(request:Request){const u=await getChatGPTUser();if(!u)return privateJson({error:'יש להתחבר.'},{status:401});try{const q=new URL(request.url).searchParams;return privateJson(await workspaceChatStore(getRawDb()).load(u,q.get('workspace'),q.get('client'),q.get('before')));}catch(e){return apiError(e);}}
export async function POST(request:Request){const u=await getChatGPTUser();if(!u)return privateJson({error:'יש להתחבר.'},{status:401});try{const p=inputRecord(await readPayload(request)),s=workspaceChatStore(getRawDb());if(p.action==='send')return privateJson(await s.send(u,p));if(p.action==='read')return privateJson(await s.read(u,p));return privateJson({error:'פעולה לא מוכרת.'},{status:400});}catch(e){return apiError(e);}}
