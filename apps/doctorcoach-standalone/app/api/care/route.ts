import {getRawDb} from '../../../db/raw';
import {requireHealthConsent} from '../../../lib/consent-server';
import {getChatGPTUser} from '../../chatgpt-auth';
import {serverCare} from '../../../lib/care-server';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {inputRecord} from '../../../lib/care';
import {TrainingError} from '../../../lib/training';
import {privateJson} from '../../../lib/private-json';
const unauthorized=()=>privateJson({error:'יש להתחבר כדי לפתוח את התיק האישי.'},{status:401});
export async function GET(){const user=await getChatGPTUser();if(!user)return unauthorized();try{return privateJson(await serverCare().bundle(user,user.userId));}catch(e){return apiError(e);}}
export async function POST(request:Request){const user=await getChatGPTUser();if(!user)return unauthorized();try{const p=inputRecord(await readPayload(request));const store=serverCare();if(['profile','checkin','acceptInvite'].includes(String(p.action)))await requireHealthConsent(getRawDb(),user.userId);switch(p.action){case 'profile':return privateJson(await store.saveProfile(user,p));case 'previewInvite':{const invitation=await store.previewInvite(user,p);return privateJson({staff:invitation.staff,expiresAt:invitation.expiresAt});}case 'acceptInvite':return privateJson(await store.acceptInvite(user,p));case 'revoke':return privateJson(await store.revoke(user,p));case 'applyProgram':await store.applyProgram(user,p);break;case 'checkin':await store.checkin(user,p);break;default:throw new TrainingError('פעולה לא מוכרת.');}return privateJson(await store.bundle(user,user.userId));}catch(e){return apiError(e);}}
