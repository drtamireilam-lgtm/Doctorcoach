import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {careConfig} from '../../../lib/care-server';
import {programTemplateStore} from '../../../lib/program-template-store';
import {privateJson} from '../../../lib/private-json';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {inputRecord,textField} from '../../../lib/care';
export async function GET(request:Request){const u=await getChatGPTUser();if(!u)return privateJson({error:'יש להתחבר.'},{status:401});try{const q=new URL(request.url).searchParams;return privateJson({templates:await programTemplateStore(getRawDb(),careConfig()).list(u,{clientId:textField(q.get('client'),'מתאמן',200,1),workspaceId:q.get('workspace')??undefined})});}catch(e){return apiError(e);}}
export async function POST(request:Request){const u=await getChatGPTUser();if(!u)return privateJson({error:'יש להתחבר.'},{status:401});try{const p=inputRecord(await readPayload(request,64000));return privateJson(await programTemplateStore(getRawDb(),careConfig()).write(u,{clientId:textField(p.clientId,'מתאמן',200,1),workspaceId:p.workspaceId==null?undefined:textField(p.workspaceId,'סביבת מאמן',80,1)},p));}catch(e){return apiError(e);}}
