import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {careConfig} from '../../../lib/care-server';
import {communicationStore} from '../../../lib/communication-store';
import type {Channel} from '../../../lib/messaging-store';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {privateJson} from '../../../lib/private-json';
import {inputRecord} from '../../../lib/care';
import {TrainingError} from '../../../lib/training';
export async function GET(request:Request){try{const u=await getChatGPTUser();if(!u)throw new TrainingError('יש להתחבר להודעות.',401);const s=communicationStore(getRawDb(),careConfig());const q=new URL(request.url).searchParams;return privateJson(q.has('client')?await s.list(u,q.get('client')!,q.get('channel') as Channel,q.get('q')??''):{threads:await s.threads(u)});}catch(e){return apiError(e);}}
export async function POST(request:Request){try{const u=await getChatGPTUser();if(!u)throw new TrainingError('יש להתחבר להודעות.',401);const s=communicationStore(getRawDb(),careConfig());const p=inputRecord(await readPayload(request));return privateJson(p.action==='read'?await s.read(u,p):p.action==='resolve'?await s.resolve(u,p):await s.send(u,p));}catch(e){return apiError(e);}}
