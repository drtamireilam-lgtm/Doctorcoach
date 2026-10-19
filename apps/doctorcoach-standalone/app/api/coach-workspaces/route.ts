import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {careConfig} from '../../../lib/care-server';
import {coachWorkspacesStore} from '../../../lib/coach-workspaces';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {inputRecord,textField,validId} from '../../../lib/care';
import {privateJson} from '../../../lib/private-json';
export async function GET(request:Request){const u=await getChatGPTUser();if(!u)return privateJson({error:'יש להתחבר.'},{status:401});try{const s=coachWorkspacesStore(getRawDb(),careConfig()),q=new URL(request.url).searchParams;if(q.has('client'))return privateJson(await s.bundle(u,validId(q.get('workspace')),textField(q.get('client'),'מתאמן',200,1)));return privateJson(await s.overview(u));}catch(e){return apiError(e);}}
export async function POST(request:Request){const u=await getChatGPTUser();if(!u)return privateJson({error:'יש להתחבר.'},{status:401});try{const p=inputRecord(await readPayload(request)),s=coachWorkspacesStore(getRawDb(),careConfig());if(p.action==='preview')return privateJson(await s.preview(u,p.code));if(p.action==='invite')return privateJson(await s.invite(u,p));switch(p.action){case 'profile':await s.saveProfile(u,p);break;case 'license':await s.license(u,p);break;case 'accept':await s.accept(u,p);break;case 'clientState':await s.clientState(u,p);break;case 'revoke':await s.revoke(u,p);break;case 'clientProfile':await s.updateClientProfile(u,p);break;default:return privateJson({error:'פעולה לא מוכרת.'},{status:400});}return privateJson(await s.overview(u));}catch(e){return apiError(e);}}
