import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {getRawDb} from '../../../../db/raw';
import {careConfig} from '../../../../lib/care-server';
import {accountDeletionStore} from '../../../../lib/account-deletion';
import {apiError,readPayload} from '../../../../lib/api-helpers';
import {privateJson} from '../../../../lib/private-json';
import {TrainingError} from '../../../../lib/training';
import {deletionJournal} from '../../../../lib/deletion-journal';
function store(){return accountDeletionStore(getRawDb(),env.BUCKET??null,careConfig().adminEmails,env.DOCTORCOACH_ACCOUNT_DELETION_ENABLED==='true',deletionJournal(env.BUCKET??null));}
export async function GET(request:Request){try{const u=await getChatGPTUser();if(!u)throw new TrainingError('יש להתחבר.',401);return privateJson(await store().preview(u,new URL(request.url).searchParams.get('request')??''));}catch(e){return apiError(e);}}
export async function POST(request:Request){try{const u=await getChatGPTUser();if(!u)throw new TrainingError('יש להתחבר.',401);return privateJson(await store().execute(u,await readPayload(request)));}catch(e){return apiError(e);}}
