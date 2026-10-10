import {getChatGPTUser} from '../../../chatgpt-auth';
import {getRawDb} from '../../../../db/raw';
import {careConfig} from '../../../../lib/care-server';
import {documentRetentionStore} from '../../../../lib/document-retention';
import {apiError,readPayload} from '../../../../lib/api-helpers';
import {privateJson} from '../../../../lib/private-json';
import {TrainingError} from '../../../../lib/training';
export async function GET(request:Request){try{const u=await getChatGPTUser();if(!u)throw new TrainingError('יש להתחבר.',401);return privateJson(await documentRetentionStore(getRawDb(),careConfig()).list(u,new URL(request.url).searchParams.get('manage')==='1'));}catch(e){return apiError(e);}}
export async function POST(request:Request){try{const u=await getChatGPTUser();if(!u)throw new TrainingError('יש להתחבר.',401);return privateJson(await documentRetentionStore(getRawDb(),careConfig()).change(u,await readPayload(request)));}catch(e){return apiError(e);}}
