import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {careConfig} from '../../../lib/care-server';
import {nutritionServicesStore} from '../../../lib/nutrition-services-store';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {privateJson} from '../../../lib/private-json';
const store=()=>nutritionServicesStore(getRawDb(),{...careConfig(),liorEmail:env.DOCTORCOACH_LIOR_EMAIL});
export async function GET(){try{return privateJson({services:await store().list(await getChatGPTUser())});}catch(e){return apiError(e);}}
export async function PUT(request:Request){try{return privateJson({service:await store().save(await getChatGPTUser(),await readPayload(request))});}catch(e){return apiError(e);}}
