import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {careConfig} from '../../../lib/care-server';
import {nutritionCredentialStore} from '../../../lib/nutrition-authority';
import {privateJson} from '../../../lib/private-json';
import {apiError,readPayload} from '../../../lib/api-helpers';
export async function GET(){try{return privateJson({credentials:await nutritionCredentialStore(getRawDb(),careConfig()).list(await getChatGPTUser())});}catch(e){return apiError(e);}}
export async function POST(request:Request){try{return privateJson(await nutritionCredentialStore(getRawDb(),careConfig()).save(await getChatGPTUser(),await readPayload(request)));}catch(e){return apiError(e);}}
