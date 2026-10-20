import {getChatGPTUser} from '../../../chatgpt-auth';
import {serverCare} from '../../../../lib/care-server';
import {apiError,readPayload} from '../../../../lib/api-helpers';
import {inputRecord,textField} from '../../../../lib/care';
import {TrainingError} from '../../../../lib/training';
import {privateJson} from '../../../../lib/private-json';
const unauthorized=()=>privateJson({error:'יש להתחבר לחשבון הצוות.'},{status:401});
export async function GET(request:Request){const user=await getChatGPTUser();if(!user)return unauthorized();try{const store=serverCare();await store.requireStaff(user);const client=new URL(request.url).searchParams.get('client');if(client)return privateJson(await store.bundle(user,client));return privateJson(await store.teamOverview(user));}catch(e){return apiError(e);}}
export async function POST(request:Request){const user=await getChatGPTUser();if(!user)return unauthorized();try{const store=serverCare();await store.requireStaff(user);const p=inputRecord(await readPayload(request));if(p.action==='invite')return privateJson(await store.createInvite(user,p));if(p.action==='staff')return privateJson({staff:await store.saveStaff(user,p)});const client=textField(p.clientId,'מתאמן',200,1);switch(p.action){case 'note':await store.addNote(user,client,p);break;case 'assign':await store.assign(user,client,p);break;case 'reviewCheckin':await store.reviewCheckin(user,client,p);break;default:throw new TrainingError('פעולה לא מוכרת.');}return privateJson(await store.bundle(user,client));}catch(e){return apiError(e);}}
