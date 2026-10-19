import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {careConfig} from '../../../lib/care-server';
import {importMappingsStore} from '../../../lib/import-mappings';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {privateJson} from '../../../lib/private-json';
export async function GET(){const user=await getChatGPTUser();if(!user)return privateJson({error:'יש להתחבר.'},{status:401});try{return privateJson({items:await importMappingsStore(getRawDb(),careConfig()).list(user)});}catch(e){return apiError(e);}}
export async function POST(request:Request){const user=await getChatGPTUser();if(!user)return privateJson({error:'יש להתחבר.'},{status:401});try{const store=importMappingsStore(getRawDb(),careConfig());await store.write(user,await readPayload(request));return privateJson({items:await store.list(user)});}catch(e){return apiError(e);}}
