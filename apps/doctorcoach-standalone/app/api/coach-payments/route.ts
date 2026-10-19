import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {careConfig} from '../../../lib/care-server';
import {coachPaymentsStore} from '../../../lib/coach-payments';
import {privateJson} from '../../../lib/private-json';
import {apiError} from '../../../lib/api-helpers';
export async function GET(){const user=await getChatGPTUser();if(!user)return privateJson({error:'יש להתחבר.'},{status:401});try{return privateJson(await coachPaymentsStore(getRawDb(),careConfig()).overview(user));}catch(e){return apiError(e);}}
// No visitor endpoint can set a mandate, change an amount or mark a charge paid.
